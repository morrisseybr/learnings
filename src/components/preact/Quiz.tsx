import { h } from "preact";

// Quiz, ported to Preact: the interactive island, data-driven — the Professor
// declares questions, alternatives, the correct answer and an explanation, and
// never writes JS. The component renders only the *static* markup (the same
// `data-quiz` / `data-answer` / `data-correct` attributes as the `.astro`
// original); the interactivity is a single framework-agnostic script
// (src/lib/quiz-client.ts) shipped by the Lesson shell, which wires every
// `[data-quiz]` on the page. Splitting render from behaviour is what lets the
// island survive the move to runtime MDX, where there is no Astro hydration.
// Authored with `h()`; styles are global in src/styles/catalog.css.
export interface QuizQuestion {
  /** The question text. */
  prompt: string;
  /** The alternatives, in display order. */
  options: string[];
  /** Zero-based index into `options` of the correct alternative. */
  answer: number;
  /** Shown as feedback once the question is answered. */
  explanation?: string;
}

interface Props {
  questions: QuizQuestion[];
  title?: string;
}

export function Quiz({ questions, title = "Teste rápido — feedback na hora" }: Props) {
  const total = questions.length;
  return h(
    "section",
    { class: "quiz", "data-quiz": true, "data-total": total, "aria-label": title },
    h("h3", { class: "quiz__title" }, `✅ ${title}`),
    questions.map((q, qi) =>
      h(
        "div",
        { class: "quiz__q", "data-answer": String(q.answer) },
        h("div", { class: "quiz__num" }, `Questão ${qi + 1} de ${total}`),
        h("p", { class: "quiz__prompt" }, q.prompt),
        h(
          "div",
          { class: "quiz__opts", role: "group", "aria-label": `Questão ${qi + 1}` },
          q.options.map((opt, oi) =>
            h(
              "button",
              {
                type: "button",
                class: "quiz__opt",
                "data-index": String(oi),
                "data-correct": oi === q.answer ? "true" : "false",
              },
              opt,
            ),
          ),
        ),
        h("p", { class: "quiz__fb", "data-explanation": true, hidden: true }, q.explanation ?? ""),
      ),
    ),
    h("p", { class: "quiz__score", "data-score": true, hidden: true }),
  );
}
