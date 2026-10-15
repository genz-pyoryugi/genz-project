// ===== 카드뉴스 =====
// data: [{ title, body }]  (자체 카드 배열) 또는
//       { articles?: [기사 id], instagram?: "게시물 링크", source?: { name, title, date, url }, cards?: [{ title, body }] }
// 아래 순서로 있는 것 하나를 보여준다.
//  1) articles : js/data/articles.js의 기사 id 목록. 기사 한 건이 카드 한 장 (제목 · 요약 · 태그 · 원문 보기)
//  2) instagram: 인스타 게시물 링크. 인스타 공식 퍼가기로 실제 카드뉴스를 보여준다.
//  3) cards    : 자체 카드 (제목 · 본문)
// ctx.related(기사 id 목록)가 있으면 카드 아래에 "관련 기사" 링크를 붙인다.
// 카드는 좌우 버튼 · 점 · 스와이프 · 방향키로 넘긴다.
// DB contents 테이블에 이 챕터의 기사가 있으면 그 기사들을 카드로, 없으면 chapters.js의 카드뉴스를 보여준다.
const PRESS_NAMES = { donga: "동아일보", yna: "연합뉴스", newsis: "뉴시스" };

Components.cardnews = (localData, ctx) => localData?.rookieTop3
  ? renderCardnews(localData, ctx)
  : fromTable("contents", ctx, {
  fallback: localData,
  toData: (rows) => {
    const articles = rows
      .filter((row) => row.title && row.url)
      .map((row) => ({
        title: row.title,
        summary: row.summary || "",
        year: row.published_year ? String(row.published_year) : "",
        category: row.situation || "",
        tags: String(row.keyword || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        url: row.url,
        press: PRESS_NAMES[row.source] || row.source || "",
      }));
    return articles.length ? { articles } : null;
  },
  render: renderCardnews,
});

function renderCardnews(raw, ctx) {
  const data = Array.isArray(raw) ? { cards: raw } : raw;
  const { instagram, source } = data;
  // 기사 id(articles.js) 또는 DB에서 받은 기사 객체
  const articles = (data.articles || [])
    .map((article) => (typeof article === "string" ? ARTICLES[article] : article))
    .filter(Boolean);

  let body;
  let credit = null;

  if (articles.length) {
    body = createDeck(articles.flatMap((article) =>
      article.url?.includes("86918805") || article.title.includes("신입사원 치명적")
        ? rookieMistakeSlides(article)
        : [articleSlide(article)]));
    const presses = [...new Set(articles.map((article) => article.press || "동아일보"))].join(" · ");
    credit = h("p", { class: "cardnews__source" },
      `출처: ${presses} · 기사 제목과 요약만 소개하며, 전체 내용은 각 카드의 원문 보기에서 확인할 수 있어요.`);
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
}

// --- 기사 카드 한 장 ---
function articleSlide(article) {
  return [
    h("div", { class: "cardnews__meta" },
      h("span", { class: "cardnews__press" }, article.press || "동아일보"),
      h("span", null, [article.year, article.category].filter(Boolean).join(" · "))),
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

// --- 완성된 카드 이미지 (images: [{ src, alt }]) — 카드 한 장에 이미지 한 장 ---
function imageSlides(images) {
  return images.map(({ src, alt }, i) => {
    const content = [h("img", {
      class: "cardnews__image", src, alt, draggable: "false",
      loading: i === 0 ? "eager" : "lazy", decoding: "async",
    })];
    content.image = true;
    return content;
  });
}

// --- 질문 카드 (카드뉴스 앞 · 뒤) ---
// onAnswer?(i): 답을 고르면 부른다 (results 없는 질문 — 예: 카드뉴스 앞 가운데 팝업)
// survey: { label, question, options: [5개], scale?: true(1~5 눈금 + 양 끝 이름),
//           results?: [{ min, title, text, ctas: [{ label, object, href, secondary? }] }] (점수별 안내 + 이동 버튼) }
// 답을 고르면 앞 질문 카드(results 없음)는 다음 카드로 넘어가고, 뒤 질문 카드는 점수에 맞는 안내와 버튼을 보여준다.
function surveySlide(survey) {
  const result = h("div", { class: "survey-card__result", "aria-live": "polite" });
  const choose = (i, el) => {
    if (survey.answer != null) return;     // 답은 한 번만 고를 수 있다 (고른 뒤에는 보기가 잠김)
    survey.answer = i;
    [...list.children].forEach((option, j) => {
      option.setAttribute("aria-checked", String(j === i));
      option.disabled = true;
    });
    if (survey.results) {
      const next = survey.results.find((r) => i + 1 >= r.min);
      result.replaceChildren(
        h("p", { class: "survey-card__message-title" }, next.title),
        h("p", { class: "survey-card__message" }, next.text),
        h("div", { class: "survey-card__ctas" }, next.ctas.map((cta) => h("a", {
          class: `survey-card__cta${cta.secondary ? " survey-card__cta--secondary" : ""}`,
          href: cta.href, onClick: (e) => openFromCard(e, cta),
        }, cta.label))));
    } else {
      // 앞 질문: 잠깐 보여 준 뒤 onAnswer(가운데 팝업 닫기)가 있으면 그것을, 없으면 다음 카드로
      setTimeout(() => survey.onAnswer
        ? survey.onAnswer(i)
        : el.closest(".cardnews__deck")?.querySelector(".cardnews__controls .cardnews__nav:last-child")?.click(), 450);
    }
  };
  const list = h("div", {
    class: `survey-card__options${survey.scale ? " survey-card__options--scale" : ""}`,
    role: "radiogroup", "aria-label": survey.question.replace(/\n/g, " "),
  }, survey.options.map((option, i) => h("button", {
    class: "survey-card__option", type: "button", role: "radio", "aria-checked": "false",
    "aria-label": option,
    onClick: (e) => choose(i, e.currentTarget),
  }, survey.scale ? h("span", { class: "survey-card__num" }, String(i + 1)) : option)));
  const content = [
    survey.label && h("span", { class: "survey-card__label" }, survey.label),
    h("h3", { class: "survey-card__question" }, survey.question),
    list,
    survey.scale && h("div", { class: "survey-card__ends", "aria-hidden": "true" },
      h("span", null, survey.options[0]), h("span", null, "→"), h("span", null, survey.options[survey.options.length - 1])),
    result,
  ];
  content.survey = true;
  return content;
}

// 사무실 팝업 안이면 사무실에 그 물건(퀴즈 · SOS)을 열어 달라고 하고, 따로 열린 페이지면 그냥 링크로 이동
function openFromCard(e, target) {
  if (window.parent === window) return;
  e.preventDefault();
  window.parent.postMessage({ type: "genz-office:open", object: target.object }, location.origin);
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
      class: `cardnews__card${content.rookie ? " cardnews__card--rookie" : ""}${content.image ? " cardnews__card--image" : ""}${content.survey ? " cardnews__card--survey" : ""}`,
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

// Reusable 1080 × 1350 image cards; canvas text uses the actual Pretendard font.
const ROOKIE_MISTAKES = [
  { title: '지시와 다른 방향으로 업무 진행', percent: 18.5, lines: ['상사의 의도를 잘못 파악하여', '엉뚱한 결과물을 내는 실수입니다.'], tip: ['업무를 시작하기 전,', '목적과 결과물부터 확인하세요.'] },
  { title: '근태 및 복장 등 기본 예의 실수', percent: 16.7, lines: ['지각이나 부적절한 복장 등', '직장 내 기본 매너를 지키지 않는 행동입니다.'], tip: ['시간 약속과 복장 규정을', '미리 확인하는 습관을 들이세요.'] },
  { title: '상사 뒷담화 등 말실수', percent: 14.7, lines: ['언행 불일치나 뒷담화 등으로', '동료와의 관계를 잃는 말실수입니다.'], tip: ['가벼운 한마디도', '상대의 입장에서 생각하세요.'] },
];
const rookieArtworkPromises = {};
function rookieArtwork(index) {
  const source = index === 0 ? '/web/assets/picture/rookie-mistakes-no-bubbles-beige.png'
    : index === 1 ? '/web/assets/picture/rookie-punctuality-dress-beige.png'
    : '/web/assets/picture/rookie-mistakes-art-beige.png';
  return rookieArtworkPromises[source] ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { delete rookieArtworkPromises[source]; reject(new Error('삽화를 불러오지 못했습니다.')); };
    image.src = source;
  });
}
function rookieMistakeSlides(article) {
  return Array.from({ length: 4 }, (_, index) => {
    const canvas = h('canvas', { width: 1080, height: 1350, class: 'rookie-card__image', role: 'img', 'aria-label': index < 3 ? `${index + 1}위: ${ROOKIE_MISTAKES[index].title} (${ROOKIE_MISTAKES[index].percent}%). ${ROOKIE_MISTAKES[index].lines.join(' ')}` : '신입사원 치명적 실수 TOP 3. 원문에서 자세히 확인하세요.' });
    const content = [canvas];
    if (index === 3) content.push(h('a', { href: article.url, target: '_blank', rel: 'noopener noreferrer', class: 'rookie-card__source', 'aria-label': '원문보기: 신입사원 치명적인 실수 TOP 3' }));
    content.rookie = true;
    const status = h('span', { class: 'rookie-card__status', role: 'status' }, '이미지를 준비하고 있어요…');
    content.push(status);
    Promise.all([index < 3 ? rookieArtwork(index) : null, document.fonts.load('700 48px Pretendard'), document.fonts.load('500 36px Pretendard')]).then(([art]) => {
      drawRookieCard(canvas, art, index);
      status.remove();
    }).catch(() => { status.textContent = '이미지를 불러오지 못했습니다. 새로고침해 주세요.'; });
    return content;
  });
}
function drawRookieCard(canvas, art, index) {
  const c = canvas.getContext('2d');
  c.fillStyle = '#fdf9f2'; c.fillRect(0, 0, 1080, 1350);
  const text = (value, x, y, size = 42, weight = 700, color = '#202b33') => {
    c.font = `${weight} ${size}px Pretendard`; c.fillStyle = color; c.fillText(value, x, y);
  };
  const pill = (x, y, w, height, color) => { c.beginPath(); c.roundRect(x, y, w, height, height / 2); c.fillStyle = color; c.fill(); };
  text('신입사원 치명적 실수', 64, 90, 39);
  text('TOP 3', 64, 157, 62, 800, '#086bce');
  if (index < 3) {
    const panelWidth = index === 1 ? art.width : art.width / 3;
    const illustrationWidth = 470 * panelWidth / art.height;
    c.drawImage(art, index === 1 ? 0 : panelWidth * index, 0, panelWidth, art.height,
      (1080 - illustrationWidth) / 2, 192, illustrationWidth, 470);
    c.strokeStyle = '#23333e'; c.lineWidth = 3; c.beginPath(); c.moveTo(64, 672); c.lineTo(1016, 672); c.stroke();
    const data = ROOKIE_MISTAKES[index];
    text(`${index + 1}위`, 64, 750, 60, 800, '#086bce');
    text(data.title, 64, 828, 48, 800);
    data.lines.forEach((line, i) => text(line, 64, 902 + i * 55, 38, 500));
    pill(64, 993, 760, 48, '#ffffff');
    c.strokeStyle = '#253744'; c.lineWidth = 3; c.stroke();
    pill(64, 993, 760 * data.percent / 100, 48, '#086bce');
    text(`${data.percent}%`, 850, 1034, 46, 800);
    drawRookieTip(c, data.tip);
  } else {
    text('작은 실수도,', 64, 420, 68, 800);
    text('미리 알면 줄일 수 있어요.', 64, 509, 65, 800);
    text('TOP 3와 더 많은 실수 유형,', 64, 650, 40, 500);
    text('자세한 조사 내용은 원문에서 확인하세요.', 64, 710, 40, 500);
    pill(64, 900, 952, 135, '#086bce');
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    text('원문보기', 540, 967.5, 48, 800, '#ffffff');
    c.restore();
  }
}

// All three ranked cards share the first card's exact tip layout.
function drawRookieTip(c, lines) {
  c.save();
  c.beginPath(); c.roundRect(64, 1085, 952, 158, 79);
  c.fillStyle = '#f1e8d8'; c.fill();
  drawTipLightbulb(c, 160, 1164);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#175487';
  c.font = '600 34px Pretendard';
  c.fillText(lines[0].replace(/,$/, ''), 248, 1147);
  c.font = '800 36px Pretendard';
  c.fillText(lines[1], 248, 1196);
  c.restore();
}

// Draw a crisp lightbulb badge at the same resolution as the card image.
function drawTipLightbulb(c, x, y) {
  c.save();
  c.translate(x, y);
  c.beginPath(); c.arc(0, 0, 52, 0, Math.PI * 2);
  c.fillStyle = '#ffd044'; c.fill();
  c.strokeStyle = '#695127'; c.lineWidth = 5;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-12, 13);
  c.bezierCurveTo(-12, 2, -23, -1, -23, -17);
  c.bezierCurveTo(-23, -46, 23, -46, 23, -17);
  c.bezierCurveTo(23, -1, 12, 2, 12, 13);
  c.closePath(); c.fillStyle = '#fff3bb'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -5);
  c.moveTo(-8, -13); c.lineTo(0, -5); c.lineTo(8, -13); c.stroke();
  c.beginPath(); c.roundRect(-12, 14, 24, 14, 4);
  c.fillStyle = '#a48b57'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-5, 34); c.lineTo(5, 34); c.stroke();
  c.restore();
}
