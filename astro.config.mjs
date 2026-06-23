// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// Wrap every Markdown/MDX `<table>` in a `.table-scroll` container so wide
// comparison tables scroll horizontally inside the Lesson card instead of
// overflowing it on mobile (see LessonLayout's `.table-scroll` styles).
// Dependency-free hast walk so it adds no npm dependency to the offline PWA.
function rehypeTableScroll() {
  return (tree) => {
    const wrap = (node) => {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "element" && child.tagName === "table") {
          node.children[i] = {
            type: "element",
            tagName: "div",
            properties: { className: ["table-scroll"] },
            children: [child],
          };
        }
        wrap(child);
      }
    };
    wrap(tree);
  };
}

// Static, build-time output: the Platform renders the Lessons once and ships
// plain files, preserving the lightweight, offline-friendly PWA.
//
// `site` + `base` target the project's GitHub Pages URL, which serves under the
// repo subpath (`/learnings/`). Every internal link and asset goes through
// `import.meta.env.BASE_URL`, so they all resolve under that prefix once built.
export default defineConfig({
  site: "https://morrisseybr.github.io",
  // Trailing slash kept so `import.meta.env.BASE_URL` joins cleanly with the
  // `${base}courses/...` links and PWA hrefs (it is used verbatim, not normalized).
  base: "/learnings/",
  output: "static",
  integrations: [mdx()],
  // `@astrojs/mdx` extends this Markdown config by default, so the table-scroll
  // wrapper applies to the `.mdx` Lessons too.
  markdown: {
    rehypePlugins: [rehypeTableScroll],
  },
});
