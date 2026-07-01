import { compile, run } from "@mdx-js/mdx";
import type { MDXComponents } from "mdx/types";
import { h, type ComponentType } from "preact";
import { renderToString } from "preact-render-to-string";
import * as runtime from "preact/jsx-runtime";
import remarkGfm from "remark-gfm";
import type { z } from "zod";

import { catalogComponents } from "../catalog";
import { preactCatalog } from "../components/preact/catalog";
import { rehypeTableScroll } from "./rehype-table-scroll";
import { referencedComponentNames } from "./validate-aula";

/**
 * The render module — a thin layer over the official MDX engine
 * (`@mdx-js/mdx`), the same one `next-mdx-remote` wraps. It is *not* the
 * build-time `@astrojs/mdx`: it compiles a raw MDX string in runtime and runs
 * it against the **Preact** JSX runtime, so a Lesson stored as text in the
 * database becomes HTML on each request (ADR 0005).
 *
 * Components resolve by name through a map this module builds (the Preact Catalog
 * plus the Lesson's deployed Esboços); nothing is imported by the content. The
 * map *is* the per-block fallback decider, wired from the same taxonomy
 * `validateAula` enforces (Seam C): each block that can't render — an unknown
 * Component, an Esboço declared but not yet deployed, or a Component with invalid
 * props — degrades to a clear fallback *in place*, so the rest of the Lesson
 * stays legible. The decision uses the same Catalog schemas and the same MDX
 * usage parse as the validator, so render-time fallback and write-time validation
 * never diverge. Unlike the validator (static, blocks the MCP write), the render
 * validates each instance's *concrete* props at runtime, so the fallback is truly
 * per-block.
 */

export interface RenderOptions {
  /** Esboço names this Lesson declares (the document's `esbocos[]`). */
  esbocos?: string[];
  /** Deployed Esboço implementations, keyed by the name the MDX references. */
  sketches?: Record<string, ComponentType<any>>;
}

export async function renderAula(mdx: string, options: RenderOptions = {}): Promise<string> {
  const { esbocos = [], sketches = {} } = options;

  // `function-body` output is what `run` consumes: compiled JS that closes over
  // the runtime we hand it, rather than a self-importing ES module. `remark-gfm`
  // gives the runtime render the same GitHub-flavored Markdown (notably tables)
  // the build-time Astro pipeline enables; the table-scroll rehype then wraps wide
  // tables exactly as that pipeline does, so a table from Firestore scrolls too.
  const compiled = String(
    await compile(mdx, {
      outputFormat: "function-body",
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeTableScroll],
    }),
  );

  // `run` is the official "execute compiled MDX" entry point. We feed it the
  // Preact runtime so every JSX node the MDX produces is a Preact element.
  const { default: Content } = await run(compiled, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    baseUrl: import.meta.url,
  });

  const components = buildComponentMap(mdx, esbocos, sketches);
  return renderToString(h(Content, { components: components as MDXComponents }));
}

// --- The component map: where the per-block fallback is decided ---------------

/**
 * Builds the name→Component map handed to the MDX runtime. Every capitalized name
 * the body references must be present, or the MDX runtime throws page-wide
 * (`Expected component … to be defined`); so the three fallback variants are
 * concrete entries, not a catch-all. Resolution order mirrors the validator's
 * taxonomy: a Catalog name is always the Catalog (props checked per-instance); a
 * declared Esboço is the real one if deployed, else "em preparação"; anything
 * else referenced is unknown.
 */
function buildComponentMap(
  mdx: string,
  esbocos: string[],
  sketches: Record<string, ComponentType<any>>,
): Record<string, ComponentType<any>> {
  const map: Record<string, ComponentType<any>> = {};

  // Catalog Components: a wrapper that validates this instance's props against
  // the single-source schema and degrades just this block when they're invalid.
  for (const def of catalogComponents) {
    const component = preactCatalog[def.name];
    if (!component) continue; // lockstep test guarantees this never happens
    map[def.name] = makeCatalogBlock(component, def);
  }

  // Declared Esboços: the real implementation if its code is deployed (wrapped so
  // a render throw degrades just this block), else the transient "em preparação"
  // fallback (a warning in the validator's taxonomy).
  for (const name of esbocos) {
    if (map[name]) continue; // a Catalog name is never an Esboço
    const sketch = sketches[name];
    map[name] = sketch
      ? makeSketchBlock(sketch, name)
      : makeFallback(
          "sketch",
          name,
          `O Esboço «${name}» ainda não foi publicado — aparecerá após o próximo deploy. O resto da Aula segue normal.`,
        );
  }

  // Anything else the body references is an unknown Component (a hard error in
  // the validator); show a clear fallback rather than letting it crash the page.
  for (const name of referencedComponentNames(mdx)) {
    if (map[name]) continue;
    map[name] = makeFallback(
      "unknown",
      name,
      `O componente «${name}» não existe no Catálogo nem foi declarado em esbocos[].`,
    );
  }

  return map;
}

/**
 * Wraps a Catalog Component so it validates its own props at render time. The
 * children and named-slot props are content, not validatable props, so they're
 * stripped before the schema check (the Catalog models props with Zod, slots in
 * prose). Invalid props degrade just this block; valid props pass straight
 * through to the real Component.
 */
function makeCatalogBlock(
  component: ComponentType<any>,
  def: { name: string; props: z.ZodObject; slots: { name: string }[] },
): ComponentType<Record<string, unknown>> {
  const slotNames = new Set(def.slots.map((slot) => slot.name));
  return function CatalogBlock(props: Record<string, unknown>) {
    const toValidate: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "children" || slotNames.has(key)) continue;
      toValidate[key] = value;
    }
    const parsed = def.props.safeParse(toValidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? issue.path.join(".") : "(raiz)";
      const detail = `O componente «${def.name}» recebeu props inválidas${
        issue ? `: ${where} — ${issue.message}` : "."
      }`;
      return h(Fallback, { variant: "invalid-props", name: def.name, detail });
    }
    return h(component, props);
  };
}

function makeFallback(
  variant: FallbackVariant,
  name: string,
  detail: string,
): ComponentType<Record<string, unknown>> {
  return function FallbackBlock() {
    return h(Fallback, { variant, name, detail });
  };
}

/**
 * Wraps a deployed Esboço so a render-time throw degrades just its block instead
 * of crashing the page. Esboços carry no Catalog schema, so — unlike Catalog
 * Components — their props can't be validated before render; rendering each in
 * isolation (`preact-render-to-string` is re-entrant) and catching a throw is the
 * per-block guard that keeps the rest of the Lesson legible when an Esboço is
 * referenced with malformed props. The isolated HTML is escaped within that
 * render, so injecting it verbatim is safe.
 */
function makeSketchBlock(
  component: ComponentType<any>,
  name: string,
): ComponentType<Record<string, unknown>> {
  return function SketchBlock(props: Record<string, unknown>) {
    try {
      const html = renderToString(h(component, props));
      return h("div", { dangerouslySetInnerHTML: { __html: html } });
    } catch (error) {
      return h(Fallback, {
        variant: "invalid-props",
        name,
        detail: `O Esboço «${name}» falhou ao renderizar — verifique as props passadas${
          error instanceof Error ? `: ${error.message}` : "."
        }`,
      });
    }
  };
}

// --- The fallback block itself ------------------------------------------------

type FallbackVariant = "unknown" | "sketch" | "invalid-props";

const FALLBACK_TITLE: Record<FallbackVariant, { icon: string; title: string }> = {
  unknown: { icon: "🚫", title: "Componente indisponível" },
  sketch: { icon: "🚧", title: "Esboço em preparação" },
  "invalid-props": { icon: "⚠️", title: "Bloco com dados inválidos" },
};

function Fallback({
  variant,
  name,
  detail,
}: {
  variant: FallbackVariant;
  name: string;
  detail: string;
}) {
  const meta = FALLBACK_TITLE[variant];
  return h(
    "aside",
    {
      class: `fallback fallback--${variant}`,
      role: "note",
      "data-fallback": variant,
      "data-component": name,
    },
    h("span", { class: "fallback__icon", "aria-hidden": "true" }, meta.icon),
    h(
      "div",
      { class: "fallback__body" },
      h("strong", { class: "fallback__title" }, meta.title),
      h("p", { class: "fallback__detail" }, detail),
    ),
  );
}
