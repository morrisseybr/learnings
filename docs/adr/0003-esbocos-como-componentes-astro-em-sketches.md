---
status: accepted (refina ADR 0002, refinada pela ADR 0005)
---

# Esboços como Componentes Astro em `src/sketches/`, promovidos ao Catálogo

> **Refinada pela [ADR 0005](./0005-aulas-no-firestore-com-astro-ssr.md):** com o
> render em runtime, o Esboço passa de `.astro` para **Preact**, e o
> `registry.ts` morre — o binding Aula→Esboço vira o campo `esbocos[]` no doc da
> Aula no Firestore. O que define um Esboço (uso único, ligado à Aula, não
> anunciado, promovível) e o caminho de promoção descritos abaixo seguem valendo;
> muda só o mecanismo (linguagem do Esboço e onde mora a ligação).

Um **Esboço** é implementado como um **Componente Astro** (`.astro`), authored
pelo **Desenvolvedor** em `src/sketches/`, e ligado à sua Aula por um registry
(`src/sketches/registry.ts`) que mapeia a Aula → os Esboços que ela pode usar. A
rota da Aula injeta esses Esboços junto do Catálogo (`{ ...catalog, ...sketchesFor(id) }`),
então o **Professor** usa `<NomeDoEsboço />` no MDX exatamente como usa um
Componente do Catálogo — sem `import`, sem saber Astro. O guia do Catálogo é
gerado só de `src/components/`, então os Esboços **não** aparecem na lista de
Componentes anunciados; o Desenvolvedor entrega o nome do Esboço ao Professor
diretamente. Quando o Professor sinaliza um Esboço como reutilizável, uma
Solicitação de Componente (issue `component-request`) é aberta e um humano
generaliza o Esboço e o **move de `src/sketches/` para `src/components/`**,
onde ele entra no Catálogo e passa a ser anunciado.

**Refina a [ADR 0002](./0002-catalogo-fechado-com-esbocos-em-trilhos.md):** lá o
Esboço era "JS baunilha, não uma island do Astro". Isso é substituído — o Esboço
agora é uma island do Astro como qualquer Componente; o que distingue Esboço de
Componente passa a ser **localização e alcance** (`src/sketches/`, uso único,
ligado a uma Aula, não anunciado) vs (`src/components/`, geral, reutilizável,
anunciado no guia). Os **trilhos** de ADR 0002 continuam valendo: design tokens,
escopado, sem bibliotecas externas/CDN/rede (preserva o offline do PWA).

**Considered options:**

- **Componente "coringa" que recebe HTML auto-contido (string) e renderiza via
  `set:html`.** Rejeitado: HTML injetado como string não executa `<script>`
  (comportamento de `innerHTML`), e colar HTML/CSS/JS cru como filhos no MDX
  quebra o parser JSX (`{`, `<`, `&&`). Tornaria Esboços interativos inviáveis
  sem um runtime de re-execução e perderia o escopo automático de estilo.
- **Ligação global dos Esboços (espelhando `catalog.ts`).** Rejeitado: um Esboço
  é de uso único; a ligação por Aula evita colisão de nomes entre Aulas e
  documenta a posse. O custo (uma linha no registry por Esboço) é do
  Desenvolvedor, não do Professor.

**Consequência:** o Desenvolvedor agora escreve Astro (antes fora de escopo); o
Professor continua cego à Plataforma. Promover um Esboço a Componente é uma
mudança deliberada (mover arquivo + entrar no Catálogo + refatorar Aulas), não
automática.
