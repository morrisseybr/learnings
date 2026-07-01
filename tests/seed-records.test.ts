import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { readSeedRecords } from "../src/lib/seed-records";

// The migration reader (issue #27): the one-shot seed turns every
// `courses/<course>/lessons/*.mdx` into the Firestore documents that become the
// single source of truth — Frontmatter promoted to fields, the body kept as the
// `mdx` text, and the Esboço binding taken from a snapshot of the retired
// `registry.ts`. These cases pin that transform (a pure function over a fixture
// tree) so the migration is verifiable without touching a real database.

type Tree = { [name: string]: string | Tree };

function makeCoursesDir(tree: Tree): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learnings-seed-"));
  const coursesDir = path.join(root, "courses");
  writeTree(coursesDir, tree);
  return coursesDir;
}

function writeTree(dir: string, tree: Tree): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, value] of Object.entries(tree)) {
    const target = path.join(dir, name);
    if (typeof value === "string") fs.writeFileSync(target, value);
    else writeTree(target, value);
  }
}

// A valid Lesson .mdx with overridable Frontmatter and body.
function lesson(fields: Record<string, unknown> = {}, body = "Corpo da Aula.\n"): string {
  const fm: Record<string, unknown> = {
    title: "Olá MDX",
    order: 1,
    domain: "Tracer",
    summary: "Uma Aula de exemplo.",
    prerequisites: [],
    estMinutes: 5,
    ...fields,
  };
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${body}`;
}

test("promotes Frontmatter to fields and keeps the body as the mdx text", () => {
  const coursesDir = makeCoursesDir({
    aws: {
      "MISSION.md": "# Mission: AWS\n",
      lessons: {
        "0001-intro.mdx": lesson(
          { title: "Intro", order: 1, estMinutes: 7 },
          "# Título\n\nUm parágrafo com <Callout>alerta</Callout>.\n",
        ),
      },
    },
  });

  const { lessons } = readSeedRecords(coursesDir, {});
  expect(lessons).toHaveLength(1);
  const doc = lessons[0];
  expect(doc.course).toBe("aws");
  expect(doc.slug).toBe("0001-intro");
  expect(doc.title).toBe("Intro");
  expect(doc.order).toBe(1);
  expect(doc.estMinutes).toBe(7);
  expect(doc.prerequisites).toEqual([]);
  // The body — and only the body — becomes the mdx field: no Frontmatter fence.
  expect(doc.mdx).toContain("# Título");
  expect(doc.mdx).toContain("<Callout>alerta</Callout>");
  expect(doc.mdx).not.toContain("---");
  expect(doc.mdx).not.toContain("title:");
});

test("attaches the Esboço binding from the snapshot map, defaulting to empty", () => {
  const coursesDir = makeCoursesDir({
    aws: {
      lessons: {
        "0007-s3.mdx": lesson({ title: "S3" }),
        "0004-ec2.mdx": lesson({ title: "EC2" }),
      },
    },
  });

  const { lessons } = readSeedRecords(coursesDir, {
    "aws/0007-s3": ["BucketObjectKey"],
  });

  const bySlug = Object.fromEntries(lessons.map((l) => [l.slug, l]));
  expect(bySlug["0007-s3"].esbocos).toEqual(["BucketObjectKey"]);
  // A Lesson absent from the map declares no Esboço.
  expect(bySlug["0004-ec2"].esbocos).toEqual([]);
});

test("reads each Course title from its MISSION.md heading", () => {
  const coursesDir = makeCoursesDir({
    aws: {
      "MISSION.md": "# Mission: AWS Certified Cloud Practitioner (CLF-C02)\n",
      lessons: { "0001-a.mdx": lesson() },
    },
  });

  expect(readSeedRecords(coursesDir, {}).courses[0].title).toBe(
    "AWS Certified Cloud Practitioner (CLF-C02)",
  );
});

test("falls back to a formatted folder name when MISSION.md is missing", () => {
  const coursesDir = makeCoursesDir({
    "machine-learning": { lessons: { "0001-a.mdx": lesson() } },
  });

  expect(readSeedRecords(coursesDir, {}).courses[0].title).toBe("Machine Learning");
});

test("emits one Course record per Course that has Lessons, ordered by name", () => {
  const coursesDir = makeCoursesDir({
    claude: { lessons: { "0001-a.mdx": lesson() } },
    aws: { lessons: { "0001-a.mdx": lesson() } },
  });

  const { courses } = readSeedRecords(coursesDir, {});
  expect(courses.map((c) => c.name)).toEqual(["aws", "claude"]);
  // Order is a stable, name-sorted index so a re-seed is deterministic.
  expect(courses.map((c) => c.order)).toEqual([0, 1]);
});

test("excludes non-Lesson files, and Courses without any .mdx Lessons", () => {
  const coursesDir = makeCoursesDir({
    aws: {
      lessons: {
        "0001-a.mdx": lesson(),
        "notes.md": "# notes",
        "0002-old.html": "<title>old</title>",
      },
      "learning-records": { "D1.md": "record" },
      reference: { "GLOSSARY.md": "glossary" },
    },
    // No lessons/ folder at all → not migrated.
    empty: { "MISSION.md": "# Mission: Empty\n" },
    // A lessons/ folder with no .mdx → not migrated.
    stale: { lessons: { "0001-old.html": "<title>old</title>" } },
  });

  const { courses, lessons } = readSeedRecords(coursesDir, {});
  expect(courses.map((c) => c.name)).toEqual(["aws"]);
  expect(lessons.map((l) => l.slug)).toEqual(["0001-a"]);
});

test("rejects invalid Frontmatter, naming the offending file", () => {
  const coursesDir = makeCoursesDir({
    aws: { lessons: { "0001-bad.mdx": lesson({ estMinutes: "muito" }) } },
  });

  expect(() => readSeedRecords(coursesDir, {})).toThrow(/0001-bad\.mdx/);
});
