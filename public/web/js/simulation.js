// ===== AI팀장 시뮬레이션 =====
// 채팅창의 "시뮬레이션" 탭. (chat.js가 Simulation.create()로 만든 화면을 붙인다)
// DB ai_scenarios 테이블에서 상황을 불러와
//  1) 카테고리 선택 → 2) 상황 선택 → 3) AI팀장과 대화 → 4) 종료 평가
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
      situation: String(row.situation || ""),
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

  function create() {
    const el = h("div", { class: "chat__view sim", role: "tabpanel", hidden: true });
    let scenarios = [];
    let category = null;
    let personality = "balanced";

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
        h("label", { class: "sim__personality" }, "팀장 성격 ",
          h("select", { "aria-label": "팀장 성격", onChange: e => { personality = e.target.value; } },
            [["balanced", "차분한 팀장"], ["supportive", "격려하는 팀장"], ["direct", "직설적인 팀장"]].map(([value, label]) =>
              h("option", { value, selected: value === personality }, label)))),
        h("div", { class: "chat__chips sim__chips", "aria-label": "카테고리" }, chips),
        h("ul", { class: "sim__list" }, items));
    }

    // --- 3) 역할극 ---
    function showPlay(scenario) {
      let session = null;
      let pending = false;
      let ended = false;
      let turns = 0;
      const log = h("ol", { class: "chat__log sim__log", role: "log", "aria-live": "polite" });
      const input = h("input", {
        class: "chat__input",
        type: "text",
        placeholder: "AI팀장에게 답해 보세요",
        "aria-label": "답변",
        autocomplete: "off",
        maxlength: "2000",
      });
      const send = h("button", { class: "chat__send", type: "submit" }, "보내기");
      const finish = h("button", { class: "chat__link", type: "button", onClick: () => request("evaluate") }, "대화 종료 및 평가");
      const back = h("button", { class: "sim__back", type: "button", onClick: showList }, "← 목록");
      const notice = h("p", { class: "sim__notice", role: "status" });
      const retry = h("button", { class: "chat__link", type: "button", hidden: true, onClick: () => request("start") }, "연결 다시 시도");
      function controls() {
        input.disabled = send.disabled = pending || ended || !session || turns >= 20;
        finish.disabled = pending || ended || !turns;
        back.disabled = retry.disabled = pending;
        log.setAttribute("aria-busy", String(pending));
      }

      function say(who, text, extra) {
        const item = h("li", { class: `chat__msg chat__msg--${who}` },
          who === "bot" && h("span", { class: "sim__speaker" }, "AI팀장"),
          h("p", { class: "chat__bubble" }, text),
          extra);
        log.append(item);
        log.scrollTop = log.scrollHeight;
        return item;
      }

      async function request(action) {
        if (pending || ended) return;
        const message = input.value.trim();
        if (action === "chat" && (!message || !session || turns >= 20)) return;
        if (action === "evaluate" && (!session || !turns)) return;
        pending = true;
        notice.textContent = "";
        retry.hidden = true;
        controls();
        const user = action === "chat" ? say("user", message) : null;
        const typing = say("bot", action === "evaluate" ? "평가를 작성하고 있어요…" : "팀장이 응답을 준비하고 있어요…");
        try {
          const response = await fetch("/api/simulation", {
            method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(60000),
            body: JSON.stringify(action === "start" ? { action, scenarioId: scenario.id, personality }
              : { action, session, ...(action === "chat" ? { message } : {}) }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "AI 응답을 받지 못했어요.");
          typing.remove();
          if (action === "evaluate") {
            ended = true;
            const card = h("li", { class: "sim__score" }, h("h3", null, "대화 평가"));
            [["strengths", "잘한 점"], ["improvements", "개선할 점"], ["expressions", "추천 표현"]].forEach(([key, title]) => {
              card.append(h("h4", null, title), h("ul", null, data.feedback[key].map(text => h("li", null, text))));
            });
            card.append(h("button", { class: "chat__link", type: "button", onClick: () => showPlay(scenario) }, "같은 상황 다시 연습"));
            log.append(card);
            notice.textContent = "대화가 종료됐어요. 평가를 확인하고 다시 연습해 보세요.";
          } else {
            session = data.session;
            say("bot", data.reply);
            if (action === "chat") { input.value = ""; turns++; }
            if (turns >= 20) notice.textContent = "20회 대화를 마쳤어요. 대화 종료 및 평가를 눌러 주세요.";
          }
        } catch (error) {
          typing.remove();
          user?.remove();
          notice.textContent = error.name === "TimeoutError" ? "응답이 지연됐어요. 다시 시도해 주세요." : error.message;
          retry.hidden = action !== "start";
        } finally {
          pending = false;
          controls();
          log.scrollTop = log.scrollHeight;
          if (!input.disabled) input.focus({ preventScroll: true });
        }
      }

      log.append(h("li", { class: "sim__context" },
        h("span", { class: "sim__context-label" }, "상황"),
        h("p", null, scenario.situation)));

      el.replaceChildren(
        h("div", { class: "sim__bar" },
          back,
          h("p", { class: "sim__bar-title" }, scenario.title),
          scenario.difficulty && h("span", { class: "sim__level", "data-level": scenario.difficulty }, scenario.difficulty)),
        log,
        notice, retry,
        h("div", { class: "sim__actions" }, finish),
        h("form", {
          class: "chat__form",
          onSubmit: (e) => { e.preventDefault(); request("chat"); },
        }, input, send));
      controls();
      request("start");
    }

    load();
    return el;
  }

  return { create };
})();
