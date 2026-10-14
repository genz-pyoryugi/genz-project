/* =========================================================
   젠지 표류기 — office scene (after the dark welcome screen)
   q: office scroll progress (0 → 1) while #office's sticky stage is pinned.
   Reads intro state only through the DOM; js/intro.js is untouched.
   Events: window 'genz-office:select' {detail:{object,label}} / 'genz-office:close'
   API: window.genzOffice.close() — clears the selected hotspot (call when a content modal closes)
   ========================================================= */
(() => {
  const office = document.getElementById('office'), stage = document.getElementById('officeStage');
  const scene = document.getElementById('officeScene'), copy = document.getElementById('officeCopy');
  const copyPs = copy.querySelectorAll('p'), hint = document.getElementById('officeHint');
  const panel = document.getElementById('officePanel'), panelKey = document.getElementById('officePanelKey');
  const panelTitle = document.getElementById('officePanelTitle'), panelClose = document.getElementById('officePanelClose');
  const hotspots = [...scene.querySelectorAll('.hotspot')];
  // intro elements this scene lines up with (read-only, except fading the hand-off bookmark out)
  const duskCopy = document.getElementById('duskCopy'), duskTs = [document.getElementById('duskT1'), document.getElementById('duskT2')];
  const ribWrap = document.querySelector('.rib2wrap');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const sm = (a, b, x) => ease(clamp((x - a) / (b - a)));

  // timeline (q)
  const COPY_OUT = [.02, .2];   // welcome lines fade out over the black
  const SHOW = [.16, .5];       // office image opacity
  const LIGHT = [.2, .78];      // brightness .08 → 1
  const ZOOM = [.16, .86];      // scale 1.03 → 1
  const READY = .8;             // fully lit: hotspots become clickable
  const HINT_MS = 2600, PULSE_STEP = .14, WAVE_STEP = .6, WELCOME_MS = 1200;

  // menu-tag icons per object (24×24, filled with currentColor)
  const ICONS = {
    monitor: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z"/>',
    files: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><rect x="10" y="17.5" width="4" height="1.4" rx=".7" fill="#fff"/>',
    notebook: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 12.2l2.6 2.6L16.2 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    calendar: '<path d="M7 2.5h2V5h6V2.5h2V5h1.5A2.5 2.5 0 0 1 21 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11A2.5 2.5 0 0 1 5.5 5H7z"/><rect x="5" y="9.5" width="14" height="9.5" rx="1" fill="#fff"/><rect x="7" y="11.5" width="3" height="3" rx=".6"/>',
    postit: '<path d="M4 4h16a1 1 0 0 1 1 1v10.5L15.5 21H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 21v-5a1 1 0 0 1 1-1h5" fill="#fff" opacity=".55"/>',
    book: '<path d="M5 3.5h8a1.5 1.5 0 0 1 1.5 1.5v3h-2V5.5h-7v13h7V16h2v3a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M16 8l4 4-4 4v-3H9v-2h7z"/>',
    pen: '<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="#fff"/>',
    radio: '<path d="M12 3a9 9 0 0 0-9 9v5.5A2.5 2.5 0 0 0 5.5 20H7a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5a2.5 2.5 0 0 0 2.5-2.5V12a9 9 0 0 0-9-9z"/>',
    default: '<circle cx="12" cy="12" r="8"/>'
  };

  // each hotspot = a traced outline (.hotspot-shape, invisible click area) + a button (.hotspot) holding the
  // glowing marker (.hotspot-dot) and its name tag, paired by data-object. All state classes live on the button.
  const IMG_W = 1672, IMG_H = 941;
  const svg = document.getElementById('hotspotShapes');
  const spots = hotspots.map((btn, i) => {
    const shape = svg.querySelector(`.hotspot-shape[data-object="${btn.dataset.object}"]`);
    const label = btn.dataset.label;
    btn.setAttribute('aria-label', label);
    btn.tabIndex = -1;                                          // focusable only once the office is lit
    btn.insertAdjacentHTML('beforeend',
      `<span class="hotspot-dot"><span class="hotspot-label"><svg class="hotspot-label__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[btn.dataset.object] || ICONS.default}</svg>` +
      '<span class="hotspot-label__text"></span><svg class="hotspot-label__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span></span>');
    const dot = btn.querySelector('.hotspot-dot');
    dot.querySelector('.hotspot-label__text').textContent = label;
    const b = shape.getBBox();                                  // the button covers the outline's box
    btn.style.setProperty('--l', (b.x / IMG_W * 100).toFixed(2) + '%');
    btn.style.setProperty('--t', (b.y / IMG_H * 100).toFixed(2) + '%');
    btn.style.setProperty('--w', (b.width / IMG_W * 100).toFixed(2) + '%');
    btn.style.setProperty('--h', (b.height / IMG_H * 100).toFixed(2) + '%');
    // marker: centre of the outline box, or data-dot="x,y" in image pixels
    const [mx, my] = btn.dataset.dot ? btn.dataset.dot.split(',').map(Number) : [b.x + b.width / 2, b.y + b.height / 2];
    dot.style.setProperty('--dx', ((mx - b.x) / b.width * 100).toFixed(2) + '%');
    dot.style.setProperty('--dy', ((my - b.y) / b.height * 100).toFixed(2) + '%');
    dot.style.setProperty('--delay', (i * PULSE_STEP).toFixed(2) + 's');
    return { btn, shape, dot, mx };
  });
  // looping glow wave: markers light up one after another from left to right
  [...spots].sort((a, b) => a.mx - b.mx).forEach((s, i) => s.dot.style.setProperty('--wave', (i * WAVE_STEP).toFixed(2) + 's'));

  // ---- hotspot states (on the button): .is-hovered / .is-active / .is-flash / .is-pulse
  let active = null;
  function select(s) {
    const { object, label, href, scroll } = s.btn.dataset;
    console.log(`${object} clicked`);
    spots.forEach(o => o !== s && o.btn.classList.remove('is-active'));
    s.btn.classList.add('is-active');
    s.btn.classList.remove('is-flash'); void s.btn.offsetWidth; s.btn.classList.add('is-flash');
    if (!reduce) ripple(s.dot);
    active = s;
    // data-href → open that page full screen over the office; otherwise the placeholder panel
    // data-title: 팝업 제목 (없으면 메뉴명)
    // data-scroll="#id" → scroll the page down to that section (e.g. the guidebook → 목차 below)
    if (scroll) { setTimeout(() => { close(); document.querySelector(scroll)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, reduce ? 0 : 280); }
    else if (href) setTimeout(() => { if (active === s) openContent(href, s.btn.dataset.title || label, s.btn.dataset.popup); }, reduce ? 0 : 280);
    else { panelKey.textContent = object; panelTitle.textContent = label; panel.hidden = false; }
    window.dispatchEvent(new CustomEvent('genz-office:select', { detail: { object, label, href } }));
  }
  function close() {
    if (active) active.btn.classList.remove('is-active', 'is-flash');
    active = null; panel.hidden = true;
    closeContent();
    window.dispatchEvent(new CustomEvent('genz-office:close'));
  }

  // ---- content popup (e.g. /community) in an iframe over the office; the office page underneath stays as is
  const content = document.getElementById('officeContent'), contentFrame = document.getElementById('officeContentFrame');
  const contentClose = document.getElementById('officeContentClose'), contentTitle = document.getElementById('officeContentTitle');
  let lockedY = 0, contentOpen = false;
  function lockScroll() {
    lockedY = scrollY;
    const bar = innerWidth - document.documentElement.clientWidth;          // keep the layout from shifting when the scrollbar hides
    document.documentElement.style.overflow = 'hidden';
    if (bar > 0) document.documentElement.style.paddingRight = bar + 'px';
  }
  function unlockScroll() {
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    if (scrollY !== lockedY) scrollTo(0, lockedY);
  }
  // popup = "chat" → a narrow chat-window popup, "phone" → the same inside a phone frame (the page brings its own header + close);
  // otherwise the big content popup with a title bar
  function openContent(href, label, popup) {
    if (contentFrame.getAttribute('src') !== href) contentFrame.src = href;   // keep it loaded for quick reopening
    content.classList.toggle('office-content--chat', popup === 'chat');
    const phone = popup === 'phone' || popup === 'phone-dark' || popup === 'phone-plain';
    content.classList.toggle('office-content--phone', phone);
    content.classList.toggle('office-content--phone-dark', popup === 'phone-dark');
    content.classList.toggle('office-content--phone-plain', popup === 'phone-plain');
    content.classList.toggle('office-content--fit', popup === 'fit');
    content.classList.toggle('office-content--medium', popup === 'medium');
    content.classList.toggle('office-content--sheet', popup === 'sheet');
    content.classList.toggle('office-content--quiz', popup === 'quiz');
    content.classList.toggle('office-content--card', popup === 'card');
    content.classList.toggle('office-content--desktop', popup === 'desktop');
    if (popup === 'fit') requestAnimationFrame(fitObject);
    if (phone) {
      const now = new Date();
      document.getElementById('officeContentTime').textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    contentFrame.title = label;
    contentTitle.textContent = label;
    content.hidden = false;
    if (!contentOpen) lockScroll();
    contentOpen = true;
    stage.classList.toggle('is-phone-open', phone);   // hides the photo's own left arm (.office-patch)
    requestAnimationFrame(() => content.classList.add('is-open'));
    contentClose.focus({ preventScroll: true });
  }
  function closeContent() {
    if (!contentOpen) return;              // closing runs once (it may be called again while the popup fades out)
    contentOpen = false;
    content.classList.remove('is-open');
    stage.classList.remove('is-phone-open');
    unlockScroll();
    setTimeout(() => { if (!content.classList.contains('is-open')) content.hidden = true; }, reduce ? 0 : 300);
  }
  contentClose.addEventListener('click', close);
  document.getElementById('officeContentBackdrop').addEventListener('click', close);
  // fit popup: scale the page's main object (the calendar) so all of it fits inside the popup, no scrolling.
  // Done from here so the page's own code stays untouched.
  const FIT_ITEM = '.calendar-object';
  function fitObject() {
    if (!content.classList.contains('office-content--fit')) return;
    let doc;
    try { doc = contentFrame.contentDocument; } catch (e) { return; }
    const item = doc && doc.querySelector(FIT_ITEM);
    if (!item) return;
    // all changes go into our own <style> — never onto React's elements (that breaks hydration of the page)
    let st = doc.getElementById('office-fit-style');
    if (!st) {
      st = doc.createElement('style');
      st.id = 'office-fit-style';
      doc.head.appendChild(st);
    }
    const base = 'html,body{overflow:hidden!important;background:transparent!important}' +
      '.calendar-scene{min-height:0!important;height:100vh;padding:0!important;display:flex;align-items:center;justify-content:center}' +
      '.calendar-object{width:1100px;flex:none;transform-origin:center}' +
      // keep the desktop layout at any popup size (the page switches layouts by viewport width) and only scale it
      '.calendar-paper{padding:43px 34px 18px!important}.paper-note{font-size:10px!important;text-align:right!important}' +
      '.source-note{display:none!important}';
    st.textContent = base;                       // layout first, then measure (offset sizes ignore transforms)
    const w = contentFrame.clientWidth, h = contentFrame.clientHeight;
    const k = Math.min(1, (h - 70) / (item.offsetHeight + 30), (w - 50) / (item.offsetWidth + 40));
    st.textContent = base + `.calendar-object{transform:scale(${k.toFixed(3)})}`;
  }

  contentFrame.addEventListener('load', () => {
    fitObject();
    // pages with their own '× → 첫 화면' link (e.g. /checklist): inside the popup the white close button does that job
    try {
      const doc = contentFrame.contentDocument;
      if (doc && !doc.getElementById('office-embed-style')) {
        const st = doc.createElement('style');
        st.id = 'office-embed-style';
        st.textContent = '.checklist-close,.quiz-close{display:none!important}' +
          // sheet popup: drop the page's office photo and let the checklist paper fill the popup
          'html,body{background:transparent!important;overflow:hidden!important}' +
          // no visible scrollbars inside the popup (areas still scroll with the wheel / touch)
          '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}' +
          '.checklist-scene{background:transparent!important;padding:24px 0 0!important;min-height:0!important;height:100vh}' +
          '.office-wash{display:none!important}.checklist-sheet{width:100%!important;height:calc(100vh - 24px)!important;min-height:0!important}' +
          // quiz: same, keeping room on the right for the pen mascot beside the paper
          // quiz popup: the paper fills the box under its title bar (even corners, no tilt); the pen mascot sits in the 210px gutter outside, on the right
          '.quiz-scene{background:transparent!important;padding:0 210px 0 0!important;min-height:0!important;height:100vh;display:block!important}' +
          '.quiz-office-shade{display:none!important}.quiz-paper{height:100vh!important;min-height:0!important;max-width:none!important;' +
          'border-radius:0 0 14px 14px!important;transform:none!important;box-shadow:none!important}' +
          '.quiz-pen-side{right:0!important;bottom:0!important;transform-origin:bottom right}' +
          // shorter popups: shrink the pen mascot so its speech bubble isn't cut off at the top
          '@media (max-height:700px){.quiz-pen-side{transform:scale(.84)}}@media (max-height:580px){.quiz-pen-side{transform:scale(.7)}}';
        doc.head.appendChild(st);
      }
    } catch (e) {}
    try {
      const doc = contentFrame.contentDocument;
      if (doc.fonts) doc.fonts.ready.then(fitObject);
    } catch (e) {}
  });
  addEventListener('resize', fitObject);

  // messages from the page in the popup (e.g. the card news' last card): open another desk object's popup in its place
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'genz-office:open') return;
    const s = spots.find(o => o.btn.dataset.object === e.data.object);
    if (s) select(s);
  });
  // messages from the page in the popup (web/sos.html): close it, or jump to a chapter of the main web below
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || !String(e.data.type).startsWith('genz-sos:')) return;
    close();
    if (e.data.type !== 'genz-sos:chapter') return;
    const web = document.getElementById('mainWebFrame'), id = String(e.data.id);
    const w = web && web.contentWindow;
    if (!w || !/^ch\d+$/.test(id)) return;
    if (w.location.hash === '#' + id && typeof w.openChapter === 'function') w.openChapter(id);
    else w.location.hash = id;
    // the main web's iframe is full height (no scroll of its own), so scroll this page to its chapter area
    setTimeout(() => {
      const target = w.document.getElementById('chapter') || w.document.body;
      const y = scrollY + web.getBoundingClientRect().top + target.getBoundingClientRect().top;
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }, 60);
  });
  // ESC while the focus is inside the (same-origin) page in the iframe
  contentFrame.addEventListener('load', () => {
    try { contentFrame.contentWindow.addEventListener('keydown', e => {
      // the page's own open dialog (e.g. a calendar sticker) closes first; ESC then closes the popup
      if (e.key === 'Escape' && !content.hidden && !contentFrame.contentDocument.querySelector('dialog[open]')) close();
    }); } catch (e) {}
  });
  function ripple(dot) {
    const r = document.createElement('span');
    r.className = 'hotspot-ripple';
    r.addEventListener('animationend', () => r.remove());
    dot.appendChild(r);
  }
  spots.forEach(s => {
    const over = { shape: false, dot: false, focus: false };
    const set = (k, v) => { over[k] = v; s.btn.classList.toggle('is-hovered', over.shape || over.dot || over.focus); };
    s.shape.addEventListener('pointerenter', () => set('shape', true));
    s.shape.addEventListener('pointerleave', () => set('shape', false));
    s.dot.addEventListener('pointerenter', () => set('dot', true));
    s.dot.addEventListener('pointerleave', () => set('dot', false));
    s.shape.addEventListener('click', () => select(s));
    s.btn.addEventListener('focus', () => set('focus', s.btn.matches(':focus-visible')));
    s.btn.addEventListener('blur', () => set('focus', false));
    s.btn.addEventListener('click', () => select(s));        // marker click (bubbles up) + keyboard Enter / Space
    s.dot.addEventListener('animationend', ev => {
      if (ev.animationName === 'hs-pulse') s.btn.classList.remove('is-pulse');
      if (ev.animationName === 'hs-flash') s.btn.classList.remove('is-flash');
    });
    s.reset = () => { over.shape = over.dot = over.focus = false; s.btn.classList.remove('is-hovered'); };
  });
  // ---- sidebar menu (top-left): one item per hotspot, in markup order; choosing one = clicking that object
  const menuBtn = document.getElementById('officeMenuBtn'), menu = document.getElementById('officeMenu');
  const menuList = document.getElementById('officeMenuList'), menuFoot = document.getElementById('officeMenuFoot'), menuScrim = document.getElementById('officeMenuScrim');
  let menuOpen = false;
  spots.forEach(s => {
    const li = document.createElement('li'), item = document.createElement('button');
    item.type = 'button';
    item.className = 'office-menu__item' + (s.btn.classList.contains('hotspot--red') ? ' office-menu__item--red' : '');
    item.innerHTML = `<span class="office-menu__icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.btn.dataset.object] || ICONS.default}</svg></span>` +
      '<span class="office-menu__text"></span><svg class="office-menu__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    item.querySelector('.office-menu__text').textContent = s.btn.dataset.label;
    // hovering an item lights up its object on the desk
    item.addEventListener('pointerenter', () => s.btn.classList.add('is-hovered'));
    item.addEventListener('pointerleave', () => s.btn.classList.remove('is-hovered'));
    item.addEventListener('click', () => { s.btn.classList.remove('is-hovered'); closeMenu(false); select(s); });
    li.appendChild(item);
    // 나가기(red) sits on its own at the bottom of the sidebar
    (s.btn.classList.contains('hotspot--red') ? menuFoot : menuList).appendChild(li);
  });
  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      stage.classList.add('is-menu-open');
      menuList.querySelector('.office-menu__item')?.focus({ preventScroll: true });
    });
  }
  function closeMenu(refocus = true) {
    if (!menuOpen) return;
    menuOpen = false;
    stage.classList.remove('is-menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (refocus && ready) menuBtn.focus({ preventScroll: true });
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, reduce ? 0 : 320);
  }
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.getElementById('officeMenuClose').addEventListener('click', () => closeMenu());
  menuScrim.addEventListener('click', () => closeMenu());

  // ---- welcome popup (first time the office lights up): "어떤 부분이 제일 고민되시나요?" + the 7 topics.
  // Choosing one opens 고민상담소 (the post-it's page) filtered to that topic: /community?chapter=01..07
  const welcome = document.getElementById('officeWelcome');
  let welcomeOpen = false;
  function openWelcome() {
    if (welcomeOpen || !ready || contentOpen || menuOpen) return;
    welcomeOpen = true;
    welcome.hidden = false;
    requestAnimationFrame(() => {
      welcome.classList.add('is-open');
      welcome.querySelector('.office-welcome__item')?.focus({ preventScroll: true });
    });
  }
  function closeWelcome() {
    if (!welcomeOpen) return;
    welcomeOpen = false;
    welcome.classList.remove('is-open');
    setTimeout(() => { if (!welcomeOpen) welcome.hidden = true; }, reduce ? 0 : 300);
  }
  welcome.querySelectorAll('.office-welcome__item').forEach(item => item.addEventListener('click', () => {
    closeWelcome();
    const s = spots.find(o => o.btn.dataset.object === 'postit');
    spots.forEach(o => o.btn.classList.toggle('is-active', o === s));
    active = s;
    openContent(`/community?chapter=${item.dataset.chapter}`, s.btn.dataset.title || s.btn.dataset.label, s.btn.dataset.popup);
  }));
  document.getElementById('officeWelcomeSkip').addEventListener('click', closeWelcome);
  welcome.addEventListener('click', e => { if (e.target === welcome) closeWelcome(); });   // click on the dim area

  panelClose.addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (welcomeOpen) closeWelcome();
    else if (menuOpen) closeMenu();
    else if (active) close();
  });
  window.genzOffice = { close };

  // ---- first entry: one staggered pulse + the hint (once per page load)
  let entered = false, ready = false;
  function setReady(on) {
    if (on === ready) return;
    ready = on;
    stage.classList.toggle('is-ready', on);
    spots.forEach(s => { s.btn.tabIndex = on ? 0 : -1; });
    menuBtn.tabIndex = on ? 0 : -1;
    if (!on) { spots.forEach(s => s.reset()); closeMenu(false); closeWelcome(); close(); return; }
    if (entered) return;
    entered = true;
    if (!reduce) spots.forEach(s => s.btn.classList.add('is-pulse'));
    hint.classList.add('is-shown');
    setTimeout(() => hint.classList.remove('is-shown'), HINT_MS);
    setTimeout(openWelcome, reduce ? 0 : WELCOME_MS);   // after the markers' first pulse
  }

  // ---- scroll-driven reveal
  let cur = 0;
  function frame() {
    const H = innerHeight, rect = office.getBoundingClientRect();
    const on = rect.top <= 0;                                   // stage pinned: the intro has ended
    const tp = clamp(-rect.top / Math.max(1, rect.height - H));
    cur = reduce ? tp : cur + (tp - cur) * .085;               // same smoothing as the intro
    if (Math.abs(tp - cur) < 1e-4) cur = tp;
    const q = on ? cur : 0;

    stage.classList.toggle('is-on', on);
    // welcome lines: overlaid exactly on the intro's (same position + current opacity), then faded out here
    copy.style.left = duskCopy.style.left;
    copy.style.setProperty('--dusk-w', duskCopy.style.getPropertyValue('--dusk-w'));
    const out = on ? 1 - sm(...COPY_OUT, q) : 0;
    copyPs.forEach((p, i) => { p.style.opacity = (out * (parseFloat(duskTs[i].style.opacity) || 0)).toFixed(3); });
    // the intro's hand-off bookmark fades with the welcome lines and stays hidden from here on
    ribWrap.style.opacity = on ? (1 - sm(...COPY_OUT, q)).toFixed(3) : '';

    scene.style.opacity = sm(...SHOW, q).toFixed(3);
    stage.style.setProperty('--zoom', lerp(1.03, 1, sm(...ZOOM, q)).toFixed(4));
    stage.style.setProperty('--bright', lerp(.08, 1, sm(...LIGHT, q)).toFixed(3));
    setReady(on && q >= READY && rect.bottom > H * .5);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
