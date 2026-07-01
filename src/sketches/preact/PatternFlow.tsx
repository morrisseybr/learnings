import { h, Fragment } from "preact";

// Esboço (claude/0002), ported to Preact: a labeled flow of nodes for the
// workflow patterns, reused once per pattern. A stage is a single node (linear)
// or a column of nodes (a branch / fan-out); stages are joined by arrows. Node
// variants map to on-brand treatments (`alt` = accent, `gray` = muted). Semantic
// output 1:1 with the `.astro` original — `data-node` / `data-variant` markers
// the Seam B test reads. Authored with `h()`; styles in src/styles/sketches.css.
export interface FlowNode {
  label: string;
  /** Visual treatment: default (neutral), "alt" (accent), "gray" (muted). */
  variant?: "default" | "alt" | "gray";
}

// A stage is one or more nodes: a single node is the linear case, several nodes
// is a branch / fan-out (rendered as a column). `arrow` overrides the "→" that
// joins this stage to the previous one (e.g. "↺" for the evaluator loop).
export interface FlowStage {
  nodes: FlowNode[];
  arrow?: string;
}

interface Props {
  stages: FlowStage[];
}

export function PatternFlow({ stages }: Props) {
  return h(
    "div",
    { class: "flow" },
    stages.map((stage, i) =>
      h(
        Fragment,
        null,
        i > 0
          ? h("span", { class: "flow__arr", "aria-hidden": "true" }, stage.arrow ?? "→")
          : null,
        h(
          "span",
          {
            class: stage.nodes.length > 1 ? "flow__stage flow__stage--col" : "flow__stage",
          },
          stage.nodes.map((node) =>
            h(
              "span",
              {
                class: `flow__node flow__node--${node.variant ?? "default"}`,
                "data-node": true,
                "data-variant": node.variant ?? "default",
              },
              node.label,
            ),
          ),
        ),
      ),
    ),
  );
}
