// Generates the Professor-facing Catalog guide from the single source of truth
// (src/catalog.ts). Run `npm run gen:guide` after adding a Component or promoting
// an Esboço; pass `--check` to fail (CI) when the committed guide is stale.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { renderCatalogGuide } from "../src/lib/catalog-guide.ts";
import { catalogComponents } from "../src/catalog.ts";

const OUTPUT = fileURLToPath(new URL("../docs/catalog-guide.md", import.meta.url));
const guide = renderCatalogGuide(catalogComponents);
const check = process.argv.includes("--check");

// Compare on content, not bytes, so a CRLF checkout (git autocrlf on Windows)
// doesn't read as stale.
const normalize = (text: string) => text.replace(/\r\n/g, "\n");

if (check) {
  const onDisk = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8") : "";
  if (normalize(onDisk) !== normalize(guide)) {
    console.error(
      "docs/catalog-guide.md is out of date with the Catalog. Run `npm run gen:guide`.",
    );
    process.exit(1);
  }
  console.log("docs/catalog-guide.md is up to date.");
} else {
  fs.writeFileSync(OUTPUT, guide);
  console.log(`Wrote docs/catalog-guide.md (${catalogComponents.length} Components).`);
}
