import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { lessonFrontmatter, type LessonFrontmatter } from "./frontmatter.ts";

/**
 * The migration reader — the one-shot bridge that turns the repo's `.mdx`
 * Lessons into the Firestore documents that become the single source of truth
 * (issue #27). It is *not* an app runtime path: nothing the server renders reads
 * the filesystem. It exists only for the seed script, so a Lesson document
 * mirrors exactly what the `.mdx` held — Frontmatter as first-class fields, the
 * body as the `mdx` text, and the Esboço binding taken from a snapshot of the
 * retired `registry.ts` (ADR 0005's code-vs-data boundary: the binding now lives
 * on the Lesson).
 *
 * Kept as a pure function over a directory + the Esboço snapshot so the transform
 * is testable without a database. After migration the `.mdx` files stay in git as
 * the pre-migration snapshot, so this reader stays runnable.
 */

/** A Lesson document as it will be written to `courses/{course}/lessons/{slug}`. */
export interface SeedLesson extends LessonFrontmatter {
  /** Document id under the Course's `lessons` subcollection. */
  slug: string;
  /** Owning Course id (the parent `courses/{id}` doc). Path only, not stored. */
  course: string;
  /** The Lesson body — the MDX text compiled at render time. */
  mdx: string;
  /** Esboço names this Lesson references, from the `registry.ts` snapshot. */
  esbocos: string[];
}

/** A Course document as it will be written to `courses/{name}`. */
export interface SeedCourse {
  name: string;
  title: string;
  order: number;
}

export interface SeedRecords {
  courses: SeedCourse[];
  lessons: SeedLesson[];
}

/**
 * Read every migratable Lesson and Course under `coursesDir`. Only `.mdx` files
 * inside a `lessons/` folder count, so non-Lesson content (learning-records/,
 * reference/, .claude/) stays out. A Course with no `.mdx` Lesson is skipped —
 * an empty Course would never surface in the hub anyway. Frontmatter is
 * validated; an invalid Lesson throws, naming the file, so the migration fails
 * loudly instead of seeding a broken document.
 *
 * @param coursesDir absolute path to the repo's `courses/` directory
 * @param esbocosByLesson snapshot of `registry.ts`: `"<course>/<slug>" -> names`
 */
export function readSeedRecords(
  coursesDir: string,
  esbocosByLesson: Record<string, string[]>,
): SeedRecords {
  const courses: SeedCourse[] = [];
  const lessons: SeedLesson[] = [];

  const courseNames = fs
    .readdirSync(coursesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(compare);

  let order = 0;
  for (const name of courseNames) {
    const lessonsDir = path.join(coursesDir, name, "lessons");
    if (!isDirectory(lessonsDir)) continue;

    const files = fs
      .readdirSync(lessonsDir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith(".mdx"))
      .map((f) => f.name);
    if (files.length === 0) continue;

    for (const file of files) {
      lessons.push(readLesson(name, path.join(lessonsDir, file), file, esbocosByLesson));
    }

    // Order is a stable, name-sorted index: re-seeding is deterministic. The
    // reads sort Courses by name, so this field is metadata, not the sort key.
    courses.push({ name, title: courseTitle(coursesDir, name), order: order++ });
  }

  return { courses, lessons };
}

function readLesson(
  course: string,
  filePath: string,
  fileName: string,
  esbocosByLesson: Record<string, string[]>,
): SeedLesson {
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  const parsed = lessonFrontmatter.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid Frontmatter in ${course}/lessons/${fileName}:\n${formatIssues(parsed.error)}`,
    );
  }
  const slug = fileName.replace(/\.mdx$/, "");
  return {
    ...parsed.data,
    slug,
    course,
    mdx: content.trim(),
    esbocos: esbocosByLesson[`${course}/${slug}`] ?? [],
  };
}

function courseTitle(coursesDir: string, name: string): string {
  const missionPath = path.join(coursesDir, name, "MISSION.md");
  if (fs.existsSync(missionPath)) {
    const heading = fs.readFileSync(missionPath, "utf8").match(/^#\s+(.+?)\s*$/m);
    if (heading) return heading[1].replace(/^mission:\s*/i, "").trim();
  }
  return formatFolderName(name);
}

// Turn a folder slug into Title Case words: "machine-learning" -> "Machine Learning".
function formatFolderName(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

// Stable, locale-independent ordering so order is identical across platforms.
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isDirectory(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}
