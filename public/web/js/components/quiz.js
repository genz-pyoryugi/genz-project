// ===== 퀴즈 =====
// data: [{ q, options: [보기...], answer: 정답 번호(0부터), explain }]
// 한 문제씩 풀고, 고르는 즉시 정답/해설을 보여준 뒤 마지막에 점수를 보여준다.
// 진행 상태는 ctx.state에 두어 소주제를 오가도 이어서 풀 수 있다.
function renderQuiz(questions, ctx) {
  const state = ctx.state;
  if (state.index == null) Object.assign(state, { index: 0, score: 0, picked: null });

  const el = h("div", { class: "quiz" });

  function render() {
    if (state.index >= questions.length) renderResult();
    else renderQuestion();
  }

  function renderQuestion() {
    const item = questions[state.index];
    const isLast = state.index === questions.length - 1;

    const feedback = h("p", { class: "quiz__feedback", "aria-live": "polite" });
    const nextBtn = h("button", {
      class: "btn quiz__next",
      type: "button",
      hidden: true,
      onClick: () => {
        state.index++;
        state.picked = null;
        render();
      },
    }, isLast ? "결과 보기" : "다음 문제");

    const options = item.options.map((text, i) =>
      h("button", { class: "quiz__option", type: "button", onClick: () => choose(i) },
        h("span", { class: "quiz__mark", "aria-hidden": "true" }, "ABCDE"[i]),
        h("span", null, text)));

    // 고른 답 표시 (다시 돌아왔을 때도 같은 화면을 보여줌)
    function showAnswer(i) {
      const correct = i === item.answer;
      options.forEach((btn, j) => {
        btn.disabled = true;
        if (j === item.answer) btn.classList.add("is-correct");
        else if (j === i) btn.classList.add("is-wrong");
      });
      feedback.className = `quiz__feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.textContent = `${correct ? "정답이에요!" : "아쉬워요."} ${item.explain}`;
      nextBtn.hidden = false;
    }

    function choose(i) {
      state.picked = i;
      if (i === item.answer) state.score++;
      showAnswer(i);
      nextBtn.focus();
    }

    el.replaceChildren(
      h("div", { class: "quiz__head" },
        h("span", { class: "quiz__step" }, `Q${state.index + 1} / ${questions.length}`),
        h("div", { class: "quiz__progress" },
          h("span", { style: `width: ${(state.index / questions.length) * 100}%` }))),
      h("h3", { class: "quiz__question" }, item.q),
      h("div", { class: "quiz__options" }, options),
      feedback,
      nextBtn);

    if (state.picked != null) showAnswer(state.picked);
  }

  function renderResult() {
    const total = questions.length;
    const comment =
      state.score === total ? "완벽해요! 이제 표류하지 않겠어요."
      : state.score >= total / 2 ? "좋아요! 조금만 더 익혀볼까요?"
      : "카드뉴스를 한 번 더 보고 다시 도전해요.";

    el.replaceChildren(
      h("div", { class: "quiz__result" },
        h("p", { class: "quiz__score" }, `${total}문제 중 `, h("strong", null, String(state.score)), "개 정답"),
        h("p", { class: "quiz__comment" }, comment),
        h("button", {
          class: "btn",
          type: "button",
          onClick: () => {
            Object.assign(state, { index: 0, score: 0, picked: null });
            render();
          },
        }, "다시 풀기")));
  }

  render();
  return { el, destroy() {} };
}

// Supabase 접근은 Next.js API가 담당한다. 브라우저에 별도 키를 넣지 않는다.
Components.quiz = (_examples, ctx) => {
  const el = h("div", { class: "quiz", "aria-live": "polite" });
  const controller = new AbortController();
  let activeQuiz = null;
  const normalize = (value) => String(value || "").replace(/\s/g, "");

  async function load() {
    el.replaceChildren(h("p", null, "퀴즈를 불러오는 중이에요…"));
    try {
      const response = await fetch("/api/quizzes", {
        signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error("query failed");
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("invalid response");
      const questions = rows
        .filter((row) => normalize(row.category) === normalize(ctx.category))
        .map((row) => {
          const rawOptions = [row.option1, row.option2, row.option3, row.option4, row.option5];
          const match = String(row.answer || "").trim().match(/^선택지\s*([1-5])$/);
          const correctIndex = match ? Number(match[1]) - 1 : -1;
          const populated = rawOptions.map((text, index) => ({ text, index }))
            .filter(({ text }) => typeof text === "string" && text.trim());
          return {
            id: row.id, q: row.question,
            options: populated.map(({ text }) => text),
            answer: populated.findIndex(({ index }) => index === correctIndex),
            explain: row.explanation || "",
          };
        })
        .filter((item) => typeof item.q === "string" && item.q.trim() && item.options.length >= 2 && item.answer >= 0);
      if (controller.signal.aborted) return;
      if (!questions.length) {
        el.replaceChildren(h("p", null, "이 카테고리에 등록된 퀴즈가 아직 없어요."));
        return;
      }
      const signature = JSON.stringify(questions);
      if (ctx.state.signature !== signature) {
        Object.assign(ctx.state, { signature, index: 0, score: 0, picked: null });
      }
      activeQuiz = renderQuiz(questions, ctx);
      el.replaceChildren(activeQuiz.el);
    } catch (error) {
      if (controller.signal.aborted) return;
      el.replaceChildren(
        h("p", null, "퀴즈를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
        h("button", { class: "btn", type: "button", onClick: load }, "다시 시도"));
    }
  }
  load();
  return { el, destroy() { controller.abort(); activeQuiz?.destroy(); } };
};
