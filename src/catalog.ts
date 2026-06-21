/**
 * The Catalog — the single source of truth for the Components a Lesson may use.
 *
 * This module is *pure data*: it imports no `.astro`, so a plain Node script can
 * read it to generate the Professor-facing guide (`npm run gen:guide`). The same
 * definitions name every Component the render wiring must provide (see
 * `src/components/catalog.ts`, kept in lockstep by a test) and describe — in the
 * domain's language, free of Platform detail — *when to use* each Component and
 * which props/slots it takes. Adding a Component here, or promoting an Esboço,
 * regenerates the guide with no parallel hand-editing.
 */

/** One prop of a Component, as the Professor needs to understand it. */
export interface PropSpec {
  name: string;
  /** Human type, e.g. `"info" | "warn" | "ok"` or `CompareCard[]`. */
  type: string;
  required: boolean;
  /** Empty when there is no default. */
  default?: string;
  description: string;
}

/** A slot a Component accepts. `name: "children"` is the default slot. */
export interface SlotSpec {
  name: string;
  description: string;
}

/** A Component as the guide describes it — meaning first, markup never. */
export interface CatalogComponent {
  name: string;
  /** Pedagogical guidance: when this Component is the right choice. */
  whenToUse: string;
  props: PropSpec[];
  slots: SlotSpec[];
}

export const catalogComponents: CatalogComponent[] = [
  {
    name: "Kicker",
    whenToUse:
      'O selo que abre a Aula, situando domínio e lição (ex.: "CLF-C02 · Lição 07 · Domínio 3 — Storage"). Use uma vez, no topo, para orientar o aluno antes do conteúdo.',
    props: [
      {
        name: "tone",
        type: '"aws" | "accent"',
        required: false,
        default: '"aws"',
        description: 'Tom da pílula: "aws" (padrão, o azul-marinho) ou "accent".',
      },
    ],
    slots: [{ name: "children", description: "O texto do selo." }],
  },
  {
    name: "MissionBox",
    whenToUse:
      'Abre a Aula enquadrando "por que isto importa". Use logo após o título, para dar o sentido antes do conteúdo.',
    props: [
      {
        name: "title",
        type: "string",
        required: false,
        default: '"Por que esta Aula?"',
        description: "Título do quadro.",
      },
    ],
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
    props: [
      {
        name: "variant",
        type: '"info" | "warn" | "ok"',
        required: false,
        default: '"info"',
        description: "Papel do destaque, que define cor e rótulo.",
      },
    ],
    slots: [{ name: "children", description: "O conteúdo do destaque." }],
  },
  {
    name: "CompareCards",
    whenToUse:
      "Compara N opções lado a lado (ex.: bloco / arquivo / objeto). Use quando o ponto é o contraste; marque uma opção como destaque para sinalizar a recomendada ou em foco.",
    props: [
      {
        name: "cards",
        type: "CompareCard[]",
        required: true,
        description:
          "As opções a comparar. Cada card tem `label` (obrigatório), e opcionalmente `tag` (etiqueta), `description` (uma linha) e `highlight` (marca a opção em foco).",
      },
    ],
    slots: [],
  },
  {
    name: "Quiz",
    whenToUse:
      "Cria um teste de múltipla escolha com feedback na hora e pontuação ao final. Use para fixar o conteúdo — você só fornece os dados, sem escrever lógica.",
    props: [
      {
        name: "questions",
        type: "QuizQuestion[]",
        required: true,
        description:
          "As questões. Cada uma tem `prompt`, `options` (alternativas em ordem), `answer` (índice 0-based da correta) e `explanation` opcional.",
      },
      {
        name: "title",
        type: "string",
        required: false,
        default: '"Teste rápido — feedback na hora"',
        description: "Título do bloco.",
      },
    ],
    slots: [],
  },
  {
    name: "AskBox",
    whenToUse:
      "Fecha a Aula com a tarefa de produção do aluno — onde o aprendizado de fato acontece. Use uma vez, ao final.",
    props: [
      {
        name: "title",
        type: "string",
        required: false,
        default: '"Sua vez de produzir"',
        description: "Título da tarefa.",
      },
    ],
    slots: [{ name: "children", description: "O enunciado da tarefa." }],
  },
  {
    name: "Sources",
    whenToUse:
      "Lista as fontes da Aula como notas de rodapé numeradas. A numeração e os ids (r1, r2…) que o texto referencia são derivados da ordem — não digite números à mão.",
    props: [
      {
        name: "items",
        type: "Source[]",
        required: true,
        description: "As fontes. Cada uma tem `label` e `href` opcional.",
      },
      {
        name: "title",
        type: "string",
        required: false,
        default: '"Fontes"',
        description: "Título da seção.",
      },
    ],
    slots: [],
  },
  {
    name: "Nav",
    whenToUse:
      "Navegação anterior/próxima ao pé da Aula, para o aluno seguir a trilha sem voltar ao índice. Ambos os lados são opcionais — a primeira Aula não tem anterior, a última não tem próxima.",
    props: [
      {
        name: "prev",
        type: "NavLink",
        required: false,
        description:
          "Link para a Aula anterior: `href`, `label` e `sub` (legenda) opcional. Omita na primeira Aula.",
      },
      {
        name: "next",
        type: "NavLink",
        required: false,
        description:
          "Link para a próxima Aula: `href`, `label` e `sub` (legenda) opcional. Omita na última Aula.",
      },
    ],
    slots: [],
  },
];
