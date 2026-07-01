/**
 * The Catalog — the single source of truth for the Components a Lesson may use.
 *
 * Each Component carries a **Zod schema** for its props: one definition that
 * (a) validates a Lesson's Component usage (`validateAula`, used by the MCP write
 * and the render fallback), (b) generates the Professor-facing guide
 * (`npm run gen:guide`), and (c) types the Components themselves. The schema
 * speaks the domain's language through `.describe()`/`.default()`, never markup.
 *
 * This module is *pure data*: it imports only `zod`, so a plain Node script can
 * read it to regenerate the guide. The same names key the render wiring (see
 * `src/components/preact/catalog.ts`, kept in lockstep by a test), so a Component
 * can never be renderable but undocumented (or vice versa). Slots stay prose — Zod
 * models props, not the children/named slots a Component accepts.
 */
import { z } from "zod";

/** A slot a Component accepts. `name: "children"` is the default slot. */
export interface SlotSpec {
  name: string;
  description: string;
}

/**
 * A Component as the Catalog defines it — meaning first, markup never. `props` is
 * the single-source Zod schema; the guide and the validator both read from it.
 */
export interface CatalogComponent {
  name: string;
  /** Pedagogical guidance: when this Component is the right choice. */
  whenToUse: string;
  props: z.ZodObject;
  slots: SlotSpec[];
}

// --- Shared prop shapes, titled so the guide names them (`CompareCard[]` etc.) ---
//
// These are `strictObject` like the top-level prop schemas: a typo'd key inside a
// card or a question is an authoring mistake `validateAula` should catch, not
// silently drop. Keeping the strictness uniform makes the validator predictable.

const compareCard = z
  .strictObject({
    label: z.string(),
    tag: z.string().optional(),
    description: z.string().optional(),
    highlight: z.boolean().optional(),
  })
  .meta({ title: "CompareCard" });

const quizQuestion = z
  .strictObject({
    prompt: z.string(),
    options: z.array(z.string()),
    answer: z.number().int(),
    explanation: z.string().optional(),
  })
  .meta({ title: "QuizQuestion" })
  // `answer` is a 0-based index into `options`; an out-of-range index renders a
  // quiz with no correct alternative, so it's an error, not a silent pass.
  .refine((question) => question.answer >= 0 && question.answer < question.options.length, {
    error: "`answer` deve ser um índice 0-based válido dentro de `options`.",
    path: ["answer"],
  });

const source = z
  .strictObject({
    label: z.string(),
    href: z.string().optional(),
  })
  .meta({ title: "Source" });

const navLink = z
  .strictObject({
    href: z.string(),
    label: z.string(),
    sub: z.string().optional(),
  })
  .meta({ title: "NavLink" });

export const catalogComponents: CatalogComponent[] = [
  {
    name: "MissionBox",
    whenToUse:
      'Abre a Aula enquadrando "por que isto importa". Use logo após o título, para dar o sentido antes do conteúdo.',
    props: z.strictObject({
      title: z
        .string()
        .default("Por que esta Aula?")
        .describe("Título do quadro."),
    }),
    slots: [
      { name: "children", description: "O corpo do enquadramento." },
      {
        name: "meta",
        description:
          "Linha opcional de metadados (duração, pré-requisito); omitida quando ausente.",
      },
    ],
  },
  {
    name: "Callout",
    whenToUse:
      "Destaca uma ideia pontual no meio do texto, sem inventar estilo. Escolha a variante pelo papel: info (nota), warn (atenção/risco), ok (boa prática).",
    props: z.strictObject({
      variant: z
        .enum(["info", "warn", "ok"])
        .default("info")
        .describe("Papel do destaque, que define cor e rótulo."),
    }),
    slots: [{ name: "children", description: "O conteúdo do destaque." }],
  },
  {
    name: "CompareCards",
    whenToUse:
      "Compara N opções lado a lado (ex.: bloco / arquivo / objeto). Use quando o ponto é o contraste; marque uma opção como destaque para sinalizar a recomendada ou em foco.",
    props: z.strictObject({
      cards: z
        .array(compareCard)
        .describe(
          "As opções a comparar. Cada card tem `label` (obrigatório), e opcionalmente `tag` (etiqueta), `description` (uma linha) e `highlight` (marca a opção em foco).",
        ),
    }),
    slots: [],
  },
  {
    name: "Quiz",
    whenToUse:
      "Cria um teste de múltipla escolha com feedback na hora e pontuação ao final. Use para fixar o conteúdo — você só fornece os dados, sem escrever lógica.",
    props: z.strictObject({
      questions: z
        .array(quizQuestion)
        .describe(
          "As questões. Cada uma tem `prompt`, `options` (alternativas em ordem), `answer` (índice 0-based da correta) e `explanation` opcional.",
        ),
      title: z
        .string()
        .default("Teste rápido — feedback na hora")
        .describe("Título do bloco."),
    }),
    slots: [],
  },
  {
    name: "AskBox",
    whenToUse:
      "Fecha a Aula com a tarefa de produção do aluno — onde o aprendizado de fato acontece. Use uma vez, ao final.",
    props: z.strictObject({
      title: z
        .string()
        .default("Sua vez de produzir")
        .describe("Título da tarefa."),
    }),
    slots: [{ name: "children", description: "O enunciado da tarefa." }],
  },
  {
    name: "Sources",
    whenToUse:
      "Lista as fontes da Aula como notas de rodapé numeradas. A numeração e os ids (r1, r2…) que o texto referencia são derivados da ordem — não digite números à mão.",
    props: z.strictObject({
      items: z
        .array(source)
        .describe("As fontes. Cada uma tem `label` e `href` opcional."),
      title: z.string().default("Fontes").describe("Título da seção."),
    }),
    slots: [],
  },
  {
    name: "Nav",
    whenToUse:
      "Navegação anterior/próxima ao pé da Aula, para o aluno seguir a trilha sem voltar ao índice. Ambos os lados são opcionais — a primeira Aula não tem anterior, a última não tem próxima.",
    props: z.strictObject({
      prev: navLink
        .optional()
        .describe(
          "Link para a Aula anterior: `href`, `label` e `sub` (legenda) opcional. Omita na primeira Aula.",
        ),
      next: navLink
        .optional()
        .describe(
          "Link para a próxima Aula: `href`, `label` e `sub` (legenda) opcional. Omita na última Aula.",
        ),
    }),
    slots: [],
  },
];

/** The Catalog as a `name → props schema` map — the lookup `validateAula` uses. */
export const catalogSchemas: Record<string, z.ZodObject> = Object.fromEntries(
  catalogComponents.map((component) => [component.name, component.props]),
);
