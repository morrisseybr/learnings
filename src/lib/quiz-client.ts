// The Quiz island's behaviour, split out from the (now Preact) Quiz Component so
// it can ship as a single framework-agnostic script the Lesson shell loads once.
// The Quiz Component renders only static markup at SSR time; this wires every
// `[data-quiz]` on the page — each instance grades and scores on its own, reading
// the `data-answer` / `data-correct` / `data-explanation` markers the Component
// emits. No Preact, no hydration: plain DOM, so it works for runtime-rendered MDX
// where Astro islands are unavailable. Verbatim port of Quiz.astro's <script>.
export function wireQuizzes(root: ParentNode = document): void {
  for (const quiz of root.querySelectorAll<HTMLElement>("[data-quiz]")) {
    const questions = quiz.querySelectorAll<HTMLElement>(".quiz__q");
    const total = questions.length;
    const scoreEl = quiz.querySelector<HTMLElement>("[data-score]");
    let answered = 0;
    let correct = 0;

    questions.forEach((q) => {
      const answer = Number(q.dataset.answer);
      const opts = q.querySelectorAll<HTMLButtonElement>(".quiz__opt");
      const fb = q.querySelector<HTMLElement>("[data-explanation]");
      const exp = fb?.textContent?.trim() ?? "";

      opts.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (q.dataset.done) return;
          q.dataset.done = "1";
          answered++;

          const picked = Number(btn.dataset.index);
          opts.forEach((b) => (b.disabled = true));
          opts[answer]?.classList.add("quiz__opt--correct");

          if (fb) fb.hidden = false;
          if (picked === answer) {
            correct++;
            if (fb) {
              fb.className = "quiz__fb quiz__fb--ok";
              fb.textContent = `✔️ Correto! ${exp}`.trimEnd();
            }
          } else {
            btn.classList.add("quiz__opt--wrong");
            if (fb) {
              fb.className = "quiz__fb quiz__fb--no";
              fb.textContent = `✗ Quase. ${exp}`.trimEnd();
            }
          }

          if (answered === total && scoreEl) {
            const msg =
              correct === total
                ? "🏆 Gabaritou!"
                : correct >= total - 1
                  ? "💪 Quase lá — reveja o ponto que escapou."
                  : "📚 Releia e tente de novo.";
            scoreEl.hidden = false;
            scoreEl.textContent = `Resultado: ${correct}/${total} — ${msg}`;
            scoreEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      });
    });
  }
}

wireQuizzes();
