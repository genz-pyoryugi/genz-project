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

  // --- 첫 화면 안내: steps 의 target 만 밝게 두고 나머지를 어둡게, 옆에 안내 문구 + 다음 버튼 ---
  // 밝게 하기는 대상 요소 자체에 .sim-tour-target 을 붙여서 한다 (요소가 바깥에 큰 그림자를 드리워 나머지를 어둡게 함 →
  // 대상 크기 · 위치와 항상 딱 맞음). 대상은 그대로 클릭 · 입력 가능. 건너뛰기 · ESC · 대상이 사라지면 끝나고 onDone 을 부른다.
  function startTour(steps, onDone) {
    let i = 0;
    const text = h("p", { class: "sim-tour__text", id: "sim-tour-text" });
    const count = h("span", { class: "sim-tour__count" });
    const next = h("button", { class: "sim-tour__next", type: "button", onClick: () => go(i + 1) });
    const skip = h("button", { class: "sim-tour__skip", type: "button", onClick: () => end() }, "건너뛰기");
    const tip = h("div", { class: "sim-tour__tip", role: "dialog", "aria-labelledby": "sim-tour-text" },
      text, h("div", { class: "sim-tour__row" }, count, skip, next));
    const layer = h("div", { class: "sim-tour" }, tip);

    function place() {
      const target = steps[i].target;
      if (!target?.isConnected) return end();
      steps.forEach((step) => step.target?.classList.toggle("sim-tour-target", step.target === target));
      const r = target.getBoundingClientRect(), pad = 12;
      // 안내 상자: 밝은 칸 아래(자리가 없으면 위), 가로는 칸 가운데에 맞추되 화면 안으로
      const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 14;
      const below = r.bottom + pad + gap + th < innerHeight;
      tip.style.top = `${below ? r.bottom + pad + gap : Math.max(8, r.top - pad - gap - th)}px`;
      tip.style.left = `${Math.min(innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2))}px`;
      tip.dataset.side = below ? "below" : "above";
    }
    function go(n) {
      if (n >= steps.length) return end();
      i = n;
      text.textContent = steps[i].text;
      count.textContent = `${i + 1} / ${steps.length}`;
      next.textContent = steps[i].next;
      place();
      next.focus({ preventScroll: true });
    }
    const onKey = (e) => { if (e.key === "Escape") end(); };
    function end() {
      if (!layer.isConnected) return;
      layer.remove();
      steps.forEach((step) => step.target?.classList.remove("sim-tour-target"));
      watch.disconnect();
      removeEventListener("resize", place);
      removeEventListener("keydown", onKey);
      onDone?.();
    }
    // 창 크기가 바뀌거나(팝업이 열리는 중 · 글꼴 로딩) 대상 칸 크기가 바뀌면 다시 맞춘다
    const watch = new ResizeObserver(() => { if (layer.isConnected) place(); });
    steps.forEach((step) => step.target && watch.observe(step.target));
    watch.observe(document.documentElement);
    document.body.append(layer);
    addEventListener("resize", place);
    addEventListener("keydown", onKey);
    document.fonts?.ready.then(() => { if (layer.isConnected) place(); });
    go(0);
  }

  function create() {
    const el = h("div", { class: "chat__view sim", role: "tabpanel", hidden: true });
    let scenarios = [];
    let category = null;
    let customPersonality = ""; // 직접 입력한 팀장 성격 (있으면 아래 선택 대신 이 설명을 씀, 최대 120자)
    const PRESETS = [["calm", "차분한"], ["encouraging", "격려하는"], ["direct", "직설적인"]];
    let personaChosen = false; // 첫 화면에서 팀장 성격을 정했는지
    let personality = "calm"; // 팀장 성격: calm · encouraging · direct. 시작할 때 서버로 보내고, 이후 대화는 서명된 세션이 같은 성격을 유지한다
    let tourShown = false; // 첫 화면 안내(startTour)를 이미 보여 줬는지

    // --- 1) 불러오기 ---
    function load() {
      el.replaceChildren(h("p", { class: "sim__notice" }, "상황을 불러오는 중이에요…"));
      fetchTable("ai_scenarios")
        .then((rows) => {
          // 상황이 하나도 없어도 첫 화면(팀장 성격 정하기)은 보여 주고, 목차 자리에서 '아직 없어요'를 알린다
          scenarios = rows.map(parseScenario);
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
      // 처음에는 큰 목차(카테고리)만 보여 주고, 고르면 그 카테고리의 상황을 보여 준다
      if (!names.some((name) => sameCategory(name, category))) category = null;

      const chapterNum = (name) => CHAPTERS.find((c) => sameCategory(c.title, name))?.num;
      const toc = names.map((name) =>
        h("li", null,
          h("button", { class: "sim__item sim__toc-item", type: "button", onClick: () => { category = name; showList(); } },
            h("span", { class: "sim__item-head" },
              h("span", { class: "sim__item-title" }, [chapterNum(name), name].filter(Boolean).join("  ")),
              h("span", { class: "sim__toc-count" }, `${scenarios.filter((s) => sameCategory(s.category, name)).length}개 ›`)))));

      const items = scenarios.filter((s) => sameCategory(s.category, category)).map((s) =>
        h("li", null,
          h("button", { class: "sim__item", type: "button", onClick: () => showPlay(s) },
            h("span", { class: "sim__item-head" },
              h("span", { class: "sim__item-title" }, s.title),
              s.difficulty && h("span", { class: "sim__level", "data-level": s.difficulty }, s.difficulty)),
            h("span", { class: "sim__item-desc" }, s.context))));

      // ① 첫 화면: 팀장 성격 정하기 (버튼을 누르거나 직접 입력 후 확인하면 ② 목차로)
      if (!personaChosen) {
        let customInput, nextBtn;
        const choose = () => { personaChosen = true; showList(); };
        const syncNext = () => { nextBtn.disabled = !customPersonality.trim(); };
        el.replaceChildren(
          h("div", { class: "sim__intro" }, h("p", { class: "chat__sim-badge" }, "SIMULATION")),
          // 팀원 일러스트: 배지와 성격 입력 사이 빈 공간
          h("img", { class: "sim__team", src: "assets/picture/sim-team.webp", alt: "", draggable: "false" }),
          // 성격 입력 묶음은 화면 아래쪽 빈 공간에 놓는다 (.sim__persona-step)
          h("div", { class: "sim__intro sim__persona-step" },
            h("label", { class: "sim__custom" },
              h("span", { class: "sim__custom-label" }, "팀장님의 성격을 입력해주세요"),
              h("span", { class: "sim__custom-row" },
                (customInput = h("input", {
                  class: "sim__custom-input", type: "text", maxlength: "120", value: customPersonality,
                  placeholder: "직접 입력 (예: 꼼꼼하지만 유머 있는 팀장)",
                  onInput: e => { customPersonality = e.target.value; syncNext(); },
                  onKeydown: e => { if (e.key === "Enter" && !e.isComposing && customPersonality.trim()) choose(); },
                })),
                (nextBtn = h("button", { class: "chat__send sim__custom-next", type: "button", onClick: () => { if (customPersonality.trim()) choose(); } }, "확인")))),
            // 예시 성격 버튼: 누르면 그 성격으로 정하고 바로 목차로 (직접 입력은 비움)
            h("div", { class: "sim__presets", role: "group", "aria-label": "예시 팀장 성격" },
              PRESETS.map(([value, label]) => h("button", {
                class: "chat__chip sim__preset", type: "button", "aria-pressed": String(!customPersonality.trim() && value === personality),
                onClick: () => { personality = value; customPersonality = ""; customInput.value = ""; choose(); },
              }, label)))));
        syncNext();
        // 처음 한 번: 입력창 → 예시 버튼 순서로 밝게 비추는 안내 (페이지를 새로 열면 다시 나옴)
        if (!tourShown) {
          tourShown = true;
          requestAnimationFrame(() => startTour([
            { target: customInput.closest(".sim__custom"), text: "시뮬레이션할 팀장님의 성격을 먼저 입력해주세요!", next: "NEXT" },
            { target: el.querySelector(".sim__presets"), text: "아래 선택도 가능합니다!", next: "확인" },
          ], () => customInput.focus({ preventScroll: true })));
        }
        return;
      }

      // ② 목차 · ③ 상황 목록: 위에 정한 성격을 한 줄로 보여 주고 '변경'으로 ①로 돌아간다
      const personaName = customPersonality.trim() || PRESETS.find(([value]) => value === personality)[1] + " 팀장";
      el.replaceChildren(
        h("div", { class: "sim__intro" },
          h("p", { class: "chat__sim-badge" }, "SIMULATION"),
          h("div", { class: "sim__persona" },
            h("span", { class: "sim__persona-label" }, "팀장 성격"),
            h("span", { class: "sim__persona-name" }, personaName),
            h("button", { class: "sim__back", type: "button", onClick: () => { personaChosen = false; showList(); } }, "변경")),
          category ? h("p", { class: "sim__lead" }, "연습할 상황을 선택하세요.") : ""),
        category
          ? h("div", { class: "sim__cat-bar" },
              h("button", { class: "sim__back", type: "button", onClick: () => { category = null; showList(); } }, "← 목차"),
              h("span", { class: "sim__cat-title" }, [chapterNum(category), category].filter(Boolean).join("  ")))
          : "",
        names.length
          ? h("ul", { class: category ? "sim__list" : "sim__list sim__list--toc", "aria-label": category ? "상황" : "카테고리" }, category ? items : toc)
          : h("p", { class: "sim__notice" }, "등록된 상황이 아직 없어요."));
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
            body: JSON.stringify(action === "start" ? { action, scenarioId: scenario.id, personality, ...(customPersonality.trim() ? { customPersonality: customPersonality.trim() } : {}) }
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

      // 상황 카드: 제목(크게) → "상황" 라벨 → 설명. 'AI팀장:' 첫 질문은 아래 대화에서 팀장이 직접 말하므로 넣지 않는다
      log.append(h("li", { class: "sim__context" },
        h("p", { class: "sim__context-title" }, scenario.title),
        h("span", { class: "sim__context-label" }, "상황"),
        h("p", { class: "sim__context-body" }, scenario.context)));

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
