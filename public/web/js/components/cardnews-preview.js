// Mount only the reusable four-card component, without the former site UI.
Components.rookieCardnews = (article = ARTICLES.a1) => ({
  el: createDeck(rookieMistakeSlides(article)),
  destroy() {},
});

// 주제 탭(js/data/cardnews-topics.js) + 고른 주제의 카드. 주제마다 카드 묶음은 처음 열 때 한 번만 만든다.
// 주소에 ?topic=<id> 를 붙이면 그 주제로 열린다.
(() => {
  const root = document.querySelector('#cardnews-preview');
  const decks = {};
  // before: 카드뉴스를 열면 첫 카드 위 가운데에 뜨는 질문 팝업 (답을 고르면 닫힘)
  // after : 마지막 질문 카드 (점수별 안내 + 퀴즈 · SOS 버튼)
  const deckFor = (topic) => decks[topic.id] ??= topic.rookieTop3
    ? Components.rookieCardnews().el
    : withBeforePopup(createDeck([...imageSlides(topic.images), topic.after && surveySlide(topic.after)].filter(Boolean)), topic.before);

  function withBeforePopup(deck, before) {
    if (!before) return deck;
    const viewport = deck.querySelector('.cardnews__viewport');
    const box = h('div', { class: 'survey-modal__box', role: 'dialog', 'aria-modal': 'true', 'aria-label': before.question });
    const modal = h('div', { class: 'survey-modal' }, box);
    // 답하기 전에는 다음 장으로 못 넘어가게: 넘김 버튼 · 점은 잠그고, 방향키 · 스와이프는 막는다
    const locked = [deck.querySelector('.cardnews__controls'), deck.querySelector('.cardnews__dots')].filter(Boolean);
    const blockKeys = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation(); };
    const stop = (e) => e.stopPropagation();
    const blockClicks = (e) => { if (locked.some((el) => el.contains(e.target))) { e.preventDefault(); e.stopImmediatePropagation(); } };
    locked.forEach((el) => { el.inert = true; el.classList.add('is-locked'); });
    viewport.addEventListener('keydown', blockKeys, true);
    deck.addEventListener('click', blockClicks, true);
    ['pointerdown', 'pointerup'].forEach((type) => modal.addEventListener(type, stop));
    box.append(...surveySlide({ ...before, onAnswer: () => {
      modal.classList.add('is-closing');
      setTimeout(() => {
        modal.remove();
        locked.forEach((el) => { el.inert = false; el.classList.remove('is-locked'); });
        viewport.removeEventListener('keydown', blockKeys, true);
        deck.removeEventListener('click', blockClicks, true);
        viewport.focus({ preventScroll: true });
      }, 250);
    } }).filter(Boolean));
    viewport.append(modal);
    requestAnimationFrame(() => box.querySelector('.survey-card__option')?.focus({ preventScroll: true }));
    return deck;
  }

  const tabs = h('div', { class: 'cardnews-topics', role: 'tablist', 'aria-label': '카드뉴스 주제' },
    CARDNEWS_TOPICS.map((topic) => h('button', {
      class: 'cardnews-topics__tab', type: 'button', role: 'tab', 'data-topic': topic.id,
      onClick: () => show(topic),
    }, topic.label)));
  const panel = h('div', { class: 'cardnews-topics__panel', role: 'tabpanel' });

  function show(topic) {
    [...tabs.children].forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.topic === topic.id)));
    panel.setAttribute('aria-label', topic.label);
    panel.replaceChildren(deckFor(topic));
  }

  // 방향키로 탭 이동
  tabs.addEventListener('keydown', (e) => {
    const list = [...tabs.children], i = list.indexOf(document.activeElement);
    if (i < 0 || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    next.focus();
    next.click();
  });

  const wanted = new URLSearchParams(location.search).get('topic');
  show(CARDNEWS_TOPICS.find((topic) => topic.id === wanted) || CARDNEWS_TOPICS[0]);
  root.replaceChildren(tabs, panel);
})();
