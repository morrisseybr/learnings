import { h } from "preact";

// Esboço (claude/0001), ported to Preact: the autonomy spectrum — three columns
// (single call, workflow, agent), each labeled by *who controls the path*, over
// a gradient bar from fixed to emergent. Semantic output 1:1 with the `.astro`
// original — `data-stop` / `data-bar` markers the Seam B test reads. Authored
// with `h()`; styles in src/styles/sketches.css.
export interface AutonomyStop {
  /** Who controls the execution path, e.g. "O modelo controla". */
  who: string;
  /** The position's name, e.g. "Agente". */
  title: string;
  /** One-line description. */
  body: string;
}

interface Props {
  stops?: AutonomyStop[];
  /** Left/right captions under the gradient bar. */
  barLabels?: [string, string];
}

const DEFAULT_STOPS: AutonomyStop[] = [
  {
    who: "Você controla",
    title: "Chamada única",
    body: "Um prompt, uma resposta. Sem ferramentas, sem laço. Ex.: classificar um e-mail, resumir um texto.",
  },
  {
    who: "Código controla",
    title: "Workflow",
    body: "Vários passos LLM+tools, mas o caminho é fixo, escrito por você. Previsível e consistente. Ex.: extrair → validar → salvar.",
  },
  {
    who: "O modelo controla",
    title: "Agente",
    body: "O LLM decide os próximos passos com base no resultado de cada ação. Caminho emergente, não roteirizado.",
  },
];

export function AutonomySpectrum({
  stops = DEFAULT_STOPS,
  barLabels = ["caminho fixo / previsível", "caminho emergente / flexível"],
}: Props) {
  return h(
    "div",
    { class: "autonomy" },
    h(
      "div",
      { class: "autonomy__cols" },
      stops.map((stop) =>
        h(
          "div",
          { class: "autonomy__col", "data-stop": true },
          h("div", { class: "autonomy__who" }, stop.who),
          h("h4", { class: "autonomy__title" }, stop.title),
          h("p", { class: "autonomy__body" }, stop.body),
        ),
      ),
    ),
    h("div", { class: "autonomy__bar", "data-bar": true }),
    h(
      "div",
      { class: "autonomy__labels" },
      h("span", null, barLabels[0]),
      h("span", null, barLabels[1]),
    ),
  );
}
