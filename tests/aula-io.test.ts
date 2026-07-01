import { beforeEach, expect, test } from "vitest";

import {
  createAulaTools,
  type AulaData,
  type AulaStore,
  type CourseListing,
} from "../src/lib/aula-io";

// The Aula I/O seam — the domain operations the MCP server exposes
// (`list_courses`, `read_aula`, `write_aula`, `delete_aula`), tested against an
// in-memory store so the taxonomy is exercised without Firestore or the MCP
// transport. The only logic here beyond delegation is the `write_aula` gate:
// it runs `validateAula` (Seam C) before writing, blocks on any error, and lets
// a not-yet-deployed Esboço through as a warning (ADR 0006).

const VALID_FRONTMATTER = {
  title: "Amazon S3",
  order: 7,
  domain: "Storage",
  summary: "Onde guardar objetos.",
  estMinutes: 8,
};

// A minimal in-memory AulaStore: a map keyed by "course/slug", plus a record of
// the writes it saw so a test can assert a blocked write never reached it.
class FakeStore implements AulaStore {
  aulas = new Map<string, AulaData>();
  writes: string[] = [];
  deletes: string[] = [];

  async listCourses(): Promise<CourseListing[]> {
    const byCourse = new Map<string, CourseListing>();
    for (const [key, data] of this.aulas) {
      const [course, slug] = key.split("/");
      const listing =
        byCourse.get(course) ?? { course, title: course, lessons: [] };
      listing.lessons.push({
        slug,
        title: String(data.frontmatter.title ?? slug),
        order: Number(data.frontmatter.order ?? 0),
      });
      byCourse.set(course, listing);
    }
    return [...byCourse.values()];
  }

  async readAula(course: string, slug: string): Promise<AulaData | null> {
    return this.aulas.get(`${course}/${slug}`) ?? null;
  }

  async writeAula(course: string, slug: string, data: AulaData): Promise<void> {
    const key = `${course}/${slug}`;
    this.writes.push(key);
    this.aulas.set(key, data);
  }

  async deleteAula(course: string, slug: string): Promise<boolean> {
    const key = `${course}/${slug}`;
    this.deletes.push(key);
    return this.aulas.delete(key);
  }
}

let store: FakeStore;
let tools: ReturnType<typeof createAulaTools>;

beforeEach(() => {
  store = new FakeStore();
  tools = createAulaTools(store, { bundledSketches: ["BucketObjectKey"] });
});

test("write_aula persists a valid Aula and reports ok with no issues", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: '<Callout variant="ok">Boa prática.</Callout>',
    esbocos: [],
  });

  expect(result.ok).toBe(true);
  expect(result.written).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.warnings).toEqual([]);
  expect(store.aulas.has("aws/0007-s3")).toBe(true);
});

test("write_aula blocks on a validation error and never touches the store", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    // `variant: "purple"` is outside Callout's enum → invalid-props error.
    frontmatter: VALID_FRONTMATTER,
    mdx: '<Callout variant="purple">x</Callout>',
    esbocos: [],
  });

  expect(result.ok).toBe(false);
  expect(result.written).toBe(false);
  expect(result.errors.some((i) => i.code === "invalid-props")).toBe(true);
  expect(store.writes).toEqual([]);
  expect(store.aulas.has("aws/0007-s3")).toBe(false);
});

test("write_aula blocks on an unknown Component (referenced, not in Catalog nor esbocos)", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: "<Flarb />",
    esbocos: [],
  });

  expect(result.ok).toBe(false);
  expect(result.written).toBe(false);
  expect(result.errors.some((i) => i.code === "unknown-component" && i.subject === "Flarb")).toBe(
    true,
  );
});

test("write_aula blocks on invalid Frontmatter", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    frontmatter: { ...VALID_FRONTMATTER, title: "", order: "seven" },
    mdx: "",
    esbocos: [],
  });

  expect(result.ok).toBe(false);
  expect(result.written).toBe(false);
  expect(result.errors.every((i) => i.code === "invalid-frontmatter")).toBe(true);
});

test("write_aula allows a not-yet-deployed Esboço, persisting it with a warning", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: "<NotYetDeployed />",
    esbocos: ["NotYetDeployed"],
  });

  // Transient: the Esboço's code lands on the next deploy; the render falls back
  // meanwhile. The write must still go through — this is a warning, not a block.
  expect(result.ok).toBe(true);
  expect(result.written).toBe(true);
  expect(result.errors).toEqual([]);
  expect(result.warnings.some((i) => i.code === "sketch-not-deployed")).toBe(true);
  expect(store.aulas.has("aws/0007-s3")).toBe(true);
});

test("write_aula treats a missing esbocos as an empty list", async () => {
  const result = await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: '<Callout>ok</Callout>',
  });

  expect(result.ok).toBe(true);
  expect(result.written).toBe(true);
  expect(store.aulas.get("aws/0007-s3")?.esbocos).toEqual([]);
});

test("write_aula persists schema-normalized Frontmatter (prerequisites default materializes)", async () => {
  // The author omits `prerequisites`; the stored doc must carry the schema
  // default `[]`, or the SSR read path hands the render `prerequisites:
  // undefined`, violating the LessonFrontmatter contract.
  await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER, // no `prerequisites` key
    mdx: '<Callout>ok</Callout>',
    esbocos: [],
  });

  const stored = store.aulas.get("aws/0007-s3");
  expect(stored?.frontmatter.prerequisites).toEqual([]);
});

test("read_aula returns the stored Aula, or null when absent", async () => {
  await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: "corpo",
    esbocos: [],
  });

  const found = await tools.readAula("aws", "0007-s3");
  expect(found?.mdx).toBe("corpo");
  expect(found?.frontmatter.title).toBe("Amazon S3");

  expect(await tools.readAula("aws", "missing")).toBeNull();
});

test("list_courses returns each Course with its Lessons", async () => {
  await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: "a",
    esbocos: [],
  });
  await tools.writeAula("aws", "0001-intro", {
    frontmatter: { ...VALID_FRONTMATTER, title: "Intro", order: 1 },
    mdx: "b",
    esbocos: [],
  });

  const courses = await tools.listCourses();
  const aws = courses.find((c) => c.course === "aws");
  expect(aws?.lessons).toHaveLength(2);
  expect(aws?.lessons.map((l) => l.slug).sort()).toEqual(["0001-intro", "0007-s3"]);
});

test("delete_aula removes the Aula and reports whether it existed", async () => {
  await tools.writeAula("aws", "0007-s3", {
    frontmatter: VALID_FRONTMATTER,
    mdx: "a",
    esbocos: [],
  });

  expect(await tools.deleteAula("aws", "0007-s3")).toBe(true);
  expect(store.aulas.has("aws/0007-s3")).toBe(false);
  // A second delete finds nothing.
  expect(await tools.deleteAula("aws", "0007-s3")).toBe(false);
});
