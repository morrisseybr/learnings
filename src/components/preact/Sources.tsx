import { h } from "preact";

// Sources, ported to Preact: the Lesson's footnotes with numbering *derived*
// from order — the `<ol>` numbers and the `r1`, `r2`… ids the prose links to come
// from the item index, never hand-typed. 1:1 with the `.astro` original.
// Authored with `h()`; styles are global in src/styles/catalog.css.
export interface Source {
  /** Visible text of the source, e.g. "AWS — O que é o Amazon S3". */
  label: string;
  /** Optional link target. */
  href?: string;
}

interface Props {
  items: Source[];
  title?: string;
}

export function Sources({ items, title = "Fontes" }: Props) {
  return h(
    "section",
    { class: "sources", "aria-label": title },
    h("h3", { class: "sources__title" }, title),
    h(
      "ol",
      { class: "sources__list" },
      items.map((source, i) =>
        h(
          "li",
          { id: `r${i + 1}`, class: "sources__item" },
          source.href
            ? h("a", { class: "ref", href: source.href }, source.label)
            : source.label,
        ),
      ),
    ),
  );
}
