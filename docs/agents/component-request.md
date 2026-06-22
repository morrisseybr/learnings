# Solicitação de Componente

Como uma **Solicitação de Componente** nasce, corre pela triagem e é resolvida.
Este é o registro operacional para os agentes; a _decisão_ por trás dele vive nas
[ADR 0002](../adr/0002-catalogo-fechado-com-esbocos-em-trilhos.md) e
[ADR 0004](../adr/0004-professor-e-desenvolvedor-como-skills-no-repo.md). O
vocabulário é o do glossário [`CONTEXT.md`](../../CONTEXT.md) (Esboço, Solicitação
de Componente, Catálogo, Componente, Professor, Desenvolvedor).

## O que é

O sinal de que um **Esboço** se provou reutilizável e merece virar **Componente do
Catálogo**. Não é uma tarefa de IA: é o gatilho de uma promoção que **um humano**
resolve — porque crescer o Catálogo é generalização deliberada, não fuga
descontrolada.

## Quem emite e quem abre

O seam de conhecimento entre as camadas é preservado (ADR 0004):

- O **Professor** apenas **julga** se o Esboço é reutilizável e sinaliza isso ao
  delegar. Ele é cego à Plataforma — não roda `gh`, não abre Issue.
- O **Desenvolvedor**, quando o Professor sinaliza `reutilizável`, **abre** a
  Solicitação de Componente como GitHub Issue. Ele **não promove** — só registra.

## Como abrir (Desenvolvedor)

Uma Issue no issue-tracker do repo (ver [issue-tracker.md](./issue-tracker.md)),
com **duas** labels: `component-request` (o que é) e `needs-triage` (onde entra no
fluxo).

```sh
gh issue create \
  --title "Solicitação de Componente: <nome do Esboço>" \
  --label component-request \
  --label needs-triage \
  --body "$(cat <<'EOF'
## Esboço
`src/sketches/<Nome>.astro` — vinculado em `src/sketches/registry.ts`.

## Aula(s) que o usam
- <curso>/<slug>

## Por que é reutilizável
<o padrão visual/interativo que se repete e justifica promover a Componente>
EOF
)"
```

## Fluxo pela triagem

A Solicitação corre pelo mesmo estado das demais Issues (ver
[triage-labels.md](./triage-labels.md)):

`needs-triage` → `ready-for-human`

Entra como `needs-triage`. Como a promoção exige julgamento e refatoração humanos,
ela é triada para **`ready-for-human`**, nunca `ready-for-agent`: nenhum agente
promove Esboço a Componente por conta própria.

## A promoção (humano resolve)

Ao resolver uma Solicitação de Componente, o humano:

1. **Promove** o Esboço a **Componente do Catálogo** — generalizando props/uso e
   movendo-o de `src/sketches/` para o Catálogo, anunciado no guia gerado.
2. **Refatora as Aulas** que usavam o Esboço para consumir o novo Componente.
3. **Fecha** a Issue.

O Catálogo é a fonte de verdade única; promover um Esboço significa que o guia do
Catálogo passa a anunciá-lo e o build passa a validá-lo como qualquer Componente.
