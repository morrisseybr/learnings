import { h, type ComponentChildren } from "preact";

// The MissionBox, ported to Preact so it is reachable by name from runtime MDX.
// 1:1 with the `.astro` original: the 🎯 heading, the body, and an optional meta
// line (duration / prerequisite). Astro's named `meta` slot has no equivalent in
// runtime MDX, so it becomes an optional `meta` prop — the Professor writes
// `<MissionBox meta="~6 min">…</MissionBox>`. Authored with `h()` so it needs no
// JSX transform (the repo's tsconfig targets Astro's JSX, not Preact's). Styles
// are global in src/styles/catalog.css.
interface Props {
  title?: string;
  /** Optional metadata line (duration, prerequisite); omitted when absent. */
  meta?: ComponentChildren;
  children?: ComponentChildren;
}

export function MissionBox({ title = "Por que esta Aula?", meta, children }: Props) {
  return h(
    "aside",
    { class: "mission", role: "note", "aria-label": title },
    h("p", { class: "mission__title" }, "🎯 ", h("strong", null, title)),
    h("div", { class: "mission__body" }, children),
    meta != null && meta !== false
      ? h("p", { class: "mission__meta" }, meta)
      : null,
  );
}
