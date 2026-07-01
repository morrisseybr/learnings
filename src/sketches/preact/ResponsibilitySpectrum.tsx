import { h } from "preact";

// Esboço (aws/0002), ported to Preact: the IaaS/PaaS/SaaS shared-responsibility
// spectrum. Each row is a model; the top `owned` layers are yours, the rest the
// provider's. Semantic output 1:1 with the `.astro` original — `data-spectrum-row`
// and `data-owner` markers the Seam B test counts. Authored with `h()`; styles
// are global in src/styles/sketches.css.
export interface SpectrumRow {
  /** Model name, e.g. "IaaS". */
  model: string;
  /** Expansion, e.g. "Infra como serviço". */
  sub: string;
  /** How many of the top layers the customer manages. */
  owned: number;
}

interface Props {
  /** Layer names, top (closest to the app) to bottom (data center). */
  layers?: string[];
  rows?: SpectrumRow[];
}

const DEFAULT_LAYERS = [
  "Aplicação",
  "Runtime / SO",
  "Rede / config",
  "Servidores físicos",
  "Data center",
];

const DEFAULT_ROWS: SpectrumRow[] = [
  { model: "IaaS", sub: "Infra como serviço", owned: 3 },
  { model: "PaaS", sub: "Plataforma como serviço", owned: 1 },
  { model: "SaaS", sub: "Software como serviço", owned: 0 },
];

export function ResponsibilitySpectrum({
  layers = DEFAULT_LAYERS,
  rows = DEFAULT_ROWS,
}: Props) {
  return h(
    "div",
    { class: "spectrum" },
    h(
      "div",
      { class: "spectrum__legend" },
      h("span", null, "◀ Mais controle e trabalho seu"),
      h("span", null, "Mais conveniência ▶"),
    ),
    rows.map((row) =>
      h(
        "div",
        { class: "spectrum__row", "data-spectrum-row": true },
        h(
          "div",
          { class: "spectrum__label" },
          row.model,
          h("small", null, row.sub),
        ),
        h(
          "div",
          { class: "spectrum__stack" },
          layers.map((layer, i) => {
            const owner = i < row.owned ? "you" : "aws";
            return h(
              "div",
              {
                class: `spectrum__seg spectrum__seg--${owner}`,
                "data-owner": owner,
              },
              layer,
              owner === "you" ? h("span", { class: "spectrum__tag" }, " (você)") : null,
            );
          }),
        ),
      ),
    ),
    h(
      "p",
      { class: "spectrum__caption" },
      "Laranja = ",
      h("b", null, "sua"),
      " responsabilidade · cinza = ",
      h("b", null, "AWS/fornecedor"),
      ". Quanto mais desce, menos você gerencia.",
    ),
  );
}
