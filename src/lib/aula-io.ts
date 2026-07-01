import { lessonFrontmatter } from "./frontmatter";
import { validateAula, type ValidationIssue } from "./validate-aula";

/**
 * The Aula I/O seam — the domain operations the local MCP server exposes so the
 * Professor reads and writes Aulas "as naturally as local files", never knowing
 * a Firestore lives underneath (ADR 0006). It is deliberately split in two:
 *
 *   - this module is the *logic* — pure orchestration over an injected
 *     `AulaStore` and `validateAula` (Seam C), with no knowledge of Firestore or
 *     the MCP transport, so the write taxonomy is unit-tested against a fake;
 *   - `aula-store.ts` is the Firestore-backed `AulaStore` (read/write service
 *     account), and `scripts/mcp-server.mts` is the thin stdio transport.
 *
 * The only rule beyond delegation is `write_aula`'s gate: run `validateAula`
 * before writing, **block** on any error (an unknown Component, invalid props,
 * bad Frontmatter), and let a declared-but-not-yet-deployed Esboço through as a
 * **warning** — transient, covered by the render fallback until the code ships
 * (ADR 0005).
 */

/**
 * An Aula as the tools move it: the Frontmatter as an object, the body as `mdx`
 * text, and the Esboço binding as `esbocos[]`. The store flattens/reassembles
 * this against the Firestore document shape; the tools never see that shape.
 */
export interface AulaData {
  frontmatter: Record<string, unknown>;
  mdx: string;
  esbocos: string[];
}

/** A Course and its Lessons, the shape `list_courses` returns for navigation. */
export interface CourseListing {
  course: string;
  title: string;
  lessons: { slug: string; title: string; order: number }[];
}

/**
 * The persistence port the tools depend on. The Firestore implementation lives
 * in `aula-store.ts`; tests supply an in-memory fake. Keeping writes behind this
 * port is what lets the write gate be tested without a database.
 */
export interface AulaStore {
  listCourses(): Promise<CourseListing[]>;
  readAula(course: string, slug: string): Promise<AulaData | null>;
  writeAula(course: string, slug: string, data: AulaData): Promise<void>;
  /** True when a document existed and was removed; false when there was none. */
  deleteAula(course: string, slug: string): Promise<boolean>;
}

/** The `esbocos[]` available in the deployed bundle, used to grade the warning. */
export interface AulaToolsOptions {
  bundledSketches?: Iterable<string>;
}

/**
 * The write outcome: `ok` is false when validation errors blocked the write, so
 * `written` mirrors it. `warnings` are surfaced even on a successful write (a
 * not-yet-deployed Esboço), so the author sees the transient state.
 */
export interface WriteAulaResult {
  ok: boolean;
  written: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** The input to `write_aula`; `esbocos` defaults to none when omitted. */
export interface WriteAulaInput {
  frontmatter: Record<string, unknown>;
  mdx: string;
  esbocos?: string[];
}

export interface AulaTools {
  listCourses(): Promise<CourseListing[]>;
  readAula(course: string, slug: string): Promise<AulaData | null>;
  writeAula(course: string, slug: string, input: WriteAulaInput): Promise<WriteAulaResult>;
  deleteAula(course: string, slug: string): Promise<boolean>;
}

/**
 * Binds the domain tools to a concrete store and the deployed-Esboço set. The
 * returned handlers speak only Aula vocabulary; the MCP server wraps them into
 * protocol responses, and the store turns them into Firestore reads/writes.
 */
export function createAulaTools(store: AulaStore, options: AulaToolsOptions = {}): AulaTools {
  const bundledSketches = [...(options.bundledSketches ?? [])];

  return {
    listCourses: () => store.listCourses(),
    readAula: (course, slug) => store.readAula(course, slug),
    deleteAula: (course, slug) => store.deleteAula(course, slug),
    async writeAula(course, slug, input) {
      const esbocos = input.esbocos ?? [];
      const result = validateAula(
        { frontmatter: input.frontmatter, mdx: input.mdx, esbocos },
        { bundledSketches },
      );

      // Block the write on any error; the store never sees a rejected Aula.
      if (!result.ok) {
        return { ok: false, written: false, errors: result.errors, warnings: result.warnings };
      }

      // Persist the *schema-normalized* Frontmatter, not the raw input, so
      // defaults materialize in the document (notably `prerequisites: []`).
      // Validation just passed, so `parse` cannot throw; skipping this would
      // store a doc whose shape violates the `LessonFrontmatter` contract the
      // read path (`readLesson`) hands back to the render.
      const frontmatter = { ...lessonFrontmatter.parse(input.frontmatter) };
      await store.writeAula(course, slug, { frontmatter, mdx: input.mdx, esbocos });
      return { ok: true, written: true, errors: [], warnings: result.warnings };
    },
  };
}
