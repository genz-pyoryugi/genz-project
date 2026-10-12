// ===== 채팅창 =====
// 첫 화면 오른쪽 아래 채팅 책을 클릭하면 책 왼쪽에 펼쳐지는 채팅창.
// 뒤 화면은 반투명하게 어두워진다. (열고 닫기는 js/book.js가 BookChat.open / close로 부른다)
//
// 답변은 AI 상담을 붙일 자리(reply())만 두었다. 연결 전에는 준비 중 안내로 답한다.
const BookChat = (() => {
  const SUGGESTIONS = ["메일 제목 어떻게 써요?", "지각할 것 같아요", "회식 거절해도 되나요?", "업무 실수를 했어요"];
  const GREETING = "무엇이든 물어보세요";

  let panel = null;
  let overlay = null;
  let log = null;
  let input = null;
  let isOpen = false;
  let mode = "normal"; // 창 크기: normal · min(제목줄만) · max(왼쪽으로 크게)
  let lastGeo = null;
  let maxBtn = null;
  let modeTabs = []; // 왼쪽 위 Chat / 시뮬레이션 전환 버튼
  const views = {};  // 버전별 화면

  // 창 버튼 아이콘 (윈도우 창 버튼처럼 가는 선)
  const ICONS = {
    min: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5.5h10"/></svg>',
    max: '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9"/></svg>',
    restore: '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="0.5" y="2.5" width="7" height="7"/><path d="M2.5 2.5v-2h7v7h-2"/></svg>',
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0.5 0.5l9 9M9.5 0.5l-9 9"/></svg>',
  };

  function winButton(name, label, onClick) {
    const btn = h("button", { class: `chat__win chat__win--${name}`, type: "button", "aria-label": label, title: label, onClick });
    btn.innerHTML = ICONS[name];
    return btn;
  }

  // 책갈피 쪽에서 닫기를 처리하도록 book.js가 채워 넣는다
  const api = { onRequestClose: () => {}, open, close, position };

  function build() {
    overlay = h("div", { class: "chat-overlay", onClick: () => api.onRequestClose() });

    log = h("ol", { class: "chat__log", role: "log", "aria-live": "polite" });
    input = h("input", {
      class: "chat__input",
      type: "text",
      placeholder: "상황을 적어 주세요 (예: 회의에서 말을 못 하겠어요)",
      "aria-label": "메시지",
      autocomplete: "off",
    });

    const form = h("form", {
      class: "chat__form",
      onSubmit: (e) => {
        e.preventDefault();
        send(input.value);
      },
    }, input, h("button", { class: "chat__send", type: "submit" }, "보내기"));

    panel = h("section", {
        class: "chat",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "chat-title",
        hidden: true,
        onKeydown: (e) => { if (e.key === "Escape") api.onRequestClose(); },
      },
      h("header", { class: "chat__head" },
        // 왼쪽 위: Chat 버전 / 시뮬레이션 버전 전환
        h("div", { class: "chat__versions", role: "tablist", "aria-label": "버전" },
          (modeTabs = [
            h("button", { class: "chat__version", type: "button", role: "tab", "data-view": "chat", onClick: () => showView("chat") }, "Chat"),
            h("button", { class: "chat__version", type: "button", role: "tab", "data-view": "sim", onClick: () => showView("sim") }, "시뮬레이션"),
          ])),
        h("div", null,
          h("h2", { class: "chat__title", id: "chat-title" }, "표류 상담소"),
          h("p", { class: "chat__sub" }, "궁금한 직장생활 상황을 물어보세요")),
        h("div", { class: "chat__controls" },
          winButton("min", "최소화", () => setMode(mode === "min" ? "normal" : "min")),
          (maxBtn = winButton("max", "최대화", () => setMode(mode === "max" ? "normal" : "max"))),
          winButton("close", "닫기", () => api.onRequestClose()))),
      // Chat 버전: 키워드로 챕터를 찾아 주는 대화
      (views.chat = h("div", { class: "chat__view", role: "tabpanel" },
        log,
        h("div", { class: "chat__chips" },
          SUGGESTIONS.map((text) =>
            h("button", { class: "chat__chip", type: "button", onClick: () => send(text) }, text))),
        form)),
      // 시뮬레이션 버전: DB 상황으로 AI팀장과 역할극 연습 (js/simulation.js)
      (views.sim = Simulation.create()));

    document.body.append(overlay);
    // 채팅창은 첫 화면(hero) 안에 두어 책과 함께 움직이게 한다
    document.querySelector(".hero").append(panel);

    // 시작화면: 상담사 두 명(여 · 남) 그림 + 첫인사 (대화가 쌓이면 위로 밀려 올라감)
    log.append(h("li", { class: "chat__intro" },
      h("img", {
        class: "chat__intro-img",
        src: "assets/picture/chat_woman.png",
        alt: "표류 상담소 여성 상담사",
      }),
      h("img", {
        class: "chat__intro-img",
        src: "assets/picture/chat_man.png",
        alt: "표류 상담소 남성 상담사",
      })));
    addMessage("bot", GREETING);
    showView("chat");
  }

  // Chat / 시뮬레이션 전환 (각 화면의 내용은 그대로 유지)
  function showView(name) {
    modeTabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.view === name)));
    Object.entries(views).forEach(([key, view]) => { view.hidden = key !== name; });
    if (name === "chat" && mode !== "min") input.focus({ preventScroll: true });
  }

  function addMessage(who, text, extra) {
    const item = h("li", { class: `chat__msg chat__msg--${who}` },
      h("p", { class: "chat__bubble" }, text),
      extra);
    log.append(item);
    log.scrollTop = log.scrollHeight;
    return item;
  }

  function send(raw) {
    const text = raw.trim();
    if (!text) return;
    input.value = "";
    addMessage("user", text);

    const typing = addMessage("bot", "…");
    typing.classList.add("is-typing");
    setTimeout(() => {
      typing.remove();
      reply(text);
    }, 600);
  }

  // AI 상담 답변 자리 (Supabase 등으로 연결 예정). text = 사용자가 보낸 질문
  function reply(text) {
    addMessage("bot", "AI 상담 연결을 준비하고 있어요.\n조금만 기다려 주세요!");
  }

  // geo: 화면 좌표 { right: 책갈피 왼쪽 끝, top: 책갈피 끝, bottom: 책 위 모서리 }
  // 오른쪽 끝을 책갈피 왼쪽 가장자리에, 위쪽을 책갈피 끝에 딱 붙인다.
  // (book.js가 책갈피가 움직이는 동안 매 프레임 불러서 올라가는 중에도 붙어 따라간다)
  function position(geo) {
    if (!panel) return;
    lastGeo = geo;
    const hero = panel.parentElement.getBoundingClientRect();
    // 최대화: 화면 전체 (위치·크기는 CSS .chat.is-max가 정함)
    if (mode === "max") {
      panel.style.left = panel.style.top = panel.style.width = panel.style.height = "";
      return;
    }
    const right = Math.round(geo.right - hero.left);
    const width = Math.min(420, right - 16); // 화면 왼쪽 여백 16px

    panel.style.left = `${right - width}px`;
    panel.style.width = `${width}px`;
    panel.style.top = `${Math.round(geo.top - hero.top)}px`;
    panel.style.height = mode === "min" ? "" : `${Math.max(260, Math.round(geo.bottom - geo.top))}px`;
  }

  function setMode(next) {
    mode = next;
    panel.classList.toggle("is-min", mode === "min");
    panel.classList.toggle("is-max", mode === "max");
    maxBtn.innerHTML = ICONS[mode === "max" ? "restore" : "max"];
    const label = mode === "max" ? "이전 크기로" : "최대화";
    maxBtn.setAttribute("aria-label", label);
    maxBtn.title = label;
    if (lastGeo) position(lastGeo);
    if (mode !== "min") input.focus({ preventScroll: true });
  }

  function open(geo) {
    if (!panel) build();
    if (!isOpen && mode !== "normal") setMode("normal"); // 열 때마다 기본 크기로
    position(geo);
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    overlay.classList.add("is-open");
    document.documentElement.classList.add("is-chat-open");
    requestAnimationFrame(() => panel.classList.add("is-open"));
    setTimeout(() => { if (isOpen) input.focus({ preventScroll: true }); }, 450);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("is-chat-open");
    setTimeout(() => { if (!isOpen) panel.hidden = true; }, 300);
    if (panel.contains(document.activeElement)) document.activeElement.blur();
  }

  return api;
})();
