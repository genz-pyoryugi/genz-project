Components.rookieCardnews = (article = ARTICLES.a1) => ({
  el: createDeck(rookieMistakeSlides(article)),
  destroy() {},
});

function cardnewsCategoryIds(content) {
  const article = ARTICLES[content.articleId];
  const known = new Set(CARDNEWS_CATEGORIES.map(category => category.id));
  // Explicit IDs take precedence. Only exact existing principle names are mapped.
  const ids = content.categoryIds ?? article?.categoryIds;
  if (Array.isArray(ids)) return [...new Set(ids.filter(id => known.has(id)))];
  const existing = CARDNEWS_CATEGORIES.find(category => category.name === article?.category);
  return existing ? [existing.id] : [];
}

Components.cardnewsCollection = (contents = CARDNEWS_CONTENTS) => {
  let selected = 'all';
  const buttons = [];
  const results = h('div', { class: 'cardnews-results', id: 'cardnews-results' });
  const status = h('p', { class: 'cardnews-filter-status', role: 'status', 'aria-live': 'polite' });
  const filters = [{ id: 'all', name: '전체' }, ...CARDNEWS_CATEGORIES];
  const bar = h('div', { class: 'cardnews-filters', role: 'group', 'aria-label': '카드뉴스 카테고리 필터' });

  function select(id) {
    selected = id;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === id)));
    const visible = contents.filter(content => selected === 'all' || cardnewsCategoryIds(content).includes(selected));
    // Fresh decks reset their slide index to zero on every category change.
    results.replaceChildren(...visible.map(content => {
      const article = ARTICLES[content.articleId];
      const deck = createLearningFlow(content, () =>
        content.type === 'rookieTop3' && article
          ? rookieMistakeSlides(article)
          : content.type === 'firstDayGuide' && article
            ? firstDaySlides(content, article)
            : content.type === 'communicationGuide'
              ? communicationSlides(content)
              : content.slides || (article ? [articleSlide(article)] : []));
      return h('section', { class: 'cardnews-content', 'data-content-id': content.id, 'aria-label': article?.title || content.title || '카드뉴스' }, deck);
    }));
    status.textContent = visible.length ? visible.length + '개의 카드뉴스' : '이 카테고리의 카드뉴스를 준비하고 있어요.';
    status.classList.toggle('cardnews-filter-status--empty', visible.length === 0);
  }
  filters.forEach((filter, index) => {
    const button = h('button', {
      type: 'button', class: 'cardnews-filter', 'data-category': filter.id,
      'aria-pressed': String(filter.id === 'all'), 'aria-controls': 'cardnews-results',
      onClick: () => select(filter.id),
    }, filter.name);
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % filters.length;
      if (event.key === 'ArrowLeft') target = (index + filters.length - 1) % filters.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = filters.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      buttons[target].focus();
      buttons[target].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    buttons.push(button);
    bar.append(button);
  });
  select('all');
  return { el: h('div', { class: 'cardnews-collection' }, bar, status, results), destroy() {} };
};

document.querySelector('#cardnews-preview').replaceChildren(Components.cardnewsCollection().el);
