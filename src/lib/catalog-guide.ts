import { z } from "zod";

import type { CatalogComponent, SlotSpec } from "../catalog";

/**
 * Renders the Professor-facing guide to the Catalog as Markdown — the document
 * teach-v3 reads to write MDX. It is a pure function of the Catalog's data, and
 * each Component's props are read straight from its Zod schema (the single source
 * that also validates Lessons), so the guide can never diverge from the
 * validation: regenerate it whenever a Component is added or an Esboço is
 * promoted (`npm run gen:guide`).
 *
 * The schema is read through `z.toJSONSchema` with `io: "input"`, so a prop with
 * a default reads as optional and carries its default — matching what the
 * Professor must actually author. The guide speaks the domain's language (Aula,
 * Componente, Esboço) and stays free of Platform detail.
 */
export function renderCatalogGuide(components: CatalogComponent[]): string {
  const sections = components.map(renderComponent).join("\n\n");
  return `${HEADER}\n\n${sections}\n`;
}

const HEADER = `<!-- GERADO de src/catalog.ts por \`npm run gen:guide\` — NÃO edite à mão. -->

# Guia do Catálogo

Estes são os Componentes que você pode usar no corpo MDX de uma Aula, escolhidos
por *significado* — você decide o que ensinar e como apresentar, nunca que markup
escrever. Todos estão disponíveis globalmente: use-os sem \`import\`. Quando nenhum
servir, peça um Esboço ao Desenvolvedor.`;

interface JsonSchema {
  properties?: Record<string, JsonNode>;
  required?: string[];
}

interface JsonNode {
  type?: string | string[];
  description?: string;
  default?: unknown;
  title?: string;
  items?: JsonNode;
  enum?: unknown[];
  anyOf?: JsonNode[];
}

function renderComponent(component: CatalogComponent): string {
  const parts = [`## ${component.name}`, "", component.whenToUse, "", renderProps(component.props)];
  if (component.slots.length > 0) {
    parts.push("", renderSlots(component.slots));
  }
  return parts.join("\n");
}

function renderProps(schema: z.ZodObject): string {
  const json = z.toJSONSchema(schema, { io: "input" }) as JsonSchema;
  const entries = Object.entries(json.properties ?? {});
  if (entries.length === 0) {
    return "**Props:** nenhuma.";
  }
  const required = new Set(json.required ?? []);
  const rows = entries.map(([name, node]) => renderRow(name, node, required.has(name)));
  return [
    "**Props**",
    "",
    "| Prop | Tipo | Obrigatório | Padrão | Descrição |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderRow(name: string, node: JsonNode, required: boolean): string {
  const type = escapeCell(typeOf(node));
  const def =
    node.default === undefined ? "—" : `\`${escapeCell(JSON.stringify(node.default))}\``;
  const description = escapeCell(node.description ?? "");
  return `| \`${name}\` | \`${type}\` | ${required ? "sim" : "não"} | ${def} | ${description} |`;
}

/** Maps a JSON Schema node to a readable, Professor-facing type string. */
function typeOf(node: JsonNode): string {
  if (node.enum) {
    return node.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (node.anyOf) {
    return node.anyOf.map(typeOf).join(" | ");
  }
  if (node.type === "array") {
    const items = node.items;
    return `${items ? typeOf(items) : "any"}[]`;
  }
  // A titled object (CompareCard, NavLink…) reads by its name, not "object".
  if (node.title) {
    return node.title;
  }
  if (Array.isArray(node.type)) {
    return node.type.join(" | ");
  }
  return node.type ?? "any";
}

function renderSlots(slots: SlotSpec[]): string {
  const items = slots.map((slot) => {
    const label = slot.name === "children" ? "`children`" : `\`${slot.name}\` (slot nomeado)`;
    return `- ${label} — ${slot.description}`;
  });
  return ["**Conteúdo**", "", ...items].join("\n");
}

/** Escapes pipes so a value never breaks out of its Markdown table cell. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
