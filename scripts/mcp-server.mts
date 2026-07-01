/**
 * The local MCP server — the AI's authoring I/O over Firestore (ADR 0006).
 *
 * A stdio MCP server (registered in the repo's `.mcp.json`) that wraps the
 * Firebase Admin SDK and exposes tools with the *shape of the domain* —
 * `list_courses`, `read_aula`, `write_aula`, `delete_aula` — so the Professor
 * reads and writes Aulas with Aula vocabulary, never knowing a database is
 * underneath. `write_aula` runs `validateAula` (Seam C) before writing and
 * blocks on any error; a declared-but-not-yet-deployed Esboço is only a warning.
 *
 * It runs on the developer's machine with the **read/write** service account
 * (`FIRESTORE_ADMIN_KEY`); the public web surface stays read-only with its own
 * viewer account. Launch it through `tsx` (see `.mcp.json`) so the `src/lib`
 * TypeScript is loaded directly, sharing the exact `validateAula` the render and
 * the tests use.
 *
 * This file is the composition root: it wires the transport, the Firestore
 * store, and the deployed-Esboço set to the pure tools in `src/lib/aula-io.ts`.
 * All logic worth testing lives there; this stays thin on purpose.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createAulaTools, type AulaTools, type WriteAulaResult } from "../src/lib/aula-io.ts";
import { FirestoreAulaStore } from "../src/lib/aula-store.ts";

/**
 * The deployed Esboço names, read from the filesystem rather than importing the
 * Preact bundle (this Node process has no JSX runtime). `src/sketches/preact/`
 * holds one `.tsx` per deployed Esboço plus the `index.ts` barrel; the file
 * stems are exactly the names a Lesson references, so this can't drift from what
 * ships. A name in `esbocos[]` absent here is the "not deployed yet" warning.
 */
function deployedSketchNames(): string[] {
  const dir = fileURLToPath(new URL("../src/sketches/preact/", import.meta.url));
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""));
}

// Frontmatter as the tool accepts it: the domain fields, all optional at the
// protocol boundary so a missing required field surfaces as a *structured*
// `validateAula` error (blocking, with the field named) rather than a raw
// protocol rejection. `validateAula` is the single gate on what may be written.
const frontmatterInput = z
  .object({
    title: z.string().describe("O título da Aula.").optional(),
    order: z.number().int().describe("A posição da Aula na trilha do Curso (o NNNN do slug).").optional(),
    domain: z.string().describe('O domínio que a Aula cobre (ex.: "Storage").').optional(),
    summary: z.string().describe("Resumo de uma frase, mostrado no índice do Curso.").optional(),
    prerequisites: z
      .array(z.string())
      .describe("Ids de Aulas pré-requisito (`<curso>/<slug>`); omita quando não houver.")
      .optional(),
    estMinutes: z.number().int().positive().describe("Tempo estimado de estudo, em minutos.").optional(),
  })
  .describe("Os metadados de primeira classe da Aula (Frontmatter).");

// A CallToolResult carrying JSON so the caller can parse the structured result,
// plus a human line. `isError` marks a blocked write / failed read.
function jsonResult(payload: unknown, options: { isError?: boolean } = {}) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    isError: options.isError ?? false,
  };
}

function writeResultText(course: string, slug: string, result: WriteAulaResult) {
  const where = `${course}/${slug}`;
  const summary = result.written
    ? `Aula "${where}" gravada.${result.warnings.length ? ` ${result.warnings.length} aviso(s).` : ""}`
    : `Aula "${where}" NÃO gravada — ${result.errors.length} erro(s) de validação. Corrija e tente de novo.`;
  return jsonResult({ summary, ...result }, { isError: !result.written });
}

function registerTools(server: McpServer, tools: AulaTools): void {
  server.registerTool(
    "list_courses",
    {
      title: "Listar Cursos",
      description: "Lista os Cursos e suas Aulas (slug, título, ordem), para navegar antes de ler ou escrever.",
    },
    async () => jsonResult(await tools.listCourses()),
  );

  server.registerTool(
    "read_aula",
    {
      title: "Ler Aula",
      description: "Lê uma Aula (Frontmatter, corpo MDX e esbocos[]) de um Curso.",
      inputSchema: {
        course: z.string().describe("Id do Curso, ex.: `aws`."),
        slug: z.string().describe("Slug da Aula, ex.: `0007-amazon-s3`."),
      },
    },
    async ({ course, slug }) => {
      const aula = await tools.readAula(course, slug);
      if (!aula) {
        return jsonResult({ error: `Aula "${course}/${slug}" não existe.` }, { isError: true });
      }
      return jsonResult(aula);
    },
  );

  server.registerTool(
    "write_aula",
    {
      title: "Escrever Aula",
      description:
        "Cria ou substitui uma Aula. Valida antes de gravar: Componente inexistente ou props inválidas bloqueiam a escrita (erro); um Esboço em esbocos[] ainda sem deploy é só aviso (a Aula grava e cai no fallback até o deploy).",
      inputSchema: {
        course: z.string().describe("Id do Curso, ex.: `aws`."),
        slug: z.string().describe("Slug da Aula, ex.: `0007-amazon-s3`."),
        frontmatter: frontmatterInput,
        mdx: z.string().describe("O corpo MDX da Aula, com o uso de Componentes do Catálogo/Esboços."),
        esbocos: z
          .array(z.string())
          .describe("Nomes de Esboços que a Aula referencia por nome; omita quando não houver.")
          .optional(),
      },
    },
    async ({ course, slug, frontmatter, mdx, esbocos }) => {
      const result = await tools.writeAula(course, slug, { frontmatter, mdx, esbocos });
      return writeResultText(course, slug, result);
    },
  );

  server.registerTool(
    "delete_aula",
    {
      title: "Apagar Aula",
      description: "Apaga uma Aula. Retorna se ela existia.",
      inputSchema: {
        course: z.string().describe("Id do Curso, ex.: `aws`."),
        slug: z.string().describe("Slug da Aula, ex.: `0007-amazon-s3`."),
      },
    },
    async ({ course, slug }) => {
      const deleted = await tools.deleteAula(course, slug);
      return jsonResult({
        deleted,
        summary: deleted ? `Aula "${course}/${slug}" apagada.` : `Aula "${course}/${slug}" não existia.`,
      });
    },
  );
}

async function main() {
  const store = new FirestoreAulaStore();
  const tools = createAulaTools(store, { bundledSketches: deployedSketchNames() });

  const server = new McpServer({ name: "learnings-aulas", version: "0.1.0" });
  registerTools(server, tools);

  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  // stdout is the MCP transport; diagnostics go to stderr.
  console.error("MCP server failed to start:", error);
  process.exit(1);
});
