<!-- GERADO de src/catalog.ts por `npm run gen:guide` — NÃO edite à mão. -->

# Guia do Catálogo

Estes são os Componentes que você pode usar no corpo MDX de uma Aula, escolhidos
por *significado* — você decide o que ensinar e como apresentar, nunca que markup
escrever. Todos estão disponíveis globalmente: use-os sem `import`. Quando nenhum
servir, peça um Esboço ao Desenvolvedor.

## Kicker

O selo que abre a Aula, situando domínio e lição (ex.: "CLF-C02 · Lição 07 · Domínio 3 — Storage"). Use uma vez, no topo, para orientar o aluno antes do conteúdo.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `tone` | `"aws" \| "accent"` | não | `"aws"` | Tom da pílula: "aws" (padrão, o azul-marinho) ou "accent". |

**Conteúdo**

- `children` — O texto do selo.

## MissionBox

Abre a Aula enquadrando "por que isto importa". Use logo após o título, para dar o sentido antes do conteúdo.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `title` | `string` | não | `"Por que esta Aula?"` | Título do quadro. |

**Conteúdo**

- `children` — O corpo do enquadramento.
- `meta` (slot nomeado) — Linha opcional de metadados (duração, pré-requisito); omitida quando ausente.

## Callout

Destaca uma ideia pontual no meio do texto, sem inventar estilo. Escolha a variante pelo papel: info (nota), warn (atenção/risco), ok (boa prática).

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `variant` | `"info" \| "warn" \| "ok"` | não | `"info"` | Papel do destaque, que define cor e rótulo. |

**Conteúdo**

- `children` — O conteúdo do destaque.

## CompareCards

Compara N opções lado a lado (ex.: bloco / arquivo / objeto). Use quando o ponto é o contraste; marque uma opção como destaque para sinalizar a recomendada ou em foco.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `cards` | `CompareCard[]` | sim | — | As opções a comparar. Cada card tem `label` (obrigatório), e opcionalmente `tag` (etiqueta), `description` (uma linha) e `highlight` (marca a opção em foco). |

## Quiz

Cria um teste de múltipla escolha com feedback na hora e pontuação ao final. Use para fixar o conteúdo — você só fornece os dados, sem escrever lógica.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `questions` | `QuizQuestion[]` | sim | — | As questões. Cada uma tem `prompt`, `options` (alternativas em ordem), `answer` (índice 0-based da correta) e `explanation` opcional. |
| `title` | `string` | não | `"Teste rápido — feedback na hora"` | Título do bloco. |

## AskBox

Fecha a Aula com a tarefa de produção do aluno — onde o aprendizado de fato acontece. Use uma vez, ao final.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `title` | `string` | não | `"Sua vez de produzir"` | Título da tarefa. |

**Conteúdo**

- `children` — O enunciado da tarefa.

## Sources

Lista as fontes da Aula como notas de rodapé numeradas. A numeração e os ids (r1, r2…) que o texto referencia são derivados da ordem — não digite números à mão.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `items` | `Source[]` | sim | — | As fontes. Cada uma tem `label` e `href` opcional. |
| `title` | `string` | não | `"Fontes"` | Título da seção. |

## Nav

Navegação anterior/próxima ao pé da Aula, para o aluno seguir a trilha sem voltar ao índice. Ambos os lados são opcionais — a primeira Aula não tem anterior, a última não tem próxima.

**Props**

| Prop | Tipo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `prev` | `NavLink` | não | — | Link para a Aula anterior: `href`, `label` e `sub` (legenda) opcional. Omita na primeira Aula. |
| `next` | `NavLink` | não | — | Link para a próxima Aula: `href`, `label` e `sub` (legenda) opcional. Omita na última Aula. |
