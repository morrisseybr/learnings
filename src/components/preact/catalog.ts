import type { ComponentType } from "preact";

import { Callout } from "./Callout";
import { MissionBox } from "./MissionBox";
import { AskBox } from "./AskBox";
import { Sources } from "./Sources";
import { Nav } from "./Nav";
import { CompareCards } from "./CompareCards";
import { Quiz } from "./Quiz";

/**
 * The Preact render wiring for the Catalog — the `name → Component` map the
 * runtime MDX render (`renderAula`) resolves Component references through, so a
 * Lesson writes `<Callout>` with no import. This is the successor to the `.astro`
 * `src/components/catalog.ts` map: once the static route retires (a later slice
 * of PRD #21), this is the single render wiring.
 *
 * The Catalog's *definitions* (names, when-to-use, props schemas) remain the
 * single source of truth in `src/catalog.ts`; a lockstep test keeps this map's
 * keys identical to them, so a Component can never be renderable but undocumented
 * (or vice versa).
 */
export const preactCatalog: Record<string, ComponentType<any>> = {
  Callout,
  MissionBox,
  AskBox,
  Sources,
  Nav,
  CompareCards,
  Quiz,
};
