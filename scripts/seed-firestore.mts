/**
 * The one-shot migration (issue #27): seed the Firestore that becomes the single
 * source of truth from every `.mdx` under `courses/<curso>/lessons/` in the repo.
 * Run once, against your own Firebase project, with the **read/write** account:
 *
 *   FIRESTORE_ADMIN_KEY=./secrets/admin-sa.json npm run seed:firestore
 *
 * For each Course it writes `courses/{course}` (name, human title from
 * MISSION.md, order) and one `courses/{course}/lessons/{slug}` per Lesson
 * (Frontmatter promoted to fields, body as the `mdx` text, `esbocos[]` from the
 * snapshot below). After this runs and is verified, the app reads Lessons only
 * from Firestore — the `.mdx` files stay in git as the pre-migration snapshot,
 * which is why this script keeps reading them (it is a migration tool, not an app
 * runtime path). Re-running fully overwrites every document it writes; it does
 * *not* delete docs whose `.mdx` was renamed or removed, so prune those by hand
 * if you re-seed after dropping a Lesson.
 *
 * The transform lives in the pure, tested `readSeedRecords` (Seam); this file is
 * the thin Firestore-writing adapter around it — the same split as the read-side
 * `firestore.ts` / `buildSiteModel`.
 */
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { readSeedRecords } from "../src/lib/seed-records.ts";

const COURSES_DIR = fileURLToPath(new URL("../courses", import.meta.url));

/**
 * A snapshot of the retired `src/sketches/registry.ts`: the Lesson→Esboço binding
 * as it stood at migration time, keyed by `"<course>/<slug>"`. The registry file
 * is removed in this same cutover, so the binding is inlined here — its final
 * home is the Lesson document's `esbocos[]`, which this seed populates. A name
 * still absent from the deployed Preact bundle degrades to the "em preparação"
 * fallback at render time, not to a broken page.
 */
const ESBOCOS_BY_LESSON: Record<string, string[]> = {
  "aws/0001-o-que-e-a-nuvem-e-por-que-importa": ["CapexOpex"],
  "aws/0002-modelos-de-servico-e-implantacao": ["ResponsibilitySpectrum"],
  "aws/0003-regioes-azs-e-edge-locations": ["RegionAzMap"],
  "aws/0005-auto-scaling-e-load-balancing": ["ScalingArchitecture"],
  "aws/0006-bonus-camadas-de-rede-l4-vs-l7": ["OsiStack"],
  "aws/0007-amazon-s3-object-storage": ["BucketObjectKey"],
  "claude/0001-agente-workflow-conversacional": ["AutonomySpectrum"],
  "claude/0002-padroes-de-workflow": ["PatternFlow"],
};

// Intentionally NOT shared with src/lib/firestore.ts: that adapter is the
// public read-only SSR surface and reads FIRESTORE_SA_KEY (viewer role); this
// seed needs write access and reads FIRESTORE_ADMIN_KEY (user role). Merging the
// two into one helper would risk handing the read-only path a writer credential
// — the exact role split ADR 0006 exists to keep. Keep them separate.
function db() {
  if (getApps().length === 0) {
    const keyPath = process.env.FIRESTORE_ADMIN_KEY;
    initializeApp({
      credential: keyPath ? cert(keyPath) : applicationDefault(),
    });
  }
  return getFirestore();
}

async function main() {
  const { courses, lessons } = readSeedRecords(COURSES_DIR, ESBOCOS_BY_LESSON);
  const firestore = db();

  for (const course of courses) {
    // Full overwrite (no merge), like the Lesson write below, so a re-seed
    // converges each Course doc to exactly what the reader produced. Setting the
    // document does not touch its `lessons` subcollection.
    await firestore
      .collection("courses")
      .doc(course.name)
      .set({ name: course.name, title: course.title, order: course.order });
  }

  for (const lesson of lessons) {
    const { course, slug, ...fields } = lesson;
    await firestore
      .collection("courses")
      .doc(course)
      .collection("lessons")
      .doc(slug)
      .set(fields);
  }

  console.log(
    `Seeded ${courses.length} course(s) and ${lessons.length} lesson(s) into Firestore.`,
  );
  for (const course of courses) {
    const count = lessons.filter((l) => l.course === course.name).length;
    console.log(`  - courses/${course.name} — "${course.title}" (${count} aula(s))`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
