// ===== 퀴즈 =====
// data: [{ q, options: [보기...], answer: 정답 번호(0부터), explain }]
// 한 문제씩 풀고, 고르는 즉시 정답/해설을 보여준 뒤 마지막에 점수를 보여준다.
// 진행 상태는 ctx.state에 두어 소주제를 오가도 이어서 풀 수 있다.
Components.quiz = (questions, ctx) => {
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
        h("span", { class: "quiz__mark", "aria-hidden": "true" }, "ABCD"[i]),
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
};
