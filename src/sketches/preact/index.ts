import type { ComponentType } from "preact";

import { CapexOpex } from "./CapexOpex";
import { ResponsibilitySpectrum } from "./ResponsibilitySpectrum";
import { RegionAzMap } from "./RegionAzMap";
import { ScalingArchitecture } from "./ScalingArchitecture";
import { OsiStack } from "./OsiStack";
import { AutonomySpectrum } from "./AutonomySpectrum";
import { PatternFlow } from "./PatternFlow";
import { BucketObjectKey } from "./BucketObjectKey";

/**
 * The bundled Esboço map — every Esboço whose code is deployed, keyed by the name
 * a Lesson references it by. This is the "deployed bundle" the per-block fallback
 * is decided against: a name a Lesson declares in `esbocos[]` that is *absent*
 * here has not been deployed yet, so the render shows the "em preparação"
 * fallback until a `git push` brings it (ADR 0005's code-vs-data boundary).
 *
 * Unlike the retired lessonId→sketch `registry.ts`, this map is flat: the binding
 * now lives in the Lesson document's `esbocos[]`, so the render merges only the
 * declared names into that Lesson's component map — never globally.
 */
export const bundledSketches: Record<string, ComponentType<any>> = {
  CapexOpex,
  ResponsibilitySpectrum,
  RegionAzMap,
  ScalingArchitecture,
  OsiStack,
  AutonomySpectrum,
  PatternFlow,
  BucketObjectKey,
};
