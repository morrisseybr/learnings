import { h } from "preact";

// CompareCards, ported to Preact: N options side by side, data-driven so it is
// never tied to one case. One card may be `highlight`ed (the recommended /
// in-focus option). 1:1 with the `.astro` original — same `role="list"`/
// `role="listitem"` semantics and `data-highlight` markers the Seam B test reads.
// Authored with `h()`; styles are global in src/styles/catalog.css.
export interface CompareCard {
  /** The option's name, e.g. "Objeto". */
  label: string;
  /** Optional eyebrow tag, e.g. "S3 · object". */
  tag?: string;
  /** Optional one-line description of the option. */
  description?: string;
  /** Marks this card as the highlighted / in-focus option. */
  highlight?: boolean;
}

interface Props {
  cards: CompareCard[];
}

export function CompareCards({ cards }: Props) {
  return h(
    "div",
    { class: "compare", role: "list" },
    cards.map((card) =>
      h(
        "div",
        {
          class: card.highlight
            ? "compare__card compare__card--highlight"
            : "compare__card",
          role: "listitem",
          "data-highlight": card.highlight ? "true" : "false",
        },
        card.tag ? h("div", { class: "compare__tag" }, card.tag) : null,
        h("div", { class: "compare__label" }, card.label),
        card.description
          ? h("div", { class: "compare__desc" }, card.description)
          : null,
      ),
    ),
  );
}
