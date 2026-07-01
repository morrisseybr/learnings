// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

// SSR output: the Platform renders every Lesson per request, reading it from
// Firestore — the single source of truth since the cutover (#27). The Node
// adapter (standalone) is the server Firebase App Hosting runs, and what
// `astro build && node ./dist/server/entry.mjs` serves locally. Lessons are no
// longer `.mdx` files rendered at build time, so there is no `@astrojs/mdx`
// integration and no Content Collection here; the runtime render lives in
// `src/lib/render-aula.ts` (a thin layer over `@mdx-js/mdx`), which wraps wide
// tables with the shared `rehype-table-scroll` plugin itself.
//
// `site` + `base` are kept from the GitHub Pages era for now; the host swap
// lands in a later slice of the parent PRD.
export default defineConfig({
  site: "https://morrisseybr.github.io",
  // Trailing slash kept so `import.meta.env.BASE_URL` joins cleanly with the
  // `${base}courses/...` links and PWA hrefs (it is used verbatim, not normalized).
  base: "/learnings/",
  output: "server",
  adapter: node({ mode: "standalone" }),
});
