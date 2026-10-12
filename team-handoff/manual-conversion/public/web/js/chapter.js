// ===== 챕터 화면 =====
// 목차(#ch1 ~ #ch7)를 누르면 목차 아래 챕터 영역에 해당 챕터를 그린다.
//
// 탭은 최대 2단이다.
//  1단 소주제 (선택): 챕터 데이터에 topics와 content가 있으면 제목 아래에 소주제 탭을 만든다.
//      topics : [{ key: "mail", label: "메일" }, ...]
//      content: { mail: { cardnews, shortform, quiz, checklist, radio, related? }, ... }
//      소주제를 바꿔도 보고 있던 콘텐츠 형식(2단)은 그대로 두고 내용만 바꾼다.
//  2단 콘텐츠 형식: 카드뉴스 · 숏폼 · 퀴즈 · 체크리스트 · 보이는 라디오
//  소주제가 없는 챕터는 챕터 데이터에 5가지 형식이 바로 들어 있다.
const FORMATS = [
  { key: "guide", label: "핵심 가이드", component: "guide" },
  { key: "adventure", label: "상황 선택 게임", component: "adventure" },
  { key: "cardnews", label: "카드뉴스", component: "cardnews" },
  { key: "shortform", label: "숏폼", component: "shorts" },
  { key: "quiz", label: "퀴즈", component: "quiz" },
  { key: "checklist", label: "체크리스트", component: "checklist" },
  { key: "radio", label: "보이는 라디오", component: "radio" },
];

const chapterSection = document.querySelector("#chapter");
const tocLinks = document.querySelectorAll(".toc__item");
let activeComponent = null;

// 컴포넌트 상태 (퀴즈 진행 등). "챕터-소주제:형식" 별로 따로 두어, 소주제를 오가도 유지된다.
const componentState = new Map();

// 좌우 방향키로 탭 이동
function tabKeys(tabs, select) {
  return (e) => {
    const cur = tabs.indexOf(document.activeElement);
    if (cur < 0) return;
    if (e.key === "ArrowRight") select((cur + 1) % tabs.length, true);
    if (e.key === "ArrowLeft") select((cur - 1 + tabs.length) % tabs.length, true);
  };
}

function markSelected(tabs, index) {
  tabs.forEach((tab, i) => {
    tab.setAttribute("aria-selected", String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
}

function openChapter(id) {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const chapter = CHAPTERS[index];
  if (!chapter) return;
  const formats = chapter.formats
    ? chapter.formats.map(key => FORMATS.find(format => format.key === key)).filter(Boolean)
    : FORMATS.filter(format => !["guide", "adventure"].includes(format.key));

  const topics = chapter.topics || null;
  let topicIndex = 0;
  let formatIndex = 0; // 기본: 첫 소주제 + 카드뉴스

  const panel = h("div", { class: "chapter__panel", id: "chapter-panel", role: "tabpanel" });

  // --- 1단: 소주제 탭 ---
  const topicTabs = topics
    ? topics.map((topic, i) =>
        h("button", {
          class: "chapter__topic",
          type: "button",
          role: "tab",
          id: `topic-${topic.key}`,
          "aria-controls": "chapter-panel",
          onClick: () => selectTopic(i),
        }, topic.label))
    : [];

  // --- 2단: 콘텐츠 형식 탭 ---
  const formatTabs = formats.map((format, i) =>
    h("button", {
      class: "chapter__tab",
      type: "button",
      role: "tab",
      id: `tab-${format.key}`,
      "aria-controls": "chapter-panel",
      onClick: () => selectFormat(i),
    }, format.label));

  function selectTopic(i, focus) {
    topicIndex = i;
    markSelected(topicTabs, i);
    renderPanel();
    if (focus) topicTabs[i].focus();
  }

  function selectFormat(i, focus) {
    formatIndex = i;
    markSelected(formatTabs, i);
    renderPanel();
    if (focus) formatTabs[i].focus();
  }

  function renderPanel() {
    activeComponent?.destroy();

    const format = formats[formatIndex];
    const topic = topics?.[topicIndex];
    const source = topic ? chapter.content[topic.key] : chapter;
    const scope = topic ? `${chapter.id}-${topic.key}` : chapter.id;
    const stateKey = `${scope}:${format.key}`;
    if (!componentState.has(stateKey)) componentState.set(stateKey, {});

    const ctx = {
      category: chapter.title,               // DB 데이터를 고르는 기준 (예: 첫인상 & 대면)
      topic: topic?.label,                   // 소주제 이름 (예: 메일)
      scope,                                 // 저장 키 등에 쓰는 이름 (예: ch2-mail)
      state: componentState.get(stateKey),   // 소주제·형식별로 유지되는 상태
      related: source.related || [],         // 관련 기사 id (카드뉴스 아래 표시)
      localOnly: chapter.localOnly === true,
      source: chapter.source,
    };

    activeComponent = Components[format.component](source[format.key], ctx);
    panel.setAttribute("aria-labelledby",
      [topic && `topic-${topic.key}`, `tab-${format.key}`].filter(Boolean).join(" "));
    panel.replaceChildren(activeComponent.el);

    // 짧은 페이드
    panel.classList.remove("is-fading");
    void panel.offsetWidth;
    panel.classList.add("is-fading");
  }

  // --- 머리말 ---
  const head = h("header", { class: "chapter__head" },
    h("span", { class: "chapter__num" }, chapter.num),
    h("h2", { class: "chapter__title" }, chapter.title),
    topics
      ? h("div", {
          class: "chapter__topics",
          role: "tablist",
          "aria-label": "소주제",
          onKeydown: tabKeys(topicTabs, selectTopic),
        }, topicTabs)
      : h("p", { class: "chapter__desc" }, chapter.desc));

  const formatList = h("div", {
    class: "chapter__tabs",
    role: "tablist",
    "aria-label": "콘텐츠 형식",
    onKeydown: tabKeys(formatTabs, selectFormat),
  }, formatTabs);

  // --- 이전 / 다음 챕터 ---
  const prev = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];
  const pager = h("nav", { class: "chapter__pager", "aria-label": "챕터 이동" },
    prev ? h("a", { class: "chapter__pager-link", href: `#${prev.id}` }, `← ${prev.num} ${prev.title}`) : h("span"),
    h("a", { class: "chapter__pager-link chapter__pager-link--toc", href: "#hero" }, "목차"),
    next ? h("a", { class: "chapter__pager-link", href: `#${next.id}` }, `${next.num} ${next.title} →`) : h("span"));

  const sourceNotice = chapter.source && h("aside", { class: "manual-source" },
    h("p", null, `출처: ${chapter.source.title}`),
    h("p", null, chapter.uploadedManual ? "AI가 만든 학습 자료입니다. 내용과 근거 페이지를 원문과 확인해 주세요. 대화와 상황 결과는 학습용 예시입니다." : "첨부 PDF를 재구성한 학습 샘플입니다. 상황 예시는 연습용이며 회사의 추가 규정이 아닙니다."),
    h("p", null, chapter.formats?.includes("guide") ? "핵심 가이드 → 상황 선택 게임 → 퀴즈 → 실천 체크리스트" : "카드뉴스로 이해하고 → 퀴즈로 확인하고 → 체크리스트로 실천해 보세요."),
    h("div", { class: "manual-source__links" }, Array.from({ length: chapter.source.pages }, (_, i) =>
      h("a", { href: `${chapter.source.url}#page=${i + 1}`, target: "_blank", rel: "noopener" }, `원문 ${i + 1}쪽 ↗`))));
  chapterSection.replaceChildren(...[head, sourceNotice, formatList, panel, pager].filter(Boolean));

  if (topics) markSelected(topicTabs, topicIndex);
  markSelected(formatTabs, formatIndex);
  renderPanel();
  chapterSection.hidden = false;

  tocLinks.forEach((link) => {
    if (link.getAttribute("href") === `#${chapter.id}`) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });

  chapterSection.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

// 주소의 #ch1 ~ #ch7 에 맞춰 챕터를 연다 (뒤로 가기도 동작)
function route() {
  if (/^#ch\d+$/.test(location.hash)) openChapter(location.hash.slice(1));
}

window.addEventListener("hashchange", route);

// 이미 열린 챕터를 다시 누르면 hashchange가 안 생기므로 직접 스크롤
tocLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    if (link.getAttribute("href") !== location.hash) return;
    e.preventDefault();
    chapterSection.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
});

route();
