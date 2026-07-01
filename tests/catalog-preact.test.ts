import { test, expect } from "vitest";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";

import { MissionBox } from "../src/components/preact/MissionBox";
import { AskBox } from "../src/components/preact/AskBox";
import { Sources } from "../src/components/preact/Sources";
import { Nav } from "../src/components/preact/Nav";
import { CompareCards } from "../src/components/preact/CompareCards";
import { Quiz } from "../src/components/preact/Quiz";

// Seam B (Preact successor of the Container-API Catalog cases in render.test.ts):
// each Component rendered to a string, asserting its *semantic* output — roles,
// derived ids/numbering, the markers the Quiz island grades on — not internal
// form. This is the per-Component coverage that survives the move off `.astro`.

// --- MissionBox ---------------------------------------------------------------

test("MissionBox frames the body as a note and shows the meta line", () => {
  const html = renderToString(
    h(MissionBox, { meta: "~6 min" }, "Por que esta Aula importa."),
  );

  expect(html).toContain('role="note"');
  expect(html).toContain("Por que esta Aula?"); // default title
  expect(html).toContain("Por que esta Aula importa.");
  expect(html).toContain("mission__meta");
  expect(html).toContain("~6 min");
});

test("MissionBox omits the meta line when no meta is given", () => {
  const html = renderToString(h(MissionBox, null, "Só o corpo."));

  expect(html).toContain("Só o corpo.");
  expect(html).not.toContain("mission__meta");
});

// --- AskBox -------------------------------------------------------------------

test("AskBox closes with the production-task role and title", () => {
  const html = renderToString(
    h(AskBox, { title: "Sua vez" }, "Descreva com suas palavras."),
  );

  expect(html).toContain('role="note"');
  expect(html).toContain("Sua vez");
  expect(html).toContain("Descreva com suas palavras.");
});

// --- Sources ------------------------------------------------------------------

test("Sources renders footnotes with derived numbering and ids", () => {
  const html = renderToString(
    h(Sources, {
      items: [
        { label: "Sem link" },
        { label: "Com link", href: "https://example.com/" },
      ],
    }),
  );

  // Ordered list → numbering derived from order, not hand-typed.
  expect(html).toContain("<ol");
  // Derived ids the prose can link to.
  expect(html).toContain('id="r1"');
  expect(html).toContain('id="r2"');
  expect(html).toContain("Sem link");
  expect(html).toContain('href="https://example.com/"');
});

// --- Nav ----------------------------------------------------------------------

test("Nav renders prev/next links with their semantic rel", () => {
  const html = renderToString(
    h(Nav, {
      prev: { href: "/a/", label: "Anterior", sub: "Aula 1" },
      next: { href: "/c/", label: "Próxima", sub: "Aula 3" },
    }),
  );

  expect(html).toContain('rel="prev"');
  expect(html).toContain('href="/a/"');
  expect(html).toContain("Anterior");
  expect(html).toContain('rel="next"');
  expect(html).toContain('href="/c/"');
  expect(html).toContain("Próxima");
});

test("Nav omits the missing end (first Lesson has no prev)", () => {
  const html = renderToString(h(Nav, { next: { href: "/c/", label: "Próxima" } }));

  expect(html).toContain('rel="next"');
  expect(html).not.toContain('rel="prev"');
});

// --- CompareCards -------------------------------------------------------------

test("CompareCards renders one card per option and marks the highlight", () => {
  const html = renderToString(
    h(CompareCards, {
      cards: [
        { tag: "EBS · block", label: "Bloco", description: "Um HD cru." },
        { tag: "EFS · file", label: "Arquivo", description: "Compartilhado." },
        { tag: "S3 · object", label: "Objeto", description: "Por key.", highlight: true },
      ],
    }),
  );

  expect((html.match(/role="listitem"/g) ?? []).length).toBe(3);
  expect(html).toContain("Bloco");
  expect(html).toContain("Objeto");
  expect(html).toContain("EBS · block");
  expect((html.match(/data-highlight="true"/g) ?? []).length).toBe(1);
  expect((html.match(/data-highlight="false"/g) ?? []).length).toBe(2);
});

test("CompareCards is not tied to three — it renders any N", () => {
  const html = renderToString(
    h(CompareCards, { cards: [{ label: "A" }, { label: "B" }] }),
  );

  expect((html.match(/role="listitem"/g) ?? []).length).toBe(2);
});

// --- Quiz (semantic output; interactivity lives in quiz-client.ts) ------------

const QUIZ_QUESTIONS = [
  {
    prompt: "Onde guardar uploads de usuários atrás de um Auto Scaling Group?",
    options: [
      "No disco EBS da instância",
      "No Amazon S3 (armazenamento de objetos)",
      "Em variáveis de ambiente",
    ],
    answer: 1,
    explanation: "O EBS morre com a instância; o S3 é independente da computação.",
  },
  {
    prompt: "Em que escopo o nome de um bucket S3 precisa ser único?",
    options: ["Na sua conta", "No mundo inteiro", "Na região"],
    answer: 1,
  },
];

test("Quiz exposes every alternative as a selectable option", () => {
  const html = renderToString(h(Quiz, { questions: QUIZ_QUESTIONS }));

  // One option per alternative across both questions (3 + 3 = 6).
  expect((html.match(/class="quiz__opt"/g) ?? []).length).toBe(6);
  expect(html).toContain("No Amazon S3 (armazenamento de objetos)");
  expect(html).toContain("No mundo inteiro");
});

test("Quiz marks the correct alternative in the markup", () => {
  const html = renderToString(h(Quiz, { questions: QUIZ_QUESTIONS }));

  // Exactly one correct option per question; the rest marked false.
  expect((html.match(/data-correct="true"/g) ?? []).length).toBe(2);
  expect((html.match(/data-correct="false"/g) ?? []).length).toBe(4);
});

test("Quiz ships the prompts, explanation and the data the island grades on", () => {
  const html = renderToString(h(Quiz, { questions: QUIZ_QUESTIONS, title: "Teste de S3" }));

  expect(html).toContain("Teste de S3");
  expect(html).toContain("Onde guardar uploads de usuários");
  // The correct-answer index travels with each question for the island to read.
  expect((html.match(/data-answer="1"/g) ?? []).length).toBe(2);
  expect(html).toContain("O EBS morre com a instância"); // explanation in markup
  expect(html).toContain("data-score"); // tally region
  // The island wiring is external; the Component emits no inline handlers.
  expect(html).not.toContain("onclick");
});
