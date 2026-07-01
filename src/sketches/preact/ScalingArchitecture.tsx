import { h } from "preact";

// Esboço (aws/0005), ported to Preact: the elastic web architecture — users →
// load balancer → EC2 instances across AZs, with Auto Scaling adjusting count.
// Semantic output 1:1 with the `.astro` original — `data-inst` markers the Seam B
// test counts. Authored with `h()`; styles in src/styles/sketches.css.
export interface ArchInstance {
  /** Instance label, e.g. "EC2". */
  label: string;
  /** Availability Zone caption, e.g. "AZ-a". */
  az: string;
}

interface Props {
  usersLabel?: string;
  elbLabel?: string;
  instances?: ArchInstance[];
  asgNote?: string;
}

const DEFAULT_INSTANCES: ArchInstance[] = [
  { label: "EC2", az: "AZ-a" },
  { label: "EC2", az: "AZ-b" },
  { label: "EC2", az: "AZ-c" },
];

export function ScalingArchitecture({
  usersLabel = "🌐 usuários",
  elbLabel = "Elastic Load Balancing",
  instances = DEFAULT_INSTANCES,
  asgNote = "⤴ Auto Scaling adiciona/remove instâncias conforme a demanda (mín · desejado · máx)",
}: Props) {
  return h(
    "div",
    { class: "arch" },
    h("div", { class: "arch__users" }, usersLabel),
    h("div", { class: "arch__arrows", "aria-hidden": "true" }, "↓"),
    h("div", { class: "arch__elb" }, elbLabel),
    h("div", { class: "arch__arrows", "aria-hidden": "true" }, "↙ ↓ ↘"),
    h(
      "div",
      { class: "arch__row" },
      instances.map((inst) =>
        h(
          "div",
          { class: "arch__inst", "data-inst": true },
          inst.label,
          h("span", null, inst.az),
        ),
      ),
    ),
    h("div", { class: "arch__asg" }, asgNote),
  );
}
