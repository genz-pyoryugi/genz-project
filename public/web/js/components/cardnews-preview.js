// Mount only the reusable four-card component, without the former site UI.
Components.rookieCardnews = (article = ARTICLES.a1) => ({
  el: createDeck(rookieMistakeSlides(article)),
  destroy() {},
});
document.querySelector('#cardnews-preview').replaceChildren(Components.rookieCardnews().el);
