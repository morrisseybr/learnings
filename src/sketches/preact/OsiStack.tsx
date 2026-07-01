import { h } from "preact";

// Esboço (aws/0006), ported to Preact: the 7-layer OSI stack, each framed as a
// question; the two that decide the load balancer (L7 → ALB, L4 → NLB) are `hot`.
// Ships defaults so the Aula references it bare. Semantic output 1:1 with the
// `.astro` original — `data-layer` / `data-hot` markers the Seam B test counts.
// Authored with `h()`; styles in src/styles/sketches.css.
export interface OsiLayer {
  /** Layer number, 7 down to 1. */
  n: number;
  /** Layer name, e.g. "Aplicação". */
  name: string;
  /** The question the layer answers. */
  question: string;
  /** Protocols / AWS examples. */
  examples: string;
  /** Optional load-balancer tag, e.g. "ALB". */
  tag?: string;
  /** Highlights the layer (the two that matter for load balancing). */
  hot?: boolean;
}

interface Props {
  layers?: OsiLayer[];
}

const DEFAULT_LAYERS: OsiLayer[] = [
  {
    n: 7,
    name: "Aplicação",
    tag: "ALB",
    hot: true,
    question: '"Qual protocolo da aplicação e o que o usuário quer?"',
    examples: "HTTP/HTTPS, DNS, SMTP, SSH · AWS: ALB, API Gateway, CloudFront, Route 53",
  },
  {
    n: 6,
    name: "Apresentação",
    question: '"Em que formato? Cifrado? Comprimido?"',
    examples: "TLS/SSL, codificação (UTF-8), JPEG · AWS: certificados via ACM (HTTPS)",
  },
  {
    n: 5,
    name: "Sessão",
    question: '"Quem abre, mantém e fecha a conversa?"',
    examples: "Controle de diálogo (na prática, quase sempre fundida no app)",
  },
  {
    n: 4,
    name: "Transporte",
    tag: "NLB",
    hot: true,
    question: '"Entrega confiável ou rápida? Para qual porta/processo?"',
    examples: "TCP (confiável) vs UDP (rápido) + portas · AWS: NLB, Security Groups, NACLs",
  },
  {
    n: 3,
    name: "Rede",
    question: '"Por qual rota chego ao destino, entre redes diferentes?"',
    examples: "IP, roteamento, routers · AWS: VPC, sub-redes, route tables",
  },
  {
    n: 2,
    name: "Enlace (Data Link)",
    question: '"Como entrego ao próximo salto no mesmo segmento?"',
    examples: "MAC, switches, Ethernet, Wi-Fi, ARP · AWS: abstraído",
  },
  {
    n: 1,
    name: "Física",
    question: '"Como bits viram sinais no mundo real?"',
    examples: "Cabos, fibra, rádio, voltagem · AWS: hardware do data center (você nunca toca)",
  },
];

export function OsiStack({ layers = DEFAULT_LAYERS }: Props) {
  return h(
    "div",
    { class: "osi" },
    layers.map((layer) =>
      h(
        "div",
        {
          class: layer.hot ? "osi__layer osi__layer--hot" : "osi__layer",
          "data-layer": true,
          "data-hot": layer.hot ? "true" : "false",
        },
        h("span", { class: "osi__n" }, layer.n),
        h(
          "div",
          { class: "osi__body" },
          h(
            "span",
            { class: "osi__name" },
            layer.name,
            layer.tag ? h("span", { class: "osi__tag" }, layer.tag) : null,
          ),
          h("div", { class: "osi__q" }, layer.question),
          h("div", { class: "osi__ex" }, layer.examples),
        ),
      ),
    ),
  );
}
