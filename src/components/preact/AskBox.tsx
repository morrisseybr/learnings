import { h, type ComponentChildren } from "preact";

// The AskBox, ported to Preact: the production task that closes a Lesson —
// "your turn to produce". 1:1 with the `.astro` original's dark box. Authored
// with `h()`; styles are global in src/styles/catalog.css.
interface Props {
  title?: string;
  children?: ComponentChildren;
}

export function AskBox({ title = "Sua vez de produzir", children }: Props) {
  return h(
    "section",
    { class: "ask", role: "note", "aria-label": title },
    h("h3", { class: "ask__title" }, `👩‍🏫 ${title}`),
    h("div", { class: "ask__body" }, children),
  );
}
