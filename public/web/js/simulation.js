// ===== AI팀장 시뮬레이션 =====
// 채팅창의 "시뮬레이션" 탭. (chat.js가 Simulation.create()로 만든 화면을 붙인다)
// 상황 21개(7개 카테고리 × 3)는 서버 코드 src/lib/simulation/scenarios.ts 에 있고, GET /api/simulation 으로 공개 정보만 받는다.
// (팀장만 아는 사실 · 평가 기준은 서버에만 있고 브라우저로 오지 않는다)
//  1) 카테고리 카드 7장(옆으로 돌리기, 퀴즈에서 넘어왔으면 그 주제부터) → 2) 상황 3개 → 3) 상황 설명 + 추천 팀장 → [추천 팀장으로 시작] [팀장 바꾸기] [직접 설정]
//  3) AI팀장과 3~5턴 대화 → 4) 평가 (상황 파악 · 대응 방식 · 후속 행동) → 다시 답변해보기 / 같은 상황 다시하기 / 다른 상황 선택
// 퀴즈에서 틀린 개념(localStorage 'genz_quiz_weak', src/app/quiz/page.tsx 가 저장)과 이어진 상황에는 '추천'을 붙인다.
const Simulation = (() => {
  const WEAK_KEY = "genz_quiz_weak";
  const CUSTOM_EXAMPLES = [
    "말이 짧고 조금 무뚝뚝하지만 무례하지 않은 팀장",
    "친절하지만 업무 기준에는 굉장히 꼼꼼한 팀장",
    "항상 바빠서 긴 설명을 하면 핵심부터 말하라고 하는 팀장",
  ];
  // 학습 경로(튜토리얼대로 왔는지) 비교용: 카테고리별 카드뉴스 콘텐츠 id (public/web/js/data/*-content.js 의 categoryIds 기준, 시뮬레이션 카테고리 순서와 같음)
  // 카드뉴스 학습을 마치면 cardnews-learning.js 가 localStorage 'genz:cardnews-learning:v1:<콘텐츠 id>' 에 completedAt 을 남긴다
  const CARDNEWS_BY_CATEGORY = [
    ["first-day-adaptation"],
    ["workplace-ethics"],
    ["email-messenger-communication"],
    ["communication-newsletter-test", "workplace-communication"],
    ["workplace-interpersonal"],
    ["remote-work-agreements"],
    ["shared-spaces-supplies"],
  ];
  // 괴롭힘 피해 · 위기 신호 낱말 (띄어쓰기 지운 문장 기준) — src/lib/simulation/safety.ts 의 CRISIS + HARASSMENT 와 함께 고칠 것
  const SENSITIVE = /죽고싶|자살|자해|극단적선택|사라지고싶|살기싫|그만살고싶|목숨을끊|괴롭힘|괴롭혀|괴롭히|따돌림|따돌리|따돌려|왕따|폭언|갑질|성희롱|성추행|추행을|폭행|때렸|때려요|협박|소리를질러|소리질러|소리를질렀|욕을했|욕을해|욕먹|모욕을|인격모독|차별당/;
  const CRITERIA = [["situationUnderstanding", "상황 파악"], ["responseQuality", "대응 방식"], ["followupAction", "후속 행동"]];

  // 퀴즈에서 틀린 concept 키 모음 (주제 구분 없이)
  function weakConcepts() {
    try {
      return new Set(Object.values(JSON.parse(localStorage.getItem(WEAK_KEY) || "{}")).flat());
    } catch {
      return new Set();
    }
  }

  // 평가 결과를 Supabase(simulation_attempts)에 저장하려고, 평가 요청에만 익명 사용자 토큰을 붙인다
  // (SOS 상담과 같은 익명 사용자 — js/sos-api.js). 토큰을 못 얻어도 평가는 그대로 진행
  async function userToken() {
    try {
      return typeof SosApi !== "undefined" && SosApi.accessToken ? await SosApi.accessToken() : null;
    } catch {
      return null;
    }
  }

  async function api(body) {
    const token = body?.action === "evaluate" ? await userToken() : null;
    const response = await fetch("/api/simulation", {
      method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(60000),
      ...(body ? { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "AI 응답을 받지 못했어요.");
    return data;
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
    let categories = [];
    let personalities = []; // [{ key, label, desc }] 차분한 · 직설적인 · 바쁜 · 꼼꼼한
    let weak = new Set();
    let tourShown = false; // 첫 화면 안내(startTour)를 이미 보여 줬는지
    // 팀장 성격별 동물 얼굴 (assets/picture/leaders): 차분한=시바 · 직설적인=곰 · 바쁜=퍼그 · 꼼꼼한=고양이 (말티즈는 신입이라 제외)
    const leaderFace = (key) => ["calm", "direct", "busy", "meticulous"].includes(key)
      && h("img", { class: "sim__leader-face", src: `assets/picture/leaders/${key}-v2.webp`, alt: "", draggable: "false" });
    const presetLabel = (key) => personalities.find((p) => p.key === key)?.label || "팀장";
    // 카테고리 이름 비교용: 퀴즈(DB)는 '업무 절차·기준', 시뮬레이션은 '업무 절차&기준'처럼 기호만 달라서 글자만 남긴다
    const nameKey = (name) => String(name).replace(/[^가-힣a-zA-Z0-9]/g, "");
    // 퀴즈에서 틀린 개념(01 주제) 또는 틀린 문제가 있는 주제 전체('topic:<이름>')와 이어진 상황
    const recommended = (s) => s.quizConcepts.some((c) => weak.has(c)) || weak.has(`topic:${nameKey(s.category)}`);
    const num = (name) => String(categories.indexOf(name) + 1).padStart(2, "0");
    // 이 카테고리의 카드뉴스 · 퀴즈를 마친 시각 (이 브라우저 기록, 없으면 null) — 시작할 때 서버로 보내 결과와 함께 저장
    function learningFor(category) {
      const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
      const times = (CARDNEWS_BY_CATEGORY[categories.indexOf(category)] || [])
        .map((id) => read(`genz:cardnews-learning:v1:${id}`)?.completedAt).filter(Boolean).sort();
      const quizDone = read("genz_quiz_done") || {};
      const quizKey = Object.keys(quizDone).find((topic) => nameKey(topic) === nameKey(category));
      return { cardnewsAt: times[0] || null, quizAt: quizKey ? quizDone[quizKey] : null };
    }
    const recBadge = () => h("span", { class: "sim__rec", title: "퀴즈에서 틀린 개념과 이어진 상황이에요" }, "추천");

    // --- 1) 불러오기 ---
    function load() {
      el.replaceChildren(h("p", { class: "sim__notice" }, "상황을 불러오는 중이에요…"));
      api()
        .then((data) => {
          ({ scenarios, categories, personalities } = data);
          showHome();
        })
        .catch(() => {
          el.replaceChildren(
            h("p", { class: "sim__notice" }, "상황을 불러오지 못했어요."),
            h("button", { class: "chat__link sim__retry", type: "button", onClick: load }, "다시 시도"));
        });
    }

    // --- 2) 첫 화면: 카테고리 7개를 긴 카드(그림 + 이름)로, 옆 카드를 누르거나 ‹ › · 방향키 · 밀기로 돌린다 ---
    // 가운데 카드를 누르면 그 카테고리의 상황 목록으로. 퀴즈 결과 화면의 'AI 팀장' 버튼으로 넘어왔으면
    // (localStorage 'genz_sim_from_quiz', 10분 이내) 그 퀴즈 주제의 카드가 가운데에서 시작한다.
    let current = 0; // 가운데 카드 (categories 의 번호)
    let fromQuiz = null; // 넘어온 퀴즈 주제 (categories 안의 이름)
    let onHome = false;
    const sameName = (a, b) => nameKey(a) === nameKey(b);
    const catImage = (name) => `assets/picture/sim-cats/cat-${num(name)}.webp`;
    function readFromQuiz() {
      try {
        const v = JSON.parse(localStorage.getItem("genz_sim_from_quiz") || "null");
        localStorage.removeItem("genz_sim_from_quiz");
        const found = v && Date.now() - v.at < 10 * 60 * 1000 && categories.find((c) => sameName(c, v.topic));
        if (found) { fromQuiz = found; current = categories.indexOf(found); }
      } catch {}
    }
    addEventListener("storage", (e) => { if (e.key === "genz_sim_from_quiz" && e.newValue && onHome) showHome(); });

    // 창 제목줄(.chat__title · .chat__sub): 첫 화면에서만 질문으로 바꾸고, 다른 화면에서는 원래 제목으로 되돌린다
    const HOME_HEAD = ["어떤 상황을 연습해볼까요?", "카드를 옆으로 넘겨 카테고리를 고르고, 팀장님께 직접 말해보며 연습해요."];
    let savedHead = null;
    function setHead(text) {
      if (!document.documentElement.classList.contains("theme-sim")) return false;
      const title = document.querySelector(".chat__title"), sub = document.querySelector(".chat__sub");
      if (!title || !sub) return false;
      if (!text) { if (savedHead) [title.textContent, sub.textContent] = savedHead; savedHead = null; return true; }
      savedHead ??= [title.textContent, sub.textContent];
      [title.textContent, sub.textContent] = text;
      return true;
    }

    function showHome() {
      onHome = true;
      weak = weakConcepts(); // 퀴즈를 풀고 돌아왔을 수 있으니 열 때마다 다시 읽는다
      readFromQuiz();
      const n = categories.length;
      let dragged = false; // 방금 밀어서 넘겼으면 그 클릭은 무시
      const cards = categories.map((name, i) => {
        const inCat = scenarios.filter((s) => s.category === name);
        return h("button", { class: "sim__card", type: "button",
          onClick: () => { if (dragged) return; if (i === current) showCategory(name); else turn(i); } },
          h("span", { class: "sim__card-img" }, h("img", { src: catImage(name), alt: "", draggable: "false" })),
          h("span", { class: "sim__card-body" },
            h("span", { class: "sim__card-tags" },
              h("span", { class: "sim__card-num" }, num(name)),
              name === fromQuiz && h("span", { class: "sim__card-quiz" }, "방금 푼 퀴즈"),
              inCat.some(recommended) && recBadge()),
            h("span", { class: "sim__card-title" }, name),
            h("span", { class: "sim__card-sub" }, inCat.map((s) => s.title).join(" · ")),
            h("span", { class: "sim__card-go" }, `상황 ${inCat.length}개 연습하기 →`)));
      });
      const dots = h("div", { class: "sim__dots-nav", role: "group", "aria-label": "카테고리" },
        categories.map((name, i) => h("button", { type: "button", "aria-label": name, onClick: () => turn(i) })));
      const prev = h("button", { class: "sim__nav sim__nav--prev", type: "button", "aria-label": "이전 카테고리", onClick: () => turn(current - 1) }, "‹");
      const next = h("button", { class: "sim__nav sim__nav--next", type: "button", "aria-label": "다음 카테고리", onClick: () => turn(current + 1) }, "›");
      const carousel = h("div", { class: "sim__carousel", "aria-roledescription": "carousel", "aria-label": "카테고리 카드",
        onKeydown: (e) => {
          if (e.key === "ArrowLeft") { e.preventDefault(); turn(current - 1); }
          if (e.key === "ArrowRight") { e.preventDefault(); turn(current + 1); }
        } }, h("div", { class: "sim__track" }, cards), prev, next);
      // 카드 위치: 가운데에서 몇 칸 떨어졌는지(앞뒤로 이어지게 -3~3)에 따라 옆으로 · 작게 · 흐리게 (CSS 가 --d · --a 로 계산)
      function layout() {
        cards.forEach((card, i) => {
          let d = (i - current + n) % n;
          if (d > n / 2) d -= n;
          const a = Math.abs(d);
          card.style.setProperty("--d", String(d));
          card.style.setProperty("--a", String(a));
          card.style.zIndex = String(10 - a);
          card.classList.toggle("is-current", d === 0);
          card.classList.toggle("is-far", a > 2);
          card.setAttribute("aria-label", d === 0 ? `${categories[i]} — 상황 보러 가기` : `${categories[i]} 카드로 넘기기`);
          card.tabIndex = d === 0 ? 0 : -1;
          card.setAttribute("aria-hidden", String(a > 2));
        });
        [...dots.children].forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
      }
      function turn(i) {
        const wasFocused = carousel.contains(document.activeElement);
        current = (i + n) % n;
        layout();
        if (wasFocused) cards[current].focus({ preventScroll: true });
      }
      // 손가락 · 마우스로 옆으로 밀기
      let startX = null;
      carousel.addEventListener("pointerdown", (e) => { startX = e.clientX; dragged = false; });
      carousel.addEventListener("pointerup", (e) => {
        if (startX == null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40) { dragged = true; turn(current + (dx < 0 ? 1 : -1)); setTimeout(() => { dragged = false; }); }
      });
      // 사무실 모니터(흰 테마)에서는 창 제목 자리에 질문을 띄우고, 상담소 채팅의 시뮬레이션 탭에서는 화면 안에 둔다
      const inHead = setHead(HOME_HEAD);
      el.replaceChildren(
        ...(inHead ? [] : [h("div", { class: "sim__intro" },
          h("p", { class: "chat__sim-badge" }, "SIMULATION"),
          h("p", { class: "sim__home-title" }, HOME_HEAD[0]),
          h("p", { class: "sim__lead" }, HOME_HEAD[1]))]),
        carousel, dots);
      layout();
      // 처음 한 번: 카드를 밝게 비추는 안내 (시뮬레이션 화면이 실제로 보일 때만 — SOS 상담 화면에서는 숨겨져 있음)
      if (!tourShown) {
        tourShown = true;
        requestAnimationFrame(() => (el.hidden || !el.offsetParent ? (tourShown = false) : startTour([
          { target: cards[current], text: "옆 카드나 ‹ › 를 눌러 카테고리를 넘겨보세요. 가운데 카드를 누르면 연습할 상황이 나와요!", next: "NEXT" },
          { target: cards[current], text: weak.size ? "퀴즈에서 헷갈렸던 내용과 이어진 카드에는 '추천'이 붙어요. 다른 카테고리도 자유롭게 고를 수 있어요." : "퀴즈를 풀면, 헷갈렸던 내용과 이어진 카드에 '추천'이 붙어요.", next: "확인" },
        ])));
      }
    }

    // 공통: 위쪽 줄 (← 뒤로 + 제목)
    const bar = (label, onBack, title, extra) => h("div", { class: "sim__bar" },
      h("button", { class: "sim__back", type: "button", onClick: onBack }, label),
      h("p", { class: "sim__bar-title" }, title), extra);

    // --- 3) 카테고리의 상황 카드 ---
    // 스크롤 없이 한 화면에: 상황 카드 3개가 남는 높이를 나눠 채운다 (사무실 모니터에서는 제목줄에 카테고리 이름)
    // 카테고리 한 줄 소개 (상황 3개 화면 위쪽)
    const CATEGORY_INTRO = [
      "회사가 어떻게 움직이는지, 내 역할은 어디까지인지 직접 연습해보세요.",
      "업무 요청의 조건과 기준 · 절차를 확인하는 연습을 해보세요.",
      "막힌 부분을 정확히 묻고, 바뀐 내용을 확인하는 연습을 해보세요.",
      "함께 하는 일의 역할과 일정을 맞추고, 사실 중심으로 조율해보세요.",
      "부탁 · 일정 · 실수 상황에서 신뢰를 지키며 대화해보세요.",
      "재택 · 집중 시간에도 팀과 연결되는 공유 방법을 연습해보세요.",
      "공용 비품과 공간을 다음 사람까지 생각하며 다루는 연습을 해보세요.",
    ];
    // 스크롤 없이 한 화면에: 위에는 카테고리 그림 + 이름 · 소개 · 학습 단계(카드뉴스 · 퀴즈 완료 여부 → AI 실전 연습), 아래에 상황 카드 3개
    function showCategory(name) {
      onHome = false;
      setHead(null);
      const done = learningFor(name);
      const chip = (label, state) => h("span", { class: "sim__step", "data-state": state }, label, state === "done" && h("span", { "aria-hidden": "true" }, " ✓"));
      el.replaceChildren(
        h("div", { class: "sim__page sim__page--cat" },
          h("button", { class: "sim__back sim__cat-back", type: "button", onClick: showHome }, "← 카테고리"),
          h("section", { class: "sim__cat-head" },
            h("img", { class: "sim__cat-img", src: catImage(name), alt: "", draggable: "false" }),
            h("div", { class: "sim__cat-info" },
              h("p", { class: "sim__cat-name" }, h("b", null, num(name)), name),
              h("p", { class: "sim__cat-intro" }, CATEGORY_INTRO[categories.indexOf(name)] || "연습할 상황을 골라 팀장님께 직접 말해보세요."),
              h("p", { class: "sim__steps", "aria-label": "학습 단계" },
                chip(done.cardnewsAt ? "카드뉴스 완료" : "카드뉴스 전", done.cardnewsAt ? "done" : "todo"),
                chip(done.quizAt ? "퀴즈 완료" : "퀴즈 전", done.quizAt ? "done" : "todo"),
                chip("AI 실전 연습", "now")))),
          h("ul", { class: "sim__list sim__list--plain sim__list--cards", "aria-label": "상황" },
            scenarios.filter((s) => s.category === name).map((s) => h("li", null,
              h("button", { class: "sim__item", type: "button", onClick: () => showDetail(s) },
                h("span", { class: "sim__item-head" },
                  h("span", { class: "sim__item-title" }, s.title),
                  recommended(s) && recBadge()),
                h("span", { class: "sim__item-desc" }, s.description),
                h("span", { class: "sim__item-meta" },
                  h("span", null, s.minutes),
                  h("span", { class: "sim__level", "data-level": s.difficulty }, s.difficulty)),
                h("span", { class: "sim__item-go" }, "이 상황 연습하기 →")))))));
    }

    // --- 4) 상황 설명 + 팀장 고르기 (mode: 'presets' 팀장 바꾸기 · 'custom' 직접 설정) ---
    // opts: { error, text } 직접 설정이 거절됐을 때 안내 문구와 입력했던 설명
    function showDetail(s, mode, opts = {}) {
      onHome = false;
      setHead(null);
      const rec = s.recommendedPersonality;
      const recInfo = personalities.find((p) => p.key === rec);
      let picker = "";
      if (mode === "presets") {
        picker = h("div", { class: "sim__panel" },
          h("p", { class: "sim__panel-title" }, "어떤 팀장과 연습할까요?"),
          h("div", { class: "sim__preset-grid", role: "group", "aria-label": "기본 팀장 성격" },
            personalities.map((p) => h("button", { class: "sim__preset-card", type: "button", onClick: () => showPlay(s, { personality: p.key }) },
              leaderFace(p.key),
              h("span", { class: "sim__preset-text" },
                h("span", { class: "sim__preset-name" }, p.label, p.key === rec && h("span", { class: "sim__preset-tag" }, "추천")),
                h("span", { class: "sim__preset-desc" }, p.desc))))));
      } else if (mode === "custom") {
        const input = h("textarea", { class: "sim__custom-input sim__custom-area", maxlength: "120", rows: "3", "aria-labelledby": "sim-custom-title",
          placeholder: `예) ${CUSTOM_EXAMPLES[Math.floor(Math.random() * CUSTOM_EXAMPLES.length)]}` });
        input.value = opts.text || "";
        const go = h("button", { class: "chat__send sim__custom-next", type: "button", disabled: !input.value.trim(),
          onClick: () => {
            const text = input.value.trim();
            if (!text) return;
            if (typeof GenzModeration !== "undefined" && GenzModeration.findBlocked(text)) return showDetail(s, "custom", { error: GenzModeration.MODERATION_MESSAGE, text });
            showPlay(s, { customPersonality: text });
          } }, "이 팀장으로 시작");
        input.addEventListener("input", () => { go.disabled = !input.value.trim(); });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); go.click(); } });
        picker = h("div", { class: "sim__panel" },
          h("p", { class: "sim__panel-title", id: "sim-custom-title" }, "어떤 팀장과 연습하고 싶나요?"),
          input,
          opts.error && h("p", { class: "sim__error", role: "alert" }, opts.error),
          h("div", { class: "sim__presets", role: "group", "aria-label": "예시" },
            CUSTOM_EXAMPLES.map((text) => h("button", { class: "chat__chip", type: "button", onClick: () => { input.value = text; go.disabled = false; input.focus(); } }, text))),
          h("p", { class: "sim__custom-hint" }, "말투와 태도만 반영돼요. 마감 · 업무 범위 같은 상황의 사실은 바뀌지 않아요. (욕설 · 모욕 · 위협하는 팀장은 만들 수 없어요)"),
          go);
        requestAnimationFrame(() => input.focus({ preventScroll: true }));
      }
      const choice = (label, key, onClick, primary) => h("button", {
        class: primary ? "chat__send sim__choice" : "sim__ghost sim__choice", type: "button", "aria-pressed": key ? String(mode === key) : null, onClick,
      }, label);
      el.replaceChildren(
        bar("← 상황 목록", () => showCategory(s.category), s.title,
          h("span", { class: "sim__level", "data-level": s.difficulty }, s.difficulty)),
        h("div", { class: "sim__page" },
          h("div", { class: "sim__context" },
            h("p", { class: "sim__context-title" }, s.title, recommended(s) && recBadge()),
            h("span", { class: "sim__context-label" }, "상황"),
            h("p", { class: "sim__context-body" }, s.context),
            h("p", { class: "sim__item-meta" }, h("span", null, s.minutes), h("span", null, "팀장님과 3~5번 주고받아요"))),
          h("div", { class: "sim__leader" },
            leaderFace(rec),
            h("span", { class: "sim__leader-text" },
              h("span", { class: "sim__persona-label" }, "추천 팀장"),
              h("span", { class: "sim__leader-name" }, recInfo?.label || presetLabel(rec)),
              recInfo && h("span", { class: "sim__leader-desc" }, recInfo.desc))),
          h("div", { class: "sim__choices" },
            choice("추천 팀장으로 시작", null, () => showPlay(s, { personality: rec }), true),
            choice("팀장 바꾸기", "presets", () => showDetail(s, mode === "presets" ? null : "presets")),
            choice("직접 설정", "custom", () => showDetail(s, mode === "custom" ? null : "custom"))),
          picker));
    }

    // --- 5) 역할극 + 평가 ---
    // how: { personality } 프리셋 · { customPersonality } 직접 입력 · { retry } 다시 답변하기(같은 상황 · 같은 성격, 이전 시도와 비교)
    function showPlay(scenario, how) {
      onHome = false;
      setHead(null);
      let session = null;
      let pending = false;
      let ended = false; // 팀장이 대화를 마무리함 (더 답할 수 없고 결과만 볼 수 있음)
      let evaluated = false;
      let turns = 0;
      let maxTurns = 5;
      let leader = how.personality ? presetLabel(how.personality) : "AI팀장";
      // 대화 속 얼굴: 팀장 = 성격에 맞는 동물(직접 입력은 서버가 가장 비슷한 성격을 골라 줌), 나 = 신입 말티즈
      let face = how.personality || null;
      const avatar = (src) => h("img", { class: "sim__avatar", src, alt: "", draggable: "false" });
      const log = h("ol", { class: "chat__log sim__log", role: "log", "aria-live": "polite" });
      const input = h("input", { class: "chat__input", type: "text", placeholder: "팀장님께 답해 보세요", "aria-label": "답변", autocomplete: "off", maxlength: "1000" });
      const send = h("button", { class: "chat__send", type: "submit" }, "보내기");
      const finish = h("button", { class: "chat__link", type: "button", onClick: () => request("evaluate") }, "대화 끝내고 피드백 받기");
      const leaderTag = h("span", { class: "sim__leader-tag" }, leader);
      const turnInfo = h("span", { class: "sim__count" });
      const notice = h("p", { class: "sim__notice", role: "status" });
      const retry = h("button", { class: "chat__link", type: "button", hidden: true, onClick: () => request("start") }, "연결 다시 시도");
      // 팀장이 대화를 마무리하면 입력창 대신 이 안내 + 결과 보기 버튼 (입력이 막힌 이유가 바로 보이게)
      const endBox = h("div", { class: "sim__endbox", hidden: true },
        h("p", null, "팀장님과의 대화가 끝났어요."),
        h("button", { class: "chat__send", type: "button", onClick: () => request("evaluate") }, "결과 보기"));
      const form = h("form", { class: "chat__form", onSubmit: (e) => { e.preventDefault(); request("chat"); } }, input, send);
      function controls() {
        input.disabled = send.disabled = pending || ended || evaluated || !session;
        finish.disabled = pending || evaluated || !turns;
        finish.hidden = evaluated || ended; // 끝났으면 아래 안내 칸의 결과 보기 버튼만
        form.hidden = evaluated || ended;
        endBox.hidden = !ended || evaluated;
        retry.disabled = pending;
        turnInfo.textContent = session && !evaluated ? `답변 ${turns} / ${maxTurns}` : "";
        finish.textContent = ended ? "결과 보기" : "대화 끝내고 피드백 받기";
        finish.classList.toggle("sim__finish--ready", ended);
        log.setAttribute("aria-busy", String(pending));
      }

      function say(who, text, extra) {
        const item = h("li", { class: `chat__msg chat__msg--${who} sim__msg` },
          who === "bot" ? (face ? avatar(`assets/picture/leaders/${face}-v2.webp`) : h("span", { class: "sim__avatar sim__avatar--blank" }))
            : avatar("assets/picture/leaders/newbie-v2.webp"),
          h("div", { class: "sim__msg-body" },
            h("span", { class: "sim__speaker" }, who === "bot" ? leader : "나 (신입)"),
            h("p", { class: "chat__bubble" }, text),
            extra));
        log.append(item);
        log.scrollTop = log.scrollHeight;
        return item;
      }

      async function request(action) {
        if (pending || evaluated) return;
        const message = input.value.trim();
        if (action === "chat" && (!message || !session || ended)) return;
        // 욕설 · 비하 · 혐오 · 위협 표현은 보내지 않고 바로 안내 (js/moderation.js — 서버도 한 번 더 검사)
        // 단, 괴롭힘 피해 · 위기 신호로 보이면 보내서 서버가 도움 받을 곳을 안내하게 한다 (src/lib/simulation/safety.ts 와 같은 낱말)
        if (action === "chat" && !SENSITIVE.test(message.replace(/\s+/g, "")) && typeof GenzModeration !== "undefined" && GenzModeration.findBlocked(message)) {
          notice.textContent = GenzModeration.MODERATION_MESSAGE;
          return;
        }
        if (action === "evaluate" && (!session || !turns)) return;
        pending = true;
        notice.textContent = "";
        retry.hidden = true;
        controls();
        const user = action === "chat" ? say("user", message) : null;
        const typing = say("bot", action === "evaluate" ? "대화를 돌아보며 피드백을 쓰고 있어요…" : action === "start" ? "팀장님이 다가오고 있어요…" : "팀장님이 생각 중이에요…");
        typing.classList.add("is-typing");
        try {
          const data = await api(action === "start" ? { action, scenarioId: scenario.id, ...how, ...(how.retry ? {} : { learning: learningFor(scenario.category) }) } : { action, session, ...(action === "chat" ? { message } : {}) });
          typing.remove();
          if (action === "evaluate") {
            evaluated = true;
            log.append(resultCard(data));
          } else {
            session = data.session;
            maxTurns = data.maxTurns || maxTurns;
            if (data.persona) {
              leaderTag.textContent = leader = data.persona.label;
              face = data.persona.face || face;
              leaderTag.replaceChildren(avatar(`assets/picture/leaders/${face}-v2.webp`), leader);
            }
            if (data.safety) {
              // 민감 상황: 팀장 대신 안내 카드. 이 답변은 횟수 · 평가에 들어가지 않고, 원하면 연습을 계속할 수 있다
              log.append(supportCard(data.safety));
              log.scrollTop = log.scrollHeight;
              input.value = "";
              return;
            }
            say("bot", data.reply);
            if (action === "chat") { input.value = ""; turns = data.turns ?? turns + 1; }
            if (data.shouldEnd) ended = true;
          }
        } catch (error) {
          typing.remove();
          user?.remove();
          notice.textContent = error.name === "TimeoutError" ? "응답이 지연됐어요. 다시 시도해 주세요." : error.message;
          retry.hidden = action !== "start";
          // 직접 입력한 팀장 설명이 거절되면(욕설 · 위협 등) 직접 설정 화면으로 돌아가 다시 쓰게 한다
          if (action === "start" && how.customPersonality && !/지연|연결|한도|키/.test(notice.textContent)) {
            showDetail(scenario, "custom", { error: notice.textContent, text: how.customPersonality });
            return;
          }
        } finally {
          pending = false;
          controls();
          log.scrollTop = log.scrollHeight;
          if (!input.disabled) input.focus({ preventScroll: true });
        }
      }

      function supportCard(info) {
        return h("li", { class: "sim__support", role: "alert" },
          h("h3", null, info.title),
          h("p", null, info.text),
          h("ul", null, info.contacts.map((c) => h("li", null, h("b", null, c.name), ` · ${c.detail}`))),
          h("p", { class: "sim__support-note" }, "방금 쓴 내용은 연습 대화와 평가에 넣지 않았어요. 괜찮다면 연습을 이어가도 되고, 휴대폰의 SOS 상담에서 더 이야기할 수도 있어요."));
      }

      // 결과: 점수 3개(설명 포함, 총 15점) · 잘한 점 · 놓친 부분 · 이렇게 말하면 더 좋아요 · (다시 답변했으면) 이전 시도와 비교
      function resultCard(data) {
        const f = data.feedback;
        const section = (title, ...body) => h("section", { class: "sim__result-sec" }, h("h4", null, title), ...body);
        const card = h("li", { class: "sim__score sim__result" },
          h("h3", null, data.attempt > 1 ? `${data.attempt}번째 시도 결과` : "대화 피드백"),
          data.total != null && h("p", { class: "sim__total" }, h("strong", null, data.total), " / 15점",
            data.previous && h("span", { class: "sim__diff", "data-up": String(data.total >= data.previous.total) },
              ` (이전 ${data.previous.total}점 → ${data.total - data.previous.total >= 0 ? "+" : ""}${data.total - data.previous.total})`)),
          h("ul", { class: "sim__criteria" }, CRITERIA.map(([key, name], i) => {
            const c = f[key];
            return h("li", { class: "sim__criterion" },
              h("span", { class: "sim__criterion-head" },
                h("b", null, name),
                c.score != null && h("span", { class: "sim__dots", "aria-label": `5점 중 ${c.score}점` },
                  [1, 2, 3, 4, 5].map((n) => h("i", { class: n <= c.score ? "on" : "" })),
                  h("em", null, `${c.score}`, data.previous && ` (이전 ${data.previous.scores[i]})`))),
              h("span", { class: "sim__criterion-text" }, c.feedback));
          })),
          f.comparison && section("처음과 비교하면", h("p", { class: "sim__compare" }, f.comparison)),
          f.strengths.length > 0 && section("잘한 점", h("ul", null, f.strengths.map((t) => h("li", null, t)))),
          f.missedPoints.length > 0 && section("놓친 부분", h("ul", null, f.missedPoints.map((t) => h("li", null, t)))),
          f.improvedResponse && section("이렇게 말하면 더 좋아요",
            f.originalResponse && h("p", { class: "sim__said" }, h("span", null, "내 답변"), f.originalResponse),
            h("p", { class: "sim__better" }, h("span", null, "이렇게"), f.improvedResponse)),
          f.fallback && section("이 상황의 학습 포인트", h("ul", null, data.learningPoints.map((t) => h("li", null, t)))),
          h("div", { class: "sim__result-actions" },
            h("button", { class: "chat__send", type: "button", onClick: () => showPlay(scenario, { retry: data.retry }) }, "다시 답변해보기"),
            h("button", { class: "sim__ghost", type: "button", onClick: () => showDetail(scenario) }, "같은 상황 다시하기"),
            h("button", { class: "sim__ghost", type: "button", onClick: () => showCategory(scenario.category) }, "다른 상황 선택")),
          h("p", { class: "sim__custom-hint" }, "다시 답변해보기: 같은 팀장 · 같은 상황으로 한 번 더 말해보고, 이번 결과와 비교해요.",
            data.saved === "saved" ? " · 이번 결과가 저장됐어요." : ""));
        notice.textContent = "";
        requestAnimationFrame(() => card.scrollIntoView({ block: "start", behavior: "smooth" }));
        return card;
      }

      // 상황 카드: 제목(크게) → "상황" 라벨 → 설명. 첫 대사는 아래 대화에서 팀장이 직접 말한다
      log.append(h("li", { class: "sim__context" },
        h("p", { class: "sim__context-title" }, scenario.title),
        h("span", { class: "sim__context-label" }, how.retry ? "상황 · 다시 답변하기" : "상황"),
        h("p", { class: "sim__context-body" }, scenario.context)));

      el.replaceChildren(
        bar("← 나가기", () => { if (!pending) showDetail(scenario); }, scenario.title, leaderTag),
        log,
        notice, retry,
        h("div", { class: "sim__actions" }, turnInfo, finish),
        form, endBox);
      controls();
      request("start");
    }

    load();
    return el;
  }

  // startTour: SOS 상담 채팅 화면의 안내에도 같이 쓴다 (sos.html)
  return { create, startTour };
})();
