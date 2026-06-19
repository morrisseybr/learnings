# Glossário AWS / CLF-C02

Vocabulário canônico. Toda lição deve usar estes termos de forma consistente.

## Fundamentos de nuvem (Domínio 1)
- **Cloud computing** — entrega de recursos de TI (compute, storage, banco, rede) sob demanda
  pela internet, com pagamento por uso (pay-as-you-go).
- **On-premises (on-prem)** — infraestrutura própria, rodando no seu data center/sala de servidores.
- **CapEx (Capital Expenditure)** — gasto de capital fixo e adiantado (comprar servidores). Modelo
  clássico de data center próprio.
- **OpEx (Operational Expenditure)** — gasto operacional variável, pago conforme o uso. Modelo da nuvem.
- **Elasticidade** — capacidade de aumentar/diminuir recursos automaticamente conforme a demanda.
- **Escalabilidade** — capacidade de crescer (vertical = máquina maior; horizontal = mais máquinas).
- **Agilidade** — recursos disponíveis em minutos, não semanas; reduz custo de experimentar.
- **Economia de escala** — preço menor por unidade porque a AWS agrega o uso de muitos clientes.

### As 6 vantagens da computação em nuvem (canônico AWS — cai na prova)
1. Trocar despesa fixa (CapEx) por despesa variável (OpEx).
2. Beneficiar-se de economias de escala massivas.
3. Parar de adivinhar capacidade.
4. Aumentar velocidade e agilidade.
5. Parar de gastar dinheiro mantendo data centers.
6. Tornar-se global em minutos.

**Mnemônico do Samuel — "3 pares":** Financeiro (1,2) · Flexibilidade (3,4) · Foco & alcance (5,6).

### Modelos de serviço
- **IaaS (Infrastructure as a Service)** — você gerencia SO/apps; AWS fornece a infra (ex.: EC2).
- **PaaS (Platform as a Service)** — você gerencia só o app; plataforma cuida do resto (ex.: Elastic Beanstalk).
- **SaaS (Software as a Service)** — software pronto, você só usa (ex.: Gmail, Amazon WorkMail).

### Modelos de implantação
- **Cloud (all-in)** — tudo na nuvem.
- **Híbrido (Hybrid)** — parte na nuvem, parte on-premises.
- **On-premises / Private** — tudo no seu data center.

## Geografia AWS (Domínio 1/3)
- **Region (Região)** — área geográfica com vários data centers (ex.: sa-east-1 = São Paulo).
- **Availability Zone (AZ)** — um ou mais data centers isolados dentro de uma região.
- **Edge Location** — ponto de presença para entrega de conteúdo (CDN / CloudFront), perto do usuário.

## Compute — Amazon EC2 (Domínio 3)
- **Amazon EC2 (Elastic Compute Cloud)** — servidores virtuais redimensionáveis (instâncias) sob
  demanda. É IaaS: AWS cuida do hardware, você cuida do SO/patches/app.
- **Instância** — uma máquina virtual EC2 em execução.
- **AMI (Amazon Machine Image)** — imagem (SO + config) usada como molde para criar instâncias.
- **Família de instância** — categoria otimizada: propósito geral, otimizada para compute,
  para memória, para storage, e computação acelerada (GPU).

### Modelos de compra do EC2 (muito cobrado — casar carga com modelo)
- **On-Demand** — paga por hora/segundo, sem compromisso. Carga imprevisível/curta. Padrão.
- **Savings Plans** — compromisso de gasto/hora por 1 ou 3 anos; flexível. Até 72% off. Uso estável.
- **Reserved Instances (RI)** — reserva tipo específico por 1-3 anos; menos flexível. Até 72% off.
  Carga constante 24/7 e previsível.
- **Spot Instances** — capacidade ociosa baratíssima (até 90% off), mas pode ser **interrompida**.
  Cargas tolerantes a falha (batch, render, CI).
- **Dedicated Host** — servidor físico inteiro só seu. Licença atrelada a hardware / isolamento físico.

### Savings Plans vs Reserved Instances (distinção de prova)
- Ambos: compromisso de 1 ou 3 anos, até ~72% off. A diferença é **com o que você se compromete**:
  - **Savings Plans** = compromisso de **gasto por hora** (US$/h). Flexível: cobre troca de
    família/tamanho/região e até Lambda/Fargate (tipo *Compute*). É o padrão recomendado.
  - **Reserved Instances** = reserva um **tipo específico** de instância. Menos flexível, mas é o
    único que oferece **reserva de capacidade** (garante instância disponível numa AZ específica).
  - Regra: flexibilidade/uso estável → Savings Plans; garantir capacidade numa AZ → RI.

## Elasticidade na prática (Domínio 3)
- **Elastic Load Balancing (ELB)** — distribui o tráfego de entrada entre várias instâncias (alvos),
  em uma ou mais AZs. Faz **health checks** e só roteia para instâncias saudáveis → mais
  disponibilidade e tolerância a falha. Tipos: **ALB** (camada 7, HTTP/HTTPS), **NLB** (camada 4,
  TCP, altíssima performance), GWLB e CLB (legado).
- **Amazon EC2 Auto Scaling** — ajusta automaticamente o **número de instâncias** conforme a demanda.
  *Scale out* (adiciona) na alta, *scale in* (remove) na baixa. É **escala horizontal**.
  Definido por capacidade **mínima / desejada / máxima** + políticas de escala (ex.: target tracking).
- **ELB + Auto Scaling juntos** = o tier web clássico, elástico e altamente disponível: o Auto Scaling
  muda *quantas* instâncias existem; o ELB espalha o tráfego entre elas (em várias AZs). Realiza
  "parar de adivinhar capacidade" e a **elasticidade**.

## Camadas de rede — modelo OSI (base para ALB vs NLB)
- **Modelo OSI** — modelo de referência: 7 camadas de abstração (cada uma esconde a de baixo). A
  mensagem **desce embrulhando** no remetente e **sobe desembrulhando** no destino (encapsulamento).
  **Para a prova CLF-C02 só importam L4 e L7**; o resto é fluência fundamental.

  As 7 camadas, cada uma = a pergunta que responde (de cima para baixo):
  | # | Camada | Pergunta | Exemplos · AWS |
  |---|--------|----------|----------------|
  | 7 | Aplicação | "Qual protocolo da app?" | HTTP/DNS/SMTP · ALB, API Gateway, Route 53 |
  | 6 | Apresentação | "Que formato? Cifrado?" | TLS, UTF-8, JPEG · ACM (HTTPS) |
  | 5 | Sessão | "Quem mantém o diálogo?" | controle de sessão (quase sempre fundida no app) |
  | 4 | Transporte | "Confiável ou rápido? Que porta?" | TCP/UDP · NLB, Security Groups, NACLs |
  | 3 | Rede | "Por qual rota, entre redes?" | IP, roteamento · VPC, route tables |
  | 2 | Enlace | "Próximo salto no segmento?" | MAC, switches, Ethernet · abstraído pela AWS |
  | 1 | Física | "Bits viram sinais como?" | cabos, fibra, rádio · hardware do data center |

- **Encapsulamento** — cada camada embrulha a de cima (um `GET /x` (L7) viaja dentro de TCP:443 (L4)
  dentro de um pacote IP (L3)…).
- **OSI vs TCP/IP** — o real (TCP/IP) agrupa em ~4 camadas: Aplicação (OSI 7·6·5) · Transporte (4) ·
  Internet (3) · Enlace/Acesso (2·1). "Camada 4" e "camada 7" sobrevivem porque existem nos dois.
- **Cloud e as camadas** — on-prem você cuida de L1-L2; na AWS opera da **L3 (VPC) para cima**.
- **Camada 4 (transporte)** — TCP/UDP: **IP + porta**, encaminha **sem abrir/ler** o conteúdo.
  Analogia: ler só o **endereço do envelope**.
- **Camada 7 (aplicação)** — HTTP/HTTPS: enxerga **URL, host, cabeçalhos, cookies**. Analogia: **abrir
  o envelope e ler a carta** para decidir.
- **ALB = camada 7** → roteia por conteúdo (caminho da URL, host); ideal para web/HTTP.
- **NLB = camada 4** → encaminha por IP/porta (TCP/UDP); latência mínima, throughput altíssimo, IP estático.
  Regra: precisa ler o HTTP para decidir → ALB; só velocidade bruta → NLB. Não existe "melhor", existe
  o certo para a carga.

## Termos a definir nas próximas lições
- Shared Responsibility Model, IAM, S3, VPC, RDS, Free Tier, Well-Architected.
  (Adicionar aqui conforme as lições forem criadas.)
