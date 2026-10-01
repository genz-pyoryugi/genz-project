// ===== 카드뉴스 =====
// data: [{ title, body }]  (자체 카드 배열) 또는
//       { articles?: [기사 id], instagram?: "게시물 링크", source?: { name, title, date, url }, cards?: [{ title, body }] }
// 아래 순서로 있는 것 하나를 보여준다.
//  1) articles : js/data/articles.js의 기사 id 목록. 기사 한 건이 카드 한 장 (제목 · 요약 · 태그 · 원문 보기)
//  2) instagram: 인스타 게시물 링크. 인스타 공식 퍼가기로 실제 카드뉴스를 보여준다.
//  3) cards    : 자체 카드 (제목 · 본문)
// ctx.related(기사 id 목록)가 있으면 카드 아래에 "관련 기사" 링크를 붙인다.
// 카드는 좌우 버튼 · 점 · 스와이프 · 방향키로 넘긴다.
Components.cardnews = (raw, ctx) => {
  const data = Array.isArray(raw) ? { cards: raw } : raw;
  const { instagram, source } = data;
  const articles = (data.articles || []).map((id) => ARTICLES[id]).filter(Boolean);

  let body;
  let credit = null;

  if (articles.length) {
    body = createDeck(articles.map(articleSlide));
    credit = h("p", { class: "cardnews__source" },
      "출처: 동아일보 · 기사 제목과 요약만 소개하며, 전체 내용은 각 카드의 원문 보기에서 확인할 수 있어요.");
  } else if (instagram) {
    body = createInstagram(instagram);
    const originUrl = source?.url || instagram;
    credit = h("p", { class: "cardnews__source" },
      source && `출처: ${source.name}${source.title ? ` 「${source.title}」` : ""}${source.date ? ` (${source.date})` : ""} `,
      h("a", { href: originUrl, target: "_blank", rel: "noopener" }, "원문 보기 ↗"));
  } else {
    body = createDeck(data.cards.map((card, i) => [
      h("span", { class: "cardnews__label" }, `CARD ${String(i + 1).padStart(2, "0")}`),
      h("h3", { class: "cardnews__title" }, card.title),
      h("p", { class: "cardnews__body" }, card.body),
    ]));
  }

  const related = (ctx?.related || []).map((id) => ARTICLES[id]).filter(Boolean);
  const relatedList = related.length > 0 && h("div", { class: "cardnews__related" },
    h("h4", { class: "cardnews__related-title" }, "관련 기사 · 동아일보"),
    h("ul", null, related.map((article) =>
      h("li", null,
        h("a", { href: article.url, target: "_blank", rel: "noopener" },
          h("span", { class: "cardnews__related-year" }, article.year),
          h("span", null, article.title),
          h("span", { "aria-hidden": "true" }, " ↗"))))));

  const el = h("div", { class: "cardnews" }, body, credit, relatedList);
  return { el, destroy() {} };
};

// --- 기사 카드 한 장 ---
function articleSlide(article) {
  return [
    h("div", { class: "cardnews__meta" },
      h("span", { class: "cardnews__press" }, "동아일보"),
      h("span", null, `${article.year} · ${article.category}`)),
    h("h3", { class: "cardnews__headline" }, article.title),
    h("p", { class: "cardnews__summary" }, article.summary),
    h("ul", { class: "cardnews__tags" }, article.tags.map((tag) => h("li", null, `#${tag}`))),
    h("a", {
      class: "cardnews__origin",
      href: article.url,
      target: "_blank",
      rel: "noopener",
    }, "원문 보기 ↗"),
  ];
}

// --- 인스타그램 퍼가기 ---
// 인스타 embed.js가 blockquote를 실제 게시물 화면(iframe)으로 바꿔준다. 스크립트는 한 번만 불러온다.
function createInstagram(url) {
  const embed = h("div", { class: "cardnews__embed" },
    h("blockquote", {
        class: "instagram-media",
        "data-instgrm-permalink": url,
        "data-instgrm-version": "14",
      },
      h("a", { href: url, target: "_blank", rel: "noopener" }, "Instagram에서 카드뉴스 보기")));

  // 화면에 붙은 뒤에 변환해야 하므로 다음 프레임에 처리
  requestAnimationFrame(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    } else if (!document.querySelector("script[data-instagram-embed]")) {
      document.head.append(h("script", {
        src: "https://www.instagram.com/embed.js",
        async: true,
        "data-instagram-embed": true,
      }));
    }
  });

  return embed;
}

// --- 카드 넘기기 (slides: 카드마다 안에 넣을 요소 배열) ---
function createDeck(slides) {
  let index = 0;

  const cards = slides.map((content, i) =>
    h("article", {
      class: "cardnews__card",
      "aria-roledescription": "카드",
      "aria-label": `${i + 1} / ${slides.length}`,
    }, content));

  const track = h("div", { class: "cardnews__track" }, cards);

  const viewport = h("div", {
    class: "cardnews__viewport",
    tabindex: "0",
    "aria-label": "카드뉴스. 좌우 방향키로 넘길 수 있어요",
  }, track);

  const counter = h("span", { class: "cardnews__counter", "aria-live": "polite" });
  const prevBtn = h("button", {
    class: "cardnews__nav", type: "button", "aria-label": "이전 카드", onClick: () => go(index - 1),
  }, "‹");
  const nextBtn = h("button", {
    class: "cardnews__nav", type: "button", "aria-label": "다음 카드", onClick: () => go(index + 1),
  }, "›");
  const dots = h("div", { class: "cardnews__dots" },
    slides.map((_, i) => h("button", {
      class: "cardnews__dot", type: "button", "aria-label": `${i + 1}번 카드`, onClick: () => go(i),
    })));

  function go(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    track.style.transform = `translateX(${-index * 100}%)`;
    counter.textContent = `${index + 1} / ${slides.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    // 화면 밖 카드의 링크는 탭 키로 가지 않게
    cards.forEach((card, j) => { card.inert = j !== index; });
    [...dots.children].forEach((dot, j) => dot.setAttribute("aria-current", String(j === index)));
  }

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  });

  // 스와이프: 40px 이상 끌면 넘김
  let startX = null;
  viewport.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  viewport.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
  viewport.addEventListener("pointercancel", () => { startX = null; });

  go(0);

  return h("div", { class: "cardnews__deck" },
    viewport,
    h("div", { class: "cardnews__controls" }, prevBtn, counter, nextBtn),
    dots);
}
