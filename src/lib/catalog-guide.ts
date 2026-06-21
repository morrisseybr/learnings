import type { CatalogComponent, PropSpec, SlotSpec } from "../catalog";

/**
 * Renders the Professor-facing guide to the Catalog as Markdown — the document
 * teach-v3 reads to write MDX. It is a pure function of the Catalog's data, so
 * the guide can never diverge from the implementation: regenerate it whenever a
 * Component is added or an Esboço is promoted (`npm run gen:guide`).
 *
 * The guide speaks the domain's language (Aula, Componente, Esboço) and stays
 * free of Platform detail — the Professor chooses Components by *meaning*, never
 * by markup.
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

function renderComponent(component: CatalogComponent): string {
  const parts = [`## ${component.name}`, "", component.whenToUse, "", renderProps(component.props)];
  if (component.slots.length > 0) {
    parts.push("", renderSlots(component.slots));
  }
  return parts.join("\n");
}

function renderProps(props: PropSpec[]): string {
  if (props.length === 0) {
    return "**Props:** nenhuma.";
  }
  const rows = props.map(
    (prop) =>
      `| \`${prop.name}\` | \`${escapeCell(prop.type)}\` | ${prop.required ? "sim" : "não"} | ${
        prop.default ? `\`${escapeCell(prop.default)}\`` : "—"
      } | ${escapeCell(prop.description)} |`,
  );
  return [
    "**Props**",
    "",
    "| Prop | Tipo | Obrigatório | Padrão | Descrição |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
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
