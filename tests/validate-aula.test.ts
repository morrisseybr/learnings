import { test, expect } from "vitest";

import { validateAula, type Aula } from "../src/lib/validate-aula";

// Seam C — Validation. `validateAula` is fed an Aula (Frontmatter + MDX body +
// esbocos[]) and asserts the structured result against the taxonomy:
//   - Catalog Component referenced but nonexistent → error
//   - invalid props for a Catalog Component        → error
//   - invalid Frontmatter                          → error
//   - name in esbocos[] absent from the bundle     → warning (transient)
// Pure logic: no Firestore, no SSR, no browser.

const VALID_FRONTMATTER = {
  title: "Amazon S3",
  order: 7,
  domain: "Storage",
  summary: "Onde guardar objetos.",
  estMinutes: 8,
};

function aula(overrides: Partial<Aula>): Aula {
  return { frontmatter: VALID_FRONTMATTER, mdx: "", esbocos: [], ...overrides };
}

test("a well-formed Aula validates clean — no errors, no warnings", () => {
  const result = validateAula(
    aula({
      mdx: [
        "<MissionBox>Por que isto importa.</MissionBox>",
        "",
        '<Callout variant="warn">Cuidado com isto.</Callout>',
        "",
        '<CompareCards cards={[{ label: "A" }, { label: "B", highlight: true }]} />',
        "",
        '<Quiz questions={[{ prompt: "P?", options: ["a", "b"], answer: 1 }]} />',
        "",
        "<BucketObjectKey />",
      ].join("\n"),
      esbocos: ["BucketObjectKey"],
    }),
    { bundledSketches: ["BucketObjectKey"] },
  );

  expect(result.ok).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.warnings).toEqual([]);
});

test("lowercase intrinsic HTML elements are not mistaken for Components", () => {
  const result = validateAula(
    aula({ mdx: "<Callout>Veja <em>isto</em> e <a href='/'>aquilo</a>.</Callout>" }),
  );
  expect(result.ok).toBe(true);
  expect(result.issues).toEqual([]);
});

test("a Catalog Component referenced but nonexistent is an error", () => {
  const result = validateAula(aula({ mdx: "<Flarb>oi</Flarb>" }));

  expect(result.ok).toBe(false);
  expect(result.errors).toHaveLength(1);
  const [issue] = result.errors;
  expect(issue.code).toBe("unknown-component");
  expect(issue.subject).toBe("Flarb");
});

test("a Component used with an invalid prop value is an error", () => {
  // Callout's variant is the enum "info" | "warn" | "ok"; "purple" is invalid.
  const result = validateAula(aula({ mdx: '<Callout variant="purple">x</Callout>' }));

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "Callout")).toBe(
    true,
  );
});

test("a Component missing a required prop is an error", () => {
  // CompareCards requires `cards`.
  const result = validateAula(aula({ mdx: "<CompareCards />" }));

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "CompareCards")).toBe(
    true,
  );
});

test("an undeclared prop on a Component is an error (props are the single source)", () => {
  const result = validateAula(aula({ mdx: '<Callout colour="red">x</Callout>' }));

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "Callout")).toBe(
    true,
  );
});

test("a malformed item inside an array prop is an error", () => {
  // Each CompareCard requires `label`; the second card omits it.
  const result = validateAula(
    aula({ mdx: '<CompareCards cards={[{ label: "A" }, { highlight: true }]} />' }),
  );

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "CompareCards")).toBe(
    true,
  );
});

test("an Esboço declared in esbocos[] is not flagged as an unknown Component", () => {
  const result = validateAula(
    aula({ mdx: "<BucketObjectKey />", esbocos: ["BucketObjectKey"] }),
    { bundledSketches: ["BucketObjectKey"] },
  );

  expect(result.ok).toBe(true);
  expect(result.issues).toEqual([]);
});

test("a name in esbocos[] absent from the bundle is a warning, not an error", () => {
  const result = validateAula(
    aula({ mdx: "<NotYetDeployed />", esbocos: ["NotYetDeployed"] }),
    { bundledSketches: [] },
  );

  // Transient: the Esboço's code hasn't been deployed yet; the render falls back.
  expect(result.ok).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.warnings).toHaveLength(1);
  const [warning] = result.warnings;
  expect(warning.code).toBe("sketch-not-deployed");
  expect(warning.subject).toBe("NotYetDeployed");
});

test("a slot-named attribute is content, not a prop — MissionBox `meta` is accepted", () => {
  // `meta` is a MissionBox slot, not a prop in its schema. The validator must not
  // reject it (the render supports it), or write-time and render-time diverge.
  const result = validateAula(
    aula({ mdx: '<MissionBox meta="~6 min">Por que isto importa.</MissionBox>' }),
  );

  expect(result.ok).toBe(true);
  expect(result.issues).toEqual([]);
});

test("a Quiz answer index out of range is an error", () => {
  // `answer` is a 0-based index into `options`; 5 with two options is invalid.
  const result = validateAula(
    aula({ mdx: '<Quiz questions={[{ prompt: "P?", options: ["a", "b"], answer: 5 }]} />' }),
  );

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "Quiz")).toBe(true);
});

test("a typo'd key inside an array item is an error (nested shapes are strict too)", () => {
  // `higlight` is a typo of `highlight`; the card shape is strict.
  const result = validateAula(
    aula({ mdx: '<CompareCards cards={[{ label: "A", higlight: true }]} />' }),
  );

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props" && i.subject === "CompareCards")).toBe(
    true,
  );
});

test("a malformed MDX body yields a structured error, never a thrown exception", () => {
  // An unterminated tag must not crash the validator — Seam C always returns a
  // result so the author can fix it in the loop.
  let result!: ReturnType<typeof validateAula>;
  expect(() => {
    result = validateAula(aula({ mdx: '<Callout variant=' }));
  }).not.toThrow();
  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-mdx")).toBe(true);
});

test("invalid Frontmatter is an error", () => {
  const result = validateAula(
    aula({ frontmatter: { ...VALID_FRONTMATTER, title: "", order: "seven" } }),
  );

  expect(result.ok).toBe(false);
  expect(result.errors.every((i) => i.code === "invalid-frontmatter")).toBe(true);
  expect(result.errors.length).toBeGreaterThanOrEqual(1);
});

test("a deployed Esboço used with any props is accepted (no schema to check against)", () => {
  // Esboços carry no Catalog schema, so their props are not validated here — only
  // their existence in the bundle matters.
  const result = validateAula(
    aula({ mdx: '<BucketObjectKey bucket="x" objects={[{ key: "a" }]} />', esbocos: ["BucketObjectKey"] }),
    { bundledSketches: ["BucketObjectKey"] },
  );

  expect(result.ok).toBe(true);
  expect(result.issues).toEqual([]);
});

test("errors and warnings can coexist; ok is false when any error is present", () => {
  const result = validateAula(
    aula({
      mdx: "<Flarb />\n\n<NotYet />",
      esbocos: ["NotYet"],
    }),
    { bundledSketches: [] },
  );

  expect(result.ok).toBe(false);
  expect(result.errors.some((i) => i.code === "unknown-component" && i.subject === "Flarb")).toBe(
    true,
  );
  expect(result.warnings.some((i) => i.code === "sketch-not-deployed" && i.subject === "NotYet")).toBe(
    true,
  );
  // issues is the union, errors first then warnings or in discovery order.
  expect(result.issues).toEqual([...result.errors, ...result.warnings]);
});
