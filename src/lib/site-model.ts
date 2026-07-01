import type { LessonFrontmatter } from "./frontmatter";

export interface Lesson extends LessonFrontmatter {
  /** Document id under the Course's `lessons` subcollection, e.g. "0001-intro". */
  slug: string;
  /** Owning Course id, e.g. "aws". */
  course: string;
}

/**
 * A Course as fetched from the store: just its id and the human `title` field
 * of the `courses/{id}` document (ADR 0005). The Lessons are supplied
 * separately and joined here by `name`.
 */
export interface CourseRecord {
  name: string;
  title: string;
}

export interface Course {
  name: string;
  title: string;
  lessonCount: number;
  lessons: Lesson[];
}

export interface SiteModel {
  courses: Course[];
}

/**
 * The navigation model as a pure function over records already fetched from the
 * store — the seam (Seam D) the Firestore adapter and the transitional
 * filesystem adapter both feed (issue #25). It does no I/O: it groups Lessons
 * under their Course, orders Courses by name and Lessons by `order` (slug as a
 * stable tiebreak), and drops Courses with no Lessons.
 *
 * A Lesson whose `course` has no matching record is ignored: the Course list is
 * the source of truth for what the hub shows. The `title` comes straight from
 * the Course record — no MISSION.md, no folder-name inference.
 */
export function buildSiteModel(
  courses: CourseRecord[],
  lessons: Lesson[],
): SiteModel {
  const byCourse = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const list = byCourse.get(lesson.course);
    if (list) list.push(lesson);
    else byCourse.set(lesson.course, [lesson]);
  }

  const model: Course[] = [];
  for (const course of [...courses].sort((a, b) => compare(a.name, b.name))) {
    const courseLessons = (byCourse.get(course.name) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order || compare(a.slug, b.slug));

    if (courseLessons.length === 0) continue;

    model.push({
      name: course.name,
      title: course.title,
      lessonCount: courseLessons.length,
      lessons: courseLessons,
    });
  }

  return { courses: model };
}

// Stable, locale-independent ordering so order is identical across platforms
// (dev on Windows, CI on Linux). Exported so every adapter that orders Courses
// or Lessons by id/slug shares this one rule rather than re-inlining a ternary
// (the write path's `list_courses` reuses it).
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
