# Astro + MDX como plataforma de Aulas (substituindo o HTML artesanal)

> **Realizada pela [ADR 0005](./0005-aulas-no-firestore-com-astro-ssr.md):** o
> "Futuro previsto" abaixo aconteceu. As Aulas saíram dos arquivos para o
> Firestore, `output` foi de `static` para `server`, e o render passou de
> build-time para runtime (`@mdx-js/mdx`). O modelo estático/GitHub Pages e o
> glob loader de Content Collections deixam de valer; o seam fonte↔render que
> esta ADR manteve limpo é o que tornou a troca barata.

As Aulas deixam de ser HTML auto-contido escrito à mão e passam a ser **MDX**
renderizado por um projeto **Astro** (saída estática) na raiz do repositório. O
Astro lê as Aulas de `courses/*/lessons/*.mdx` via o glob loader de Content
Collections; o hub e as páginas de curso (hoje gerados por `scripts/build.js`)
viram rotas Astro. O `build.js` é aposentado e o modelo HTML antigo deixa de ser
suportado (migração completa, sem coexistência).

**Por quê:** o objetivo é tirar HTML/CSS/JS da cabeça da IA que gera as Aulas
(o Pedagogo) para ela focar no conteúdo. Um modelo de Componentes resolve isso.

**Alternativas rejeitadas:**

- **json-render (vercel-labs):** é um framework de _generative UI_ que renderiza
  JSON em **runtime no cliente** (React/Vue), voltado a streaming de UI gerada por
  IA. Aulas são documentos fixos de leitura, gerados-e-salvos; não precisam de
  runtime nem streaming. Adotá-lo trocaria um site estático por um bundle React.
- **Renderizador JSON→HTML caseiro:** manteria o zero-dependência, mas exigiria
  reconstruir à mão o que o Astro (Content Collections, MDX, islands, schema) dá
  pronto, e MDX é melhor que JSON para conteúdo majoritariamente prosa.

**Custo assumido:** perde-se a propriedade "Node puro / zero dependências" e o
`build.js` artesanal; entra um toolchain (npm, Vite via Astro). Investimento
aceito porque abre caminho para features dinâmicas (islands) e para um futuro
SSR.

**Futuro previsto (fora de escopo agora):** auth + Aulas por usuário vindas de um
banco. O Astro suporta via troca de `output: 'static' → 'server'` + adapter, e a
mesma coleção pode ser alimentada por um loader de banco em vez de arquivos. O
seam **fonte↔render** é mantido limpo desde já: os Componentes recebem _dados_,
nunca tocam o sistema de arquivos. Pedágio conhecido: MDX vindo de banco e
renderizado por requisição exige compilar MDX em runtime (ou pré-compilado).
