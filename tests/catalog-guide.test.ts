import { test, expect } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { renderCatalogGuide } from "../src/lib/catalog-guide";
import { catalogComponents } from "../src/catalog";
import { catalog } from "../src/components/catalog";

// Seam: the guide is a pure function of the Catalog's data — feed the
// definitions in, observe the Professor-facing Markdown out. We assert on what
// the Professor must be able to read (names, when-to-use, props), not on the
// exact layout of the document.
const guide = renderCatalogGuide(catalogComponents);

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

test("documents every prop's name, type and description", () => {
  for (const component of catalogComponents) {
    for (const prop of component.props) {
      expect(guide).toContain(prop.name);
      expect(guide).toContain(prop.description);
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
  // Callout's `variant` is `"info" | "warn" | "ok"`. An unescaped pipe inside a
  // table cell would split it into bogus columns; the generator must escape it.
  expect(guide).toContain("\\|");
});

test("the render Catalog and the guide source describe the same Components", () => {
  // The single-source-of-truth guarantee: a Component wired for rendering but
  // missing from the guide source (or vice-versa) is drift. Adding a Component —
  // or promoting an Esboço — must touch both, and this keeps them honest.
  expect(Object.keys(catalog).sort()).toEqual(
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
