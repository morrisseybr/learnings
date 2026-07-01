import { h } from "preact";

// Esboço (aws/0003), ported to Preact: the nested geography diagram — a Region
// box containing Availability Zones, each holding one or more data centers.
// Semantic output 1:1 with the `.astro` original — `data-az` / `data-dc` markers
// the Seam B test counts. Authored with `h()`; styles in src/styles/sketches.css.
export interface Az {
  /** AZ label, e.g. "AZ-a". */
  name: string;
  /** How many data centers the AZ holds. */
  dcs: number;
}

interface Props {
  region?: { code: string; label: string };
  azs?: Az[];
  note?: string;
}

const DEFAULT_REGION = { code: "sa-east-1", label: "São Paulo 🇧🇷" };
const DEFAULT_AZS: Az[] = [
  { name: "AZ-a", dcs: 2 },
  { name: "AZ-b", dcs: 1 },
  { name: "AZ-c", dcs: 2 },
];
const DEFAULT_NOTE =
  "Cada AZ = um ou mais data centers isolados (energia, refrigeração e rede próprios), mas conectados às outras AZs da região por links de baixa latência.";

export function RegionAzMap({
  region = DEFAULT_REGION,
  azs = DEFAULT_AZS,
  note = DEFAULT_NOTE,
}: Props) {
  return h(
    "div",
    { class: "geo" },
    h(
      "div",
      { class: "geo__head" },
      h("span", { class: "geo__badge" }, "REGIÃO"),
      h("code", { class: "geo__code" }, region.code),
      ` · ${region.label}`,
    ),
    h(
      "div",
      { class: "geo__azs" },
      azs.map((az) =>
        h(
          "div",
          { class: "geo__az", "data-az": true },
          h("div", { class: "geo__az-name" }, az.name),
          h(
            "div",
            { class: "geo__dcs" },
            Array.from({ length: az.dcs }).map(() =>
              h("span", { class: "geo__dc", "data-dc": true }, "DC"),
            ),
          ),
        ),
      ),
    ),
    h("p", { class: "geo__note" }, note),
  );
}
