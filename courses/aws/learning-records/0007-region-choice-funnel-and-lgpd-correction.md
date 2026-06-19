# 4 fatores de escolha de região recuperados via raciocínio + correção LGPD

## Recuperação do item falhado (escolha de região)
Na revisão de 18/06 Samuel falhou a lista nominal dos 4 fatores ("não lembro do
mnemônico C-P-S-P"). Declarou explicitamente que **mnemônicos de lista não funcionam
para ele**. Abandonamos o mnemônico e reensinamos como **funil de decisão / guard
clauses**: legal? → serviço existe? → latência boa? → preço aceitável?

Aplicado a um cenário do mundo dele (SaaS da Caravela, usuários BR, dados pessoais),
Samuel derivou **os 4 fatores naturalmente** e ainda foi além: separou workloads —
dados sob restrição de conformidade fixos numa região, serviços tolerantes a latência
em região mais próxima/barata. Item recuperado **via raciocínio, sem decorar lista**.

**Preferência de ensino confirmada (ver NOTES):** transformar listas em sequências
lógicas de decisão; nada de siglas/mnemônicos.

## Misconceição corrigida (alto valor — pegadinha de prova)
Samuel acreditava que **a LGPD obriga os dados a ficarem fisicamente no Brasil**.
Corrigido: a LGPD **permite transferência internacional** sob condições (adequação do
país, cláusulas contratuais, consentimento) — ela regula *como* transfere, não proíbe
sair do país. Residência/localização estrita vem de *outros* contextos (regras setoriais
do BACEN, dados governamentais, leis de outros países).

O conceito que ele aplicou ("conformidade pode fixar a Região") está correto; só a
justificativa estava errada. Framing de prova adotado: **"você escolhe a Região onde os
dados ficam e a AWS não os move para fora dela sem sua autorização"** — é assim que a
nuvem atende residência de dados.

**Evidência:** teach-back de cenário com os 4 fatores emergindo do raciocínio + nuance de
split de workload. Correção da LGPD aplicada na hora.

**Implicações:** D1 segue sólido. Item "4 fatores" volta como retrieval a frio em ~21/06.
Continua valendo: a Lição 05 (Auto Scaling/ELB) tem HTML gerado mas **ainda não foi
estudada** — próximo passo é o Samuel estudá-la, depois praticar. Conteúdo novo seguinte =
Lição 06 (Amazon S3).
