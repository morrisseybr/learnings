---
status: accepted (realiza ADR 0001, refina ADR 0003)
---

# Aulas e Cursos no Firestore, renderizadas por Astro SSR (fim do modelo estático)

As Aulas e Cursos saem de `courses/*/lessons/*.mdx` (lidos no build) e passam a
viver no **Firestore**: `courses/{id}` + subcoleção `lessons/{id}`, com o
frontmatter como campos, o corpo como `mdx` (texto) e o binding de Esboços como
`esbocos: string[]`. O app deixa de ser estático e vira **Astro SSR**
(`output: 'server'`), hospedado no **Firebase App Hosting**. A rota lê o doc e
renderiza o MDX **em runtime** com o motor oficial **`@mdx-js/mdx` (`run`)** —
não o `@astrojs/mdx`, que é build-time — mapeando nome→Componente. Uma camada de
validação **zod + fallback** (inspirada no `json-render`) cobre, por bloco,
Componente desconhecido, Esboço ainda sem deploy e props inválidas. O shell
(`BaseLayout`/`LessonLayout`, hub, rotas de Curso, wiring PWA, rehype de tabela)
continua `.astro`; o SSR lê o Firestore com um service account **somente leitura**.

**Por quê:** realiza o "Futuro previsto" da [ADR 0001](./0001-astro-mdx-em-vez-de-html-artesanal.md)
— tira o loop gerar→commit→build→deploy do ciclo de estudo. A IA escreve a Aula
no banco e ela aparece **sem deploy**; só código novo (um Esboço) ainda exige
deploy, mantendo a fronteira da [ADR 0002](./0002-catalogo-fechado-com-esbocos-em-trilhos.md):
conteúdo é dado, Componente/Esboço é código empacotado, referenciado por nome.

**Refina a [ADR 0003](./0003-esbocos-como-componentes-astro-em-sketches.md):** o
`registry.ts` morre — o binding Aula→Esboço vira o campo `esbocos[]` no doc — e o
Esboço deixa de ser `.astro` e passa a **Preact** (alvo JSX do runtime MDX;
`.astro` não renderiza em runtime). O que define um Esboço (uso único, ligado à
Aula, não anunciado, promovível a Componente) continua valendo. Pela mesma razão,
o **Catálogo inteiro é reescrito em Preact**.

**Considered options (rejeitadas):**

- **Render no cliente** (Preact + `@mdx-js` no browser): daria offline quase de
  graça com o cache do Firestore, mas joga o compilador MDX no celular. Caiu
  quando o offline saiu de escopo (Fase 1) e a leveza no app pesou mais.
- **Precompilar na escrita** (guardar MDX→JS/HTML derivado): evita compilar no
  runtime, mas acopla um passo de build à escrita e guarda artefato derivado. O
  `run` em SSR é mais simples e sempre fresco (lê o banco vivo).
- **Next.js + `next-mdx-remote`**: caminho mais "abençoado" para render de MDX
  remoto, mas exigiria reescrever todo o shell, rotas e layouts. O ganho — uma lib
  em vez de um módulo fino de `run` — não pagava a migração maior. Usar
  `@mdx-js/mdx` direto **não é gambiarra**: é o mesmo motor que o `next-mdx-remote`
  embrulha.
- **Manter `.astro` no conteúdo** (Container API / renderizador caseiro): a
  Container API renderiza componentes já compilados, não strings MDX; manter
  `.astro` no corpo da Aula exigiria um compilador MDX→`.astro` caseiro. Descartado.

**Consequências:**

- **Offline sai da Fase 1** (a propriedade que justificava o PWA): o cliente não
  fala com o Firestore — o SSR fala —, então não há cache nativo. Reentra depois
  como camada aditiva de service worker.
- **Perde-se o histórico git por Aula** (Firestore é fonte única, sem
  coexistência: os `.mdx` viram semente de migração de uma vez e saem do caminho
  de leitura). Edições são raras; aceitável. Backup por export periódico do
  Firestore, não por commit-na-escrita (que re-emaranharia o loop evitado).
- O Catálogo `.astro` é reescrito em Preact; os testes Seam-B (Container API)
  viram testes de render Preact.
- O host passa a exigir o plano **Blaze** (App Hosting é Cloud Run por baixo).
- **Multiusuário/Auth** fica para uma fase futura; o modelo de campos por Aula já
  acomoda um `uid` sem retrabalho.
