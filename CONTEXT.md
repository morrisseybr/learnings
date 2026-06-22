# learnings

Hub estático de cursos/aulas que **uma IA gera**, publicado no GitHub Pages e
consumido como PWA no celular. Este glossário fixa a linguagem do domínio; não é
spec nem registro de decisões técnicas (essas vivem em `docs/adr/`).

## Language

**Aula**:
Um documento de aprendizado auto-contido, gerado por IA, sobre um único tópico.
Criada uma vez e raramente alterada depois; não é dinâmica.
_Avoid_: post, artigo, página, lição (use "Aula").

**Curso**:
Uma coleção ordenada de Aulas sobre um domínio (ex.: `aws`, `claude`).
_Avoid_: módulo, trilha, disciplina.

**Componente**:
Uma unidade visual/semântica reutilizável que a IA insere no corpo MDX de uma
Aula (ex.: Callout, Quiz, MissionBox). Encoda a identidade pedagógica e visual,
de modo que a IA escolha _significado_, não HTML/CSS.
_Avoid_: widget, bloco, partial, snippet.

**Catálogo**:
O conjunto definido de Componentes disponíveis — suas props e regras de uso. É a
**fonte de verdade única**: o mesmo catálogo valida o build e instrui a IA que
gera as Aulas.
_Avoid_: biblioteca (ambíguo: reserve para a _implementação_ dos Componentes),
design system.

**Esboço**:
Um Componente de uso único, criado para uma única Aula quando nenhum Componente
do Catálogo serve. Vive fora do Catálogo e não é anunciado no guia; é ligado à
sua Aula e usado pelo nome, como qualquer Componente. Continua nos trilhos: usa
os design tokens, é escopado e offline-safe (sem bibliotecas externas, CDN ou
rede). Quando se prova reutilizável, é promovido a Componente do Catálogo.
_Avoid_: ilha (todo Componente interativo já é uma "island" do Astro), widget, snippet.

**Solicitação de Componente**:
O sinal que o Professor emite quando julga que um Esboço é reutilizável e merece
virar Componente do Catálogo. Resolvida por um humano, que promove o Esboço a
Componente e refatora as Aulas que o usavam.
_Avoid_: pedido, request, ticket.

**Professor**:
O agente que gera Aulas (hoje a skill `teach-v2`). Opera no nível de Cursos,
Aulas e Componentes-como-vocabulário; é deliberadamente cego à Plataforma (Astro,
build, repo, `gh`). Quando precisa de um visual ou interação que o Catálogo não
tem, delega ao Desenvolvedor, sinalizando se quer ou não uma Solicitação de
Componente.
_Avoid_: Pedagogo, autor, gerador (use "Professor"; a skill `/professor` no repo é a implementação, lineage `teach-v2`).

**Desenvolvedor**:
O agente que, a pedido do Professor, cria um Esboço e o entrega pronto para uso.
É o oposto do Professor no eixo do conhecimento: conhece a Plataforma (Astro) e
constrói o Esboço nos trilhos. Abre a Solicitação de Componente quando o Professor
sinaliza que o Esboço é reutilizável.
_Avoid_: subagente-ponte, dev, programador.

**Plataforma**:
Este repositório: Astro, a implementação do Catálogo, o build e a publicação no
GitHub Pages. Renderiza e valida o MDX que o Professor escreve; o Professor nunca
a enxerga.
_Avoid_: site, app, renderer, frontend.

**Frontmatter**:
Os metadados de primeira classe de uma Aula (título, ordem, domínio, resumo,
pré-requisitos, duração). Indexável e consultável; é o que, no futuro, viraria
as colunas de uma Aula por usuário num banco.
_Avoid_: cabeçalho, meta, header.
