import { h } from "preact";

// Esboço (aws/0001), ported to Preact: the CapEx → OpEx contrast. Two labeled
// cards, each with a lead and the bullets that justify it. Ships defaults so the
// Aula references it bare (`<CapexOpex />`). Semantic output is 1:1 with the
// `.astro` original — `data-sketch-card` / `data-highlight` markers the Seam B
// test reads. Authored with `h()`; styles are global in src/styles/sketches.css.
export interface SpendModel {
  /** Eyebrow tag, e.g. "🏢 Modelo antigo — CapEx". */
  tag: string;
  /** The model name, e.g. "CapEx". */
  title: string;
  /** One-line framing of the model. */
  lead: string;
  /** The bullets that characterize it. */
  points: string[];
  /** Marks the recommended / cloud model. */
  highlight?: boolean;
}

interface Props {
  models?: SpendModel[];
}

const DEFAULT_MODELS: SpendModel[] = [
  {
    tag: "🏢 Modelo antigo — CapEx",
    title: "CapEx",
    lead: "Você compra servidores antes de saber quanto vai usar. Gasto fixo e adiantado (Capital Expenditure).",
    points: [
      "Investimento alto na frente",
      "Adivinha a capacidade (erra para mais ou para menos)",
      "Semanas/meses para subir algo novo",
    ],
  },
  {
    tag: "☁️ Modelo da nuvem — OpEx",
    title: "OpEx",
    lead: "Você paga conforme usa. Gasto variável e operacional (Operational Expenditure).",
    points: [
      "Zero investimento adiantado",
      "Capacidade sob demanda (sobe e desce)",
      "Minutos para subir algo novo",
    ],
    highlight: true,
  },
];

export function CapexOpex({ models = DEFAULT_MODELS }: Props) {
  return h(
    "div",
    { class: "capex", role: "list" },
    models.map((m) =>
      h(
        "div",
        {
          class: m.highlight ? "capex__card capex__card--highlight" : "capex__card",
          role: "listitem",
          "data-sketch-card": true,
          "data-highlight": m.highlight ? "true" : "false",
        },
        h("div", { class: "capex__tag" }, m.tag),
        h("div", { class: "capex__title" }, m.title),
        h("p", { class: "capex__lead" }, m.lead),
        h(
          "ul",
          { class: "capex__points" },
          m.points.map((p) => h("li", null, p)),
        ),
      ),
    ),
  );
}
