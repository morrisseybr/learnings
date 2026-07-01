import { test, expect } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { renderCatalogGuide } from "../src/lib/catalog-guide";
import { catalogComponents } from "../src/catalog";
import { catalog } from "../src/components/catalog";
import { preactCatalog } from "../src/components/preact/catalog";

// Seam: the guide is a pure function of the Catalog's data — feed the
// definitions in, observe the Professor-facing Markdown out. Each Component's
// props are read through the same lens the generator uses (the Zod schema's
// JSON-Schema input view), so the test's source of truth is the schema, not a
// parallel hand-written prop list.
const guide = renderCatalogGuide(catalogComponents);

// Read each Component's props as the generator does (input view, so a prop with a
// default reads as optional and carries its default).
function propsOf(schema: z.ZodObject) {
  const json = z.toJSONSchema(schema, { io: "input" }) as {
    properties?: Record<string, { description?: string }>;
  };
  return Object.entries(json.properties ?? {});
}

test("lists every Catalog Component under its own heading", () => {
  for (const component of catalogComponents) {
    expect(guide).toContain(`## ${component.name}`);
  }
});

test("carries each Component's when-to-use prose", () => {
  for (const component of catalogComponents) {
    expect(guide).toContain(component.whenToUse);
  }
});

test("documents every prop's name and describe() prose from the schema", () => {
  for (const component of catalogComponents) {
    for (const [name, node] of propsOf(component.props)) {
      expect(guide).toContain(`\`${name}\``);
      expect(node.description).toBeTruthy();
      expect(guide).toContain(node.description!);
    }
  }
});

test("documents every slot a Component accepts", () => {
  for (const component of catalogComponents) {
    for (const slot of component.slots) {
      expect(guide).toContain(slot.description);
    }
  }
});

test("escapes union-type pipes so the prop table stays valid Markdown", () => {
  // Callout's `variant` is the enum `"info" | "warn" | "ok"`. An unescaped pipe
  // inside a table cell would split it into bogus columns; the generator escapes
  // it.
  expect(guide).toContain("\\|");
  expect(guide).not.toMatch(/\| "info" \| "warn"/); // pipes escaped, not raw
});

test("the render Catalog and the guide source describe the same Components", () => {
  // The single-source-of-truth guarantee: a Component wired for rendering but
  // missing from the guide source (or vice-versa) is drift. Adding a Component —
  // or promoting an Esboço — must touch both, and this keeps them honest.
  expect(Object.keys(catalog).sort()).toEqual(
    catalogComponents.map((component) => component.name).sort(),
  );
});

test("the Preact render wiring stays in lockstep with the Catalog source", () => {
  // The runtime MDX render (`renderAula`) resolves Components through the Preact
  // map; a name renderable there but undocumented (or vice-versa) is the same
  // drift, caught for the path that now serves Lessons from the database.
  expect(Object.keys(preactCatalog).sort()).toEqual(
    catalogComponents.map((component) => component.name).sort(),
  );
});

test("the checked-in guide is up to date with the Catalog", () => {
  // The guide is generated, never hand-maintained. The committed file must be
  // exactly what the generator produces, so it can never silently diverge.
  const file = fileURLToPath(new URL("../docs/catalog-guide.md", import.meta.url));
  const onDisk = fs.readFileSync(file, "utf8");
  // Compare on content, not bytes: git's autocrlf may check the file out with
  // CRLF on Windows while the generator emits LF.
  const normalize = (text: string) => text.replace(/\r\n/g, "\n");
  expect(normalize(onDisk)).toBe(normalize(guide));
});
