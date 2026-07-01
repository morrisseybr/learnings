import { test, expect } from "vitest";

import { renderAula } from "../src/lib/render-aula";
import { BucketObjectKey } from "../src/sketches/preact/BucketObjectKey";
import { PatternFlow } from "../src/sketches/preact/PatternFlow";

// Seam A (successor of render.test.ts): renderAula(mdx, options) → HTML. Fed a
// raw MDX string and a Lesson's Esboço binding, it compiles the MDX at runtime
// (`@mdx-js/mdx`) over the Preact runtime, resolves the Catalog by name, and
// returns semantic HTML. No browser, no Firestore, no server — the whole render
// contract, including the three per-block fallback cases, in isolation.

// --- Happy path: prose + Catalog Components -----------------------------------

test("renders plain Markdown to semantic HTML", async () => {
  const html = await renderAula("# Olá\n\nUm parágrafo com **negrito**.");

  expect(html).toMatch(/<h1[^>]*>Olá<\/h1>/);
  expect(html).toContain("<strong>negrito</strong>");
});

test("maps a Catalog Component name in the MDX to its implementation", async () => {
  const mdx = [
    "Antes do aviso.",
    "",
    '<Callout variant="warn">Cuidado com isto.</Callout>',
    "",
    "Depois do aviso.",
  ].join("\n");

  const html = await renderAula(mdx);

  // The Component rendered with its semantic output…
  expect(html).toContain('role="note"');
  expect(html).toContain('data-variant="warn"');
  expect(html).toContain("callout--warn");
  expect(html).toContain("Cuidado com isto.");
  // …embedded in the surrounding prose.
  expect(html).toContain("Antes do aviso.");
  expect(html).toContain("Depois do aviso.");
});

test("passes child Markdown through the Component", async () => {
  const html = await renderAula("<Callout>Uma nota com **ênfase**.</Callout>");

  expect(html).toContain('data-variant="info"');
  expect(html).toContain("<strong>ênfase</strong>");
});

test("renders an Aula that uses several Catalog Components at once", async () => {
  const mdx = [
    "## Seção",
    "",
    '<Callout variant="ok">Boa prática.</Callout>',
    "",
    "<CompareCards cards={[{ label: 'Bloco' }, { label: 'Objeto', highlight: true }]} />",
    "",
    "<Quiz questions={[{ prompt: 'P?', options: ['a', 'b'], answer: 1 }]} />",
    "",
    "<Sources items={[{ label: 'Fonte 1' }]} />",
    "",
    '<Nav next={{ href: "/b/", label: "Próxima" }} />',
  ].join("\n");

  const html = await renderAula(mdx);

  expect(html).toContain("callout--ok"); // Callout
  expect((html.match(/role="listitem"/g) ?? []).length).toBe(2); // CompareCards
  expect(html).toContain("data-quiz"); // Quiz
  expect(html).toContain('id="r1"'); // Sources derived id
  expect(html).toContain('rel="next"'); // Nav
  // No block degraded — a clean multi-Component render.
  expect(html).not.toContain("data-fallback");
});

// --- Fallback 1: unknown Component name ---------------------------------------

test("an unknown Component name degrades to a fallback, page intact", async () => {
  const mdx = [
    "Texto antes.",
    "",
    "<NaoExiste foo=\"bar\" />",
    "",
    "Texto depois.",
  ].join("\n");

  const html = await renderAula(mdx);

  expect(html).toContain('data-fallback="unknown"');
  expect(html).toContain('data-component="NaoExiste"');
  // The rest of the Lesson still renders.
  expect(html).toContain("Texto antes.");
  expect(html).toContain("Texto depois.");
});

// --- Fallback 2: Esboço declared but not deployed -----------------------------

test("a declared Esboço missing from the bundle degrades to 'em preparação'", async () => {
  const mdx = ["Antes.", "", "<BucketObjectKey />", "", "Depois."].join("\n");

  const html = await renderAula(mdx, {
    esbocos: ["BucketObjectKey"],
    sketches: {}, // not deployed yet
  });

  expect(html).toContain('data-fallback="sketch"');
  expect(html).toContain('data-component="BucketObjectKey"');
  expect(html).toContain("Antes.");
  expect(html).toContain("Depois.");
});

test("a declared Esboço present in the bundle renders for real", async () => {
  const mdx = "<BucketObjectKey />";

  const html = await renderAula(mdx, {
    esbocos: ["BucketObjectKey"],
    sketches: { BucketObjectKey },
  });

  expect(html).not.toContain("data-fallback");
  expect(html).toContain('class="bok"');
  expect(html).toContain("caravela-uploads-prod");
});

// --- Fallback 3: invalid props ------------------------------------------------

test("a Component with invalid props degrades to a fallback, rest legible", async () => {
  const mdx = [
    'Antes do bloco.',
    "",
    '<Callout variant="explodir">Texto.</Callout>',
    "",
    "Depois do bloco.",
  ].join("\n");

  const html = await renderAula(mdx);

  expect(html).toContain('data-fallback="invalid-props"');
  expect(html).toContain('data-component="Callout"');
  expect(html).toContain("Antes do bloco.");
  expect(html).toContain("Depois do bloco.");
});

test("invalid props degrade only that block — a sibling valid use still renders", async () => {
  const mdx = [
    '<Callout variant="explodir">Quebrado.</Callout>',
    "",
    '<Callout variant="ok">Íntegro.</Callout>',
  ].join("\n");

  const html = await renderAula(mdx);

  // Exactly one block degraded; the valid Callout rendered normally.
  expect((html.match(/data-fallback="invalid-props"/g) ?? []).length).toBe(1);
  expect(html).toContain("callout--ok");
  expect(html).toContain("Íntegro.");
});

test("a deployed Esboço that throws on bad props degrades to a fallback, page intact", async () => {
  // PatternFlow requires `stages`; referenced bare it would throw at render. The
  // Esboço carries no schema to validate against, so the render isolates it and
  // degrades just this block instead of crashing the whole page.
  const mdx = ["Antes.", "", "<PatternFlow />", "", "Depois."].join("\n");

  const html = await renderAula(mdx, {
    esbocos: ["PatternFlow"],
    sketches: { PatternFlow },
  });

  expect(html).toContain('data-fallback="invalid-props"');
  expect(html).toContain('data-component="PatternFlow"');
  expect(html).toContain("Antes.");
  expect(html).toContain("Depois.");
});

// --- Wide tables keep their horizontal scroll ---------------------------------

test("wraps Markdown tables in a horizontal-scroll container", async () => {
  const mdx = ["| Modelo | Dono |", "| --- | --- |", "| IaaS | Você |"].join("\n");

  const html = await renderAula(mdx);

  expect(html).toContain("table-scroll");
  expect(html).toContain("<table");
  // The wrapper sits around the table.
  expect(html).toMatch(/table-scroll[^>]*>\s*<table/);
});
