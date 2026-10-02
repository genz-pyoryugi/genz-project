// ===== AI팀장 시뮬레이션 =====
// 채팅창의 "시뮬레이션" 탭. (chat.js가 Simulation.create()로 만든 화면을 붙인다)
// DB ai_scenarios 테이블에서 상황을 불러와
//  1) 카테고리 선택 → 2) 상황 선택 → 3) AI팀장의 말에 답하기 → 4) 평가 포인트로 점검
// 순서로 진행한다.
//  situation        : "제목\n 상황: 설명\n AI팀장: 첫 질문" 형식
//  evaluation_points: "1. 포인트\n 2. 포인트 ..." 형식
const Simulation = (() => {
  // DB 한 행 → { id, category, title, context, prompt, points, difficulty }
  function parseScenario(row) {
    const lines = String(row.situation || "").split("\n").map((line) => line.trim()).filter(Boolean);
    const scenario = {
      id: row.id,
      category: row.category,
      difficulty: row.difficulty || "",
      title: lines[0] || "상황",
      context: "",
      prompt: "",
      points: String(row.evaluation_points || "")
        .split("\n")
        .map((line) => line.trim().replace(/^\d+\s*[.)]\s*/, ""))
        .filter(Boolean),
    };
    const rest = [];
    lines.slice(1).forEach((line) => {
      const match = line.match(/^(상황|AI\s*팀장)\s*:\s*(.*)$/);
      if (match?.[1] === "상황") scenario.context = match[2];
      else if (match) scenario.prompt = match[2];
      else rest.push(line);
    });
    if (!scenario.context) scenario.context = rest.join("\n");
    if (!scenario.prompt) scenario.prompt = "이 상황에서 어떻게 말할지 답해 보세요.";
    return scenario;
  }

  // 답변 평가. 지금은 평가 포인트를 보여주고 스스로 체크하게 한다.
  // 나중에 AI를 붙이려면 이 함수만 바꾸면 된다. (scenario.points 기준으로 answer를 채점)
  function evaluate(scenario) {
    return {
      message: "좋아요. 방금 답변을 아래 평가 포인트로 점검해 볼까요? 지킨 항목을 체크해 보세요.",
      points: scenario.points,
    };
  }

  function create() {
    const el = h("div", { class: "chat__view sim", role: "tabpanel", hidden: true });
    let scenarios = [];
    let category = null;

    // --- 1) 불러오기 ---
    function load() {
      el.replaceChildren(h("p", { class: "sim__notice" }, "상황을 불러오는 중이에요…"));
      fetchTable("ai_scenarios")
        .then((rows) => {
          scenarios = rows.map(parseScenario);
          if (!scenarios.length) {
            el.replaceChildren(h("p", { class: "sim__notice" }, "등록된 상황이 아직 없어요."));
            return;
          }
          showList();
        })
        .catch(() => {
          el.replaceChildren(
            h("p", { class: "sim__notice" }, "상황을 불러오지 못했어요."),
            h("button", { class: "chat__link sim__retry", type: "button", onClick: load }, "다시 시도"));
        });
    }

    // 카테고리는 챕터 순서대로, 상황이 있는 것만
    function categories() {
      const list = CHAPTERS.map((chapter) => chapter.title)
        .filter((title) => scenarios.some((s) => sameCategory(s.category, title)));
      scenarios.forEach((s) => {
        if (!list.some((title) => sameCategory(title, s.category))) list.push(s.category);
      });
      return list;
    }

    // --- 2) 카테고리 · 상황 선택 ---
    function showList() {
      const names = categories();
      if (!names.some((name) => sameCategory(name, category))) category = names[0];

      const chips = names.map((name) =>
        h("button", {
          class: "chat__chip",
          type: "button",
          "aria-pressed": String(sameCategory(name, category)),
          onClick: () => { category = name; showList(); },
        }, name));

      const items = scenarios.filter((s) => sameCategory(s.category, category)).map((s) =>
        h("li", null,
          h("button", { class: "sim__item", type: "button", onClick: () => showPlay(s) },
            h("span", { class: "sim__item-head" },
              h("span", { class: "sim__item-title" }, s.title),
              s.difficulty && h("span", { class: "sim__level", "data-level": s.difficulty }, s.difficulty)),
            h("span", { class: "sim__item-desc" }, s.context))));

      el.replaceChildren(
        h("div", { class: "sim__intro" },
          h("p", { class: "chat__sim-badge" }, "SIMULATION"),
          h("p", { class: "sim__lead" }, "AI팀장과 실제 회사 상황을 연습해 보세요.\n카테고리를 고르고 상황을 선택하세요.")),
        h("div", { class: "chat__chips sim__chips", "aria-label": "카테고리" }, chips),
        h("ul", { class: "sim__list" }, items));
    }

    // --- 3) 역할극 ---
    function showPlay(scenario) {
      const log = h("ol", { class: "chat__log sim__log", role: "log", "aria-live": "polite" });
      const input = h("input", {
        class: "chat__input",
        type: "text",
        placeholder: "AI팀장에게 답해 보세요",
        "aria-label": "답변",
        autocomplete: "off",
      });

      function say(who, text, extra) {
        const item = h("li", { class: `chat__msg chat__msg--${who}` },
          who === "bot" && h("span", { class: "sim__speaker" }, "AI팀장"),
          h("p", { class: "chat__bubble" }, text),
          extra);
        log.append(item);
        log.scrollTop = log.scrollHeight;
        return item;
      }

      function answer(raw) {
        const text = raw.trim();
        if (!text) return;
        input.value = "";
        say("user", text);

        const typing = say("bot", "…");
        typing.classList.add("is-typing");
        setTimeout(() => {
          typing.remove();
          const result = evaluate(scenario, text);
          say("bot", result.message, scoreCard(result.points));
        }, 600);
      }

      // 평가 포인트 체크표
      function scoreCard(points) {
        const count = h("p", { class: "sim__count" });
        const boxes = points.map(() => h("input", { type: "checkbox", onChange: update }));
        function update() {
          const n = boxes.filter((box) => box.checked).length;
          count.textContent = n === points.length
            ? `${n} / ${points.length} · 모두 지켰어요! 실전에서도 이렇게 말해 보세요.`
            : `${n} / ${points.length} 지켰어요`;
        }
        update();
        return h("div", { class: "sim__score" },
          h("ul", null, points.map((point, i) =>
            h("li", null, h("label", null, boxes[i], h("span", null, point))))),
          count,
          h("div", { class: "sim__actions" },
            h("button", { class: "chat__link", type: "button", onClick: () => input.focus() }, "다시 답해 보기"),
            h("button", { class: "chat__link sim__ghost", type: "button", onClick: showList }, "다른 상황 고르기")));
      }

      log.append(h("li", { class: "sim__context" },
        h("span", { class: "sim__context-label" }, "상황"),
        h("p", null, scenario.context)));
      say("bot", scenario.prompt);

      el.replaceChildren(
        h("div", { class: "sim__bar" },
          h("button", { class: "sim__back", type: "button", onClick: showList }, "← 목록"),
          h("p", { class: "sim__bar-title" }, scenario.title),
          scenario.difficulty && h("span", { class: "sim__level", "data-level": scenario.difficulty }, scenario.difficulty)),
        log,
        h("form", {
          class: "chat__form",
          onSubmit: (e) => { e.preventDefault(); answer(input.value); },
        }, input, h("button", { class: "chat__send", type: "submit" }, "보내기")));
      input.focus({ preventScroll: true });
    }

    load();
    return el;
  }

  return { create };
})();
