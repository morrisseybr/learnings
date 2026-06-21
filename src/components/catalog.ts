import Callout from "./Callout.astro";
import MissionBox from "./MissionBox.astro";
import AskBox from "./AskBox.astro";
import Sources from "./Sources.astro";
import Kicker from "./Kicker.astro";
import Nav from "./Nav.astro";
import CompareCards from "./CompareCards.astro";
import Quiz from "./Quiz.astro";

/**
 * Render wiring for the Catalog — the `name → Component` map spread into the MDX
 * render so every Component is available globally, without an `import` in the
 * Aula. The Catalog's *definitions* (names, when-to-use, props) are the single
 * source of truth in `src/catalog.ts`; a test keeps this map's keys in lockstep
 * with them, so a Component can never be renderable but undocumented (or vice
 * versa).
 */
export const catalog = {
  Callout,
  MissionBox,
  AskBox,
  Sources,
  Kicker,
  Nav,
  CompareCards,
  Quiz,
};
