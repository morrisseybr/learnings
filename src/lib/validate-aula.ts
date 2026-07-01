import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";

import { catalogComponents, catalogSchemas } from "../catalog";
import { lessonFrontmatter } from "./frontmatter";

/**
 * A Component's named slots, keyed by name. A slot is content (children / a named
 * region), not a prop, so a slot-named attribute must not be validated against the
 * props schema — the Catalog models props with Zod and slots in prose. The render
 * strips these before its own per-instance check (`makeCatalogBlock`), so writing
 * and rendering agree on what counts as a prop. Built from the single Catalog
 * source, so it can never drift from the schemas.
 */
const catalogSlots: Record<string, Set<string>> = Object.fromEntries(
  catalogComponents.map((component) => [
    component.name,
    new Set(component.slots.map((slot) => slot.name)),
  ]),
);

/**
 * Seam C — the single source of validation, shared by the MCP write (which
 * blocks on an error) and the render (which decides the per-block fallback).
 *
 * `validateAula` is fed an Aula — Frontmatter, the MDX body with its Component
 * usage, and the `esbocos[]` it declares — and returns a structured result.
 * Pure logic: it reads only the Catalog's Zod schemas and the Frontmatter schema,
 * never Firestore nor the SSR. The taxonomy it enforces:
 *
 *   - invalid Frontmatter                              → error
 *   - a Catalog Component referenced but nonexistent   → error
 *   - invalid props for a Catalog Component            → error
 *   - a name in `esbocos[]` absent from the bundle     → warning (transient,
 *     covered by the render fallback until the Esboço's code is deployed)
 *
 * Esboços carry no Catalog schema, so their props are not validated here — only
 * their presence in the deployed bundle matters.
 */

export type IssueSeverity = "error" | "warning";

export type IssueCode =
  | "invalid-frontmatter"
  | "invalid-mdx"
  | "unknown-component"
  | "invalid-props"
  | "sketch-not-deployed";

export interface ValidationIssue {
  severity: IssueSeverity;
  code: IssueCode;
  /** The Component/Esboço name or Frontmatter field the issue concerns. */
  subject?: string;
  message: string;
}

export interface ValidationResult {
  /** True when there are no error-severity issues; warnings keep it true. */
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Errors then warnings — the full list in one place. */
  issues: ValidationIssue[];
}

export interface Aula {
  frontmatter: unknown;
  mdx: string;
  /** Esboço names this Aula references by name. */
  esbocos: string[];
}

export interface ValidateOptions {
  /** Esboço names available in the deployed/bundled component map. */
  bundledSketches?: Iterable<string>;
}

export function validateAula(aula: Aula, options: ValidateOptions = {}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Frontmatter — the first-class metadata that gates the Aula.
  const frontmatter = lessonFrontmatter.safeParse(aula.frontmatter);
  if (!frontmatter.success) {
    for (const issue of frontmatter.error.issues) {
      const field = issue.path.join(".");
      errors.push({
        severity: "error",
        code: "invalid-frontmatter",
        subject: field || undefined,
        message: field ? `${field}: ${issue.message}` : issue.message,
      });
    }
  }

  // 2. Component usage — every JSX Component the body references. A malformed
  // body (an unterminated tag, say) is something the author must fix, so a parse
  // failure becomes a structured error rather than a thrown exception — the whole
  // point of Seam C is to always return a result.
  const declaredEsbocos = new Set(aula.esbocos);
  let usages: ComponentUsage[];
  try {
    usages = collectComponentUsages(aula.mdx);
  } catch (error) {
    usages = [];
    errors.push({
      severity: "error",
      code: "invalid-mdx",
      message: `O corpo MDX não pôde ser lido: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
  for (const usage of usages) {
    const schema = catalogSchemas[usage.name];
    if (schema) {
      // Props with a non-static expression can't be evaluated here; the render's
      // per-block fallback covers them at runtime, so we don't flag a false error.
      if (usage.dynamic) continue;
      // Slot-named attributes are content, not props (e.g. MissionBox's `meta`);
      // drop them so a strict schema doesn't reject a valid slot, exactly as the
      // render does before its per-instance check.
      const slots = catalogSlots[usage.name];
      const props = slots
        ? Object.fromEntries(
            Object.entries(usage.props).filter(([key]) => !slots.has(key)),
          )
        : usage.props;
      const parsed = schema.safeParse(props);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const path = issue.path.join(".");
          errors.push({
            severity: "error",
            code: "invalid-props",
            subject: usage.name,
            message: `${usage.name}${path ? `.${path}` : ""}: ${issue.message}`,
          });
        }
      }
    } else if (!declaredEsbocos.has(usage.name)) {
      errors.push({
        severity: "error",
        code: "unknown-component",
        subject: usage.name,
        message: `Componente "${usage.name}" não existe no Catálogo nem está declarado em esbocos[].`,
      });
    }
    // else: a declared Esboço — no Catalog schema to validate against.
  }

  // 3. Esboço deployment — a declared Esboço missing from the bundle is transient.
  const bundled = new Set(options.bundledSketches ?? []);
  for (const name of aula.esbocos) {
    if (!bundled.has(name)) {
      warnings.push({
        severity: "warning",
        code: "sketch-not-deployed",
        subject: name,
        message: `Esboço "${name}" ainda não está no bundle empacotado; a Aula cai no fallback até o deploy.`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings, issues: [...errors, ...warnings] };
}

/**
 * The capitalized Component names a Lesson's MDX references, deduplicated. The
 * render reuses this so the per-block fallback is decided over exactly the names
 * the validator sees — one parse, one source of names. Returns an empty set when
 * the body can't be parsed (the render's compile step surfaces that separately).
 */
export function referencedComponentNames(mdx: string): Set<string> {
  try {
    return new Set(collectComponentUsages(mdx).map((usage) => usage.name));
  } catch {
    return new Set();
  }
}

// --- MDX → Component usages -------------------------------------------------

interface ComponentUsage {
  name: string;
  props: Record<string, unknown>;
  /** A prop used a non-static expression (or a spread), so props were not read. */
  dynamic: boolean;
}

interface MdNode {
  type: string;
  name?: string | null;
  attributes?: MdAttribute[];
  children?: MdNode[];
}

interface MdAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

/**
 * Parses the MDX body and collects every Component usage (name + statically
 * evaluated props). Lowercase names are intrinsic HTML elements (JSX convention)
 * and are skipped — only capitalized names are Component references.
 */
function collectComponentUsages(mdx: string): ComponentUsage[] {
  const tree = fromMarkdown(mdx, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
  const usages: ComponentUsage[] = [];
  walk(tree, usages);
  return usages;
}

function walk(node: unknown, out: ComponentUsage[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as MdNode;
  if (
    (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
    typeof n.name === "string" &&
    /^[A-Z]/.test(n.name)
  ) {
    out.push(readUsage(n.name, n.attributes ?? []));
  }
  for (const child of n.children ?? []) {
    walk(child, out);
  }
}

function readUsage(name: string, attributes: MdAttribute[]): ComponentUsage {
  const props: Record<string, unknown> = {};
  let dynamic = false;
  for (const attr of attributes) {
    if (attr.type === "mdxJsxExpressionAttribute" || typeof attr.name !== "string") {
      // `{...spread}` — props can't be read statically.
      dynamic = true;
      continue;
    }
    const value = attr.value;
    if (value === null || value === undefined) {
      // Boolean shorthand: `<X foo />`.
      props[attr.name] = true;
      continue;
    }
    if (typeof value === "string") {
      props[attr.name] = value;
      continue;
    }
    // An expression attribute: `<X foo={…} />`. Evaluate it if it's a static
    // literal; otherwise mark the whole usage dynamic and skip prop validation.
    try {
      props[attr.name] = evalAttributeExpression(value);
    } catch {
      dynamic = true;
    }
  }
  return { name, props, dynamic };
}

// --- Static literal evaluation over the attribute's estree ------------------
//
// MDX attaches an estree Program to each expression attribute. We evaluate only
// JSON-like literals — the shape the Professor authors — and throw on anything
// dynamic (identifiers, calls, member access), which the caller treats as
// "unanalyzable" rather than invalid. estree nodes are external/dynamic, so they
// are typed `any` here deliberately.

/* eslint-disable @typescript-eslint/no-explicit-any */
function evalAttributeExpression(value: unknown): unknown {
  const estree = (value as { data?: { estree?: any } }).data?.estree;
  const statement = estree?.body?.[0];
  if (!statement || statement.type !== "ExpressionStatement") {
    throw new Error("attribute is not a single expression");
  }
  return evalExpression(statement.expression);
}

function evalExpression(node: any): unknown {
  switch (node?.type) {
    case "Literal":
      // estree flags non-JSON literals — BigInt (`1n`) and RegExp (`/x/`) — with
      // these fields. They're not prop data the Professor writes, so treat them
      // as unanalyzable rather than handing a BigInt/RegExp to Zod.
      if (node.bigint !== undefined || node.regex !== undefined) {
        throw new Error("non-JSON literal");
      }
      return node.value;
    case "ArrayExpression":
      return node.elements.map((element: any) => {
        if (element === null || element.type === "SpreadElement") {
          throw new Error("non-literal array element");
        }
        return evalExpression(element);
      });
    case "ObjectExpression": {
      const object: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (property.type !== "Property" || property.computed) {
          throw new Error("non-literal object property");
        }
        const key =
          property.key.type === "Identifier"
            ? property.key.name
            : property.key.type === "Literal"
              ? String(property.key.value)
              : null;
        if (key === null) throw new Error("non-literal object key");
        object[key] = evalExpression(property.value);
      }
      return object;
    }
    case "UnaryExpression": {
      const argument = evalExpression(node.argument);
      // Only numeric unaries are literal data (`-1`, `+2`); coercing a non-number
      // would fabricate a NaN, so leave that to the dynamic path.
      if (typeof argument !== "number") throw new Error("unary on non-number");
      if (node.operator === "-") return -argument;
      if (node.operator === "+") return argument;
      throw new Error(`unsupported unary operator ${node.operator}`);
    }
    case "TemplateLiteral":
      if (node.expressions.length > 0) throw new Error("interpolated template literal");
      return node.quasis.map((quasi: any) => quasi.value.cooked).join("");
    case "Identifier":
      if (node.name === "undefined") return undefined;
      throw new Error(`identifier ${node.name}`);
    default:
      throw new Error(`unsupported expression ${node?.type}`);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
