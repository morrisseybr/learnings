/**
 * Wrap every `<table>` in a `.table-scroll` container so wide comparison tables
 * scroll horizontally inside the Lesson card instead of overflowing it on mobile
 * (see LessonLayout's `.table-scroll` styles). A dependency-free hast walk so it
 * adds no npm dependency to the offline PWA.
 *
 * Single source for both render paths: the build-time `.astro`/`.mdx` pipeline
 * (astro.config.mjs) and the runtime MDX render (`renderAula`), so a table built
 * from Firestore scrolls exactly like one rendered at build time.
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export function rehypeTableScroll() {
  return (tree: HastNode) => {
    const wrap = (node: HastNode): void => {
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
