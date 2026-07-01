import { h } from "preact";

// Nav, ported to Preact: previous / next links at the foot of a Lesson, so the
// Student moves along the trail without returning to the index. Both ends are
// optional — the first Lesson has no `prev`, the last no `next`. Each link
// carries its semantic `rel` so the relationship lives in the markup. 1:1 with
// the `.astro` original. Authored with `h()`; styles are global in catalog.css.
export interface NavLink {
  href: string;
  label: string;
  /** Optional caption shown under the label. */
  sub?: string;
}

interface Props {
  prev?: NavLink;
  next?: NavLink;
}

function link(side: NavLink, dir: "prev" | "next") {
  const label = dir === "prev" ? `⬅️ ${side.label}` : `${side.label} ➡️`;
  return h(
    "a",
    {
      class: dir === "next" ? "nav__link nav__link--next" : "nav__link",
      href: side.href,
      rel: dir,
      "data-rel": dir,
    },
    h("b", null, label),
    side.sub ? h("small", null, side.sub) : null,
  );
}

export function Nav({ prev, next }: Props) {
  return h(
    "nav",
    { class: "nav", "aria-label": "Navegação entre Aulas" },
    prev ? link(prev, "prev") : null,
    next ? link(next, "next") : null,
  );
}
