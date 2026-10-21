/* =========================================================
   젠지 표류기 — 책상에 붙인 체크리스트 메모(desk-notes.js) 간단 안내
   체크리스트를 책상에 붙였을 때 페이지를 열 때마다 한 번(새로고침하면 다시): 메모의 각 부분을 차례로 밝게 비추고 짧게 설명.
   office.js 가 붙이기가 끝난 뒤 window.genzDeskTour(noteId) 를 부른다. desk-notes.js 는 고치지 않고 클래스 이름으로만 찾는다.
   ========================================================= */
(() => {
  let seen = false;   // this page load only
  const STEPS = [
    { sel: '.desk-note__summary', title: '책상에 붙였어요!', text: '제목 부분을 끌어서 책상 위 원하는 곳으로 옮길 수 있어요.' },
    { sel: '.desk-note__items', title: '여기서 바로 체크', text: '일하면서 바로 체크해 보세요. 체크리스트 창에도 그대로 반영돼요.' },
    { sel: '.desk-note__open', title: '크게 보기', text: '누르면 체크리스트 창이 다시 크게 열려요.' },
    { sel: '.desk-note__remove', title: '붙이기 해제', text: '다 쓴 메모는 여기서 떼어낼 수 있어요.' },
  ];
  let layer = null;

  window.genzDeskTour = (noteId, force) => {
    if (layer) return;
    if (!force && seen) return;
    const card = () => [...document.querySelectorAll('.desk-note')].find(el => el.dataset.noteId === noteId);
    if (!card()) return;
    let i = 0, raf = 0;
    const spot = document.createElement('div'); spot.className = 'desk-tour__spot';
    const tip = document.createElement('div'); tip.className = 'desk-tour__tip'; tip.setAttribute('role', 'dialog');
    tip.innerHTML = '<p class="desk-tour__count"></p><p class="desk-tour__title"></p><p class="desk-tour__text"></p>' +
      '<div class="desk-tour__row"><button type="button" class="desk-tour__skip">건너뛰기</button><button type="button" class="desk-tour__next"></button></div>';
    layer = document.createElement('div'); layer.className = 'desk-tour';
    layer.append(spot, tip);
    document.body.append(layer);

    const show = () => {
      tip.querySelector('.desk-tour__count').textContent = `${i + 1} / ${STEPS.length}`;
      tip.querySelector('.desk-tour__title').textContent = STEPS[i].title;
      tip.querySelector('.desk-tour__text').textContent = STEPS[i].text;
      tip.querySelector('.desk-tour__next').textContent = i === STEPS.length - 1 ? '확인' : '다음';
      tip.querySelector('.desk-tour__next').focus({ preventScroll: true });
    };
    // follow the target every frame: the note re-renders when an item is checked, and it can be dragged
    const place = () => {
      const c = card();
      if (!c) return end();
      if (!c.open) c.open = true;
      const t = c.querySelector(STEPS[i].sel) || c;
      const r = t.getBoundingClientRect(), pad = 6;
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      // the note sits on the right of the screen: the tip goes to its left, level with the target
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const left = r.left - pad - 14 - tw >= 8 ? r.left - pad - 14 - tw : Math.min(innerWidth - tw - 8, r.right + pad + 14);
      tip.style.left = left + 'px';
      tip.style.top = Math.min(innerHeight - th - 8, Math.max(8, r.top + r.height / 2 - th / 2)) + 'px';
      raf = requestAnimationFrame(place);
    };
    const next = () => (i >= STEPS.length - 1 ? end() : (i++, show()));
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); end(); } };
    function end() {
      if (!layer) return;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey, true);
      layer.remove(); layer = null;
      seen = true;
    }
    tip.querySelector('.desk-tour__next').addEventListener('click', next);
    tip.querySelector('.desk-tour__skip').addEventListener('click', end);
    addEventListener('keydown', onKey, true);
    show();
    place();
  };
})();
