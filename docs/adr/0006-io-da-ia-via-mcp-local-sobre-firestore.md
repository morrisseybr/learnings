# I/O da IA via MCP local sobre o Firestore (dois service accounts)

O Professor e o Desenvolvedor deixam de ler/escrever Aulas no sistema de arquivos
e passam a operar por um **servidor MCP local** (stdio, no `.mcp.json` do repo)
que embrulha o **Firebase Admin SDK** e expõe ferramentas com a forma do domínio
(`list_courses`, `read_aula`, `write_aula`, …). O `write_aula` **valida com os
mesmos schemas zod do Catálogo** antes de gravar e devolve erros estruturados:
Componente inexistente ou props inválidas **bloqueiam** a escrita; um Esboço
listado em `esbocos[]` ainda sem deploy é só **aviso** (transitório, coberto pelo
fallback — [ADR 0005](./0005-aulas-no-firestore-com-astro-ssr.md)). Credenciais
separadas por papel: o MCP usa um service account **leitura/escrita**; o SSR usa
um **somente leitura**.

**Por quê:** dá à IA I/O remoto "tão tranquilo quanto local" sem quebrar a cegueira
de Plataforma do Professor — ele chama ferramentas com vocabulário de Aula, não
sabe que há Firestore por baixo. E fecha o loop de autoria: validar na escrita
troca o "gerar → subir → descobrir o erro só ao estudar" por correção imediata,
que era o atrito central a eliminar.

**Considered options (rejeitadas):**

- **CLI no repo** (chamada via Bash): mesmo efeito com menos infra, mas menos
  "nativo" que ferramentas MCP e sem o enquadramento de permissões do harness.
- **IA batendo na mesma API HTTP do app**: mais clunky (auth, `curl`) e exporia
  uma superfície de **escrita** na web, que hoje é só leitura pública.

**Consequência:** a escrita só existe pelo MCP local (sua máquina); a superfície
web permanece somente-leitura e pública. O scratch do Professor
(`learning-records/`, `reference/`) continua em arquivos por ora (Fase 1).
