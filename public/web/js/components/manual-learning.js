// 기존 h() 도구로 데이터 기반의 시각 가이드와 선택형 학습을 렌더링한다.
function manualEvidence(page, ctx) {
  return h("a", { class: "learning-evidence", href: `${ctx.source.url}#page=${page}`, target: "_blank", rel: "noopener" }, `근거 · PDF ${page}쪽 ↗`);
}

Components.guide = (data, ctx) => {
  const scene = data.scene || { title: "솔직함에도 존중이 필요해요", speaker: "동료", question: "이 제안서, 어떻게 보세요?", reply: "핵심은 명확해요. 비교 자료를 더하면 판단하기 쉬울 것 같아요.", avoid: "당사자에게 말하지 않고 뒤에서만 평가하기", try: "잘된 점과 개선점을 당사자와 나누기", page: 2 };
  const boundary = data.boundary || { title: "자유를 지탱하는 책임", text: "자율성은 모든 규칙을 없앤다는 뜻이 아니에요. 괴롭힘·정보 유출을 금지하는 규칙은 필요하며, 위기나 큰 피해의 위험에는 매니저가 개입할 수 있어요.", page: 3 };
  const el = h("div", { class: "learning-guide" },
    h("div", { class: "learning-intro" }, h("span", null, "MANUAL GUIDE"),
      h("h3", null, data.title || "읽는 문화에서, 행동하는 문화로"),
      h("p", null, data.intro || "네 가지 원칙을 훑고, 일상에서 어떻게 쓰는지 살펴보세요.")),
    h("div", { class: "learning-principles" }, data.principles.map(item =>
      h("article", { class: "learning-principle" }, h("span", { class: "learning-symbol", "aria-hidden": "true" }, item.icon),
        h("h4", null, item.title), h("p", null, item.text)))),
    manualEvidence(data.page || 1, ctx),
    h("article", { class: "learning-scene" },
      h("p", { class: "learning-kicker" }, "01 / 상황으로 이해하기"),
      h("h3", null, scene.title),
      h("div", { class: "learning-dialogue" },
        h("p", { class: "learning-person" }, scene.speaker, h("span", null, scene.question)),
        h("p", { class: "learning-person learning-person--reply" }, "나", h("span", null, scene.reply))),
      h("div", { class: "learning-comparison" },
        h("div", null, h("h4", null, "아쉬운 방식"), h("p", null, scene.avoid)),
        h("div", null, h("h4", null, "시도할 방식"), h("p", null, scene.try))),
      h("p", { class: "learning-caption" }, "문서 원칙을 적용한 학습용 대화 예시입니다."), manualEvidence(scene.page, ctx)),
    h("article", { class: "learning-scene" },
      h("p", { class: "learning-kicker" }, "02 / 업무 흐름 익히기"), h("h3", null, "한 단계씩 이해해요"),
      h("ol", { class: "learning-flow" }, data.steps.map((step, i) => h("li", null,
        h("span", { class: "learning-step-number" }, String(i + 1).padStart(2, "0")), h("h4", null, step.title), h("p", null, step.text)))),
      h("p", { class: "learning-caption" }, "문서 내용을 학습하기 쉬운 순서로 재구성했습니다."), manualEvidence(data.stepsPage || 3, ctx)),
    h("article", { class: "learning-boundary" }, h("span", { "aria-hidden": "true" }, "⚓"),
      h("div", null, h("h3", null, boundary.title), h("p", null, boundary.text), manualEvidence(boundary.page, ctx))),
    h("p", { class: "learning-caption" }, "이제 ‘상황 선택 게임’ 탭에서 직접 판단해 보세요."));
  return { el, destroy() {} };
};

Components.adventure = (scenes, ctx) => {
  const state = ctx.state;
  if (state.step == null) Object.assign(state, { step: 0, choices: [] });
  const el = h("div", { class: "learning-game" });
  function render(focus = false) {
    if (state.step >= scenes.length) {
      el.replaceChildren(h("p", { class: "learning-kicker" }, "MISSION COMPLETE"),
        h("h3", { tabindex: "-1" }, "첫 업무 탐험을 마쳤어요!"),
        h("p", null, "선택을 돌아보고, 실천할 행동 하나를 체크리스트에서 골라 보세요."),
        h("ul", { class: "learning-recap" }, scenes.map((scene, i) => h("li", null,
          h("strong", null, scene.title), h("p", null, scene.choices[state.choices[i]].lesson), manualEvidence(scene.page, ctx)))),
        h("button", { class: "btn", type: "button", onClick: () => { state.step = 0; state.choices = []; render(true); } }, "다른 선택으로 다시 탐험"));
    } else {
      const scene = scenes[state.step];
      const selected = state.choices[state.step];
      const choices = scene.choices.map((choice, i) => h("button", {
        class: `learning-choice${selected === i ? " is-picked" : ""}`, type: "button", disabled: selected != null,
        onClick: () => { state.choices[state.step] = i; render(); el.querySelector(".learning-outcome").focus(); },
      }, h("span", null, String.fromCharCode(65 + i)), choice.text));
      const outcome = selected != null && scene.choices[selected];
      el.replaceChildren(...[h("p", { class: "learning-kicker" }, `OFFICE QUEST · ${state.step + 1} / ${scenes.length}`),
        h("div", { class: "learning-progress", "aria-label": `${state.step + 1}/${scenes.length} 상황` }, scenes.map((_, i) => h("span", { class: i <= state.step ? "is-active" : "" }))),
        h("h3", { tabindex: "-1" }, scene.title),
        h("p", { class: "learning-caption" }, "매뉴얼 원칙을 적용하는 가상 상황입니다. 결과는 학습용 예시예요."),
        h("div", { class: "learning-dialogue" }, h("p", { class: "learning-person" }, scene.speaker, h("span", null, scene.dialogue))),
        h("p", { class: "learning-question" }, scene.question),
        h("div", { class: "learning-choices" }, choices),
        outcome && h("section", { class: "learning-outcome", tabindex: "-1", "aria-live": "polite" },
          h("h4", null, outcome.title), h("p", null, outcome.result), h("p", { class: "learning-lesson" }, outcome.lesson), manualEvidence(scene.page, ctx),
          h("button", { class: "btn", type: "button", onClick: () => { state.step++; render(true); } }, state.step === scenes.length - 1 ? "탐험 마무리" : "다음 상황 →"))].filter(Boolean));
    }
    if (focus) el.querySelector("h3").focus();
  }
  render();
  return { el, destroy() {} };
};
