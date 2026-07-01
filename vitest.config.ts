/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's Vite config so Vitest resolves the same module graph the app uses
// (aliases, `import.meta.env`, TypeScript), letting the seam tests exercise the
// real render, Catalog, and Esboço modules.
export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
