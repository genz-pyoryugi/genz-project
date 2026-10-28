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
  const HINT_MS = 2600, PULSE_STEP = .14, WAVE_STEP = .6, WELCOME_MS = 1200, ZOOM_MS = 950;

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
    return { btn, shape, dot, mx, my };
  });
  // looping glow wave: markers light up one after another from left to right
  [...spots].sort((a, b) => a.mx - b.mx).forEach((s, i) => s.dot.style.setProperty('--wave', (i * WAVE_STEP).toFixed(2) + 's'));

  // ---- hotspot states (on the button): .is-hovered / .is-active / .is-flash / .is-pulse
  let active = null;
  function select(s) {
    const { object, label, href, scroll } = s.btn.dataset;
    console.log(`${object} clicked`);
    if (object === EXIT && remaining().length) return openLock();   // 나가기: 다른 곳을 다 체험해야 열림
    markVisited(object);
    // learning record (feature/quiz learning-tracker): first pressed button + which area was used (quiz_opened is sent by the quiz page itself)
    const T = window.genzTracker;
    if (T) {
      T.choose(object);
      if (object === 'files') T.record('cardnews_opened', { object });
      else if (object !== 'pen') T.record('office_object_opened', { object });
    }
    spots.forEach(o => o !== s && o.btn.classList.remove('is-active'));
    s.btn.classList.add('is-active');
    s.btn.classList.remove('is-flash'); void s.btn.offsetWidth; s.btn.classList.add('is-flash');
    if (!reduce) ripple(s.dot);
    active = s;
    // data-href → open that page full screen over the office; otherwise the placeholder panel
    // data-title: 팝업 제목 (없으면 메뉴명)
    // data-scroll="#id" → scroll the page down to that section (e.g. the guidebook → 목차 below)
    if (scroll) { setTimeout(() => { close(); document.querySelector(scroll)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, reduce ? 0 : 280); }
    else if (href) {
      // the outro (나가기 → the book): first zoom the office into the book, then open it full screen
      const outro = s.btn.dataset.popup === 'outro';
      if (outro && !reduce) zoomInto(s);
      setTimeout(() => { if (active === s) openContent(href, s.btn.dataset.title || label, s.btn.dataset.popup); }, reduce ? 0 : outro ? ZOOM_MS : 280);
    }
    else { panelKey.textContent = object; panelTitle.textContent = label; panel.hidden = false; }
    window.dispatchEvent(new CustomEvent('genz-office:select', { detail: { object, label, href } }));
  }
  function close() {
    // feature/checklist: an open 'my checklist' editor asks before closing (unsaved changes)
    if(contentOpen&&checklistEditorOpen){contentFrame.contentWindow?.postMessage({type:'genz-checklist:request-close'},location.origin);return;}
    if (active) active.btn.classList.remove('is-active', 'is-flash');
    active = null; panel.hidden = true;
    closeContent();
    window.dispatchEvent(new CustomEvent('genz-office:close'));
    if (tourPending !== null) { const t = tourPending; setTimeout(() => startTour(t < 0 ? null : t), reduce ? 0 : 450); }   // the tour waits until a popup opened meanwhile closes
  }

  // ---- content popup (e.g. /community) in an iframe over the office; the office page underneath stays as is
  const content = document.getElementById('officeContent'), contentFrame = document.getElementById('officeContentFrame');
  const contentClose = document.getElementById('officeContentClose'), contentTitle = document.getElementById('officeContentTitle');
  let lockedY = 0, contentOpen = false, pinAnimation = null, checklistEditorOpen = false;
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
    markVisited(objectForHref(href));   // e.g. the card news opened from the welcome tour, or a page opened by another popup
    // keep it loaded for quick reopening — except the outro, which plays from the start every time
    if(pinAnimation)pinAnimation.cancel();
    if (contentFrame.getAttribute('src') !== href || popup === 'outro') { checklistEditorOpen = false; contentFrame.src = href; }
    content.classList.toggle('office-content--portrait', popup === 'portrait');
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
    content.classList.toggle('office-content--outro', popup === 'outro');
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
    if(popup==='portrait')contentFrame.focus({preventScroll:true});
    else (popup === 'quiz' ? contentFrame : contentClose).focus({ preventScroll: true });
    // the quiz (feature/quiz) re-checks its saved progress when its popup opens again
    if (popup === 'quiz') try { contentFrame.contentWindow.postMessage({ type: 'genz-quiz:opened' }, location.origin); } catch {}
  }
  // ---- zoom into a desk object (the outro's book); undone when its popup closes
  function zoomInto(s) {
    // focus: data-zoom="x,y[,scale]" (image pixels) on the button, otherwise its marker
    const [zx, zy, zs] = s.btn.dataset.zoom ? s.btn.dataset.zoom.split(',').map(Number) : [s.mx, s.my];
    scene.style.setProperty('--zs', zs || 6);   // zoom factor (3rd value of data-zoom)
    scene.style.setProperty('--zx', (zx / IMG_W * 100).toFixed(2) + '%');
    scene.style.setProperty('--zy', (zy / IMG_H * 100).toFixed(2) + '%');
    stage.classList.remove('is-zoom-back');
    stage.classList.add('is-zooming');
  }
  function zoomBack() {
    if (!stage.classList.contains('is-zooming')) return;
    stage.classList.replace('is-zooming', 'is-zoom-back');
    setTimeout(() => stage.classList.remove('is-zoom-back'), reduce ? 0 : ZOOM_MS);
  }
  function closeContent() {
    zoomBack();
    if (!contentOpen) return;              // closing runs once (it may be called again while the popup fades out)
    if(pinAnimation)pinAnimation.cancel();
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
          // (only for the pages that fill the popup themselves — e.g. 고민상담소 is a long page and must keep scrolling)
          (/^\/checklist\b/.test(new URL(contentFrame.src, location.href).pathname) ? 'html,body{background:transparent!important;overflow:hidden!important}' : '') +
          // no visible scrollbars inside the popup (areas still scroll with the wheel / touch)
          // — except 고민상담소 (/community): a long board, so keep a thin scrollbar to show there is more below
          (/^\/community\b/.test(new URL(contentFrame.src, location.href).pathname)
            ? 'html{scrollbar-width:thin;scrollbar-color:#B9B1A4 transparent}' +
              'html::-webkit-scrollbar{width:8px}html::-webkit-scrollbar-track{background:transparent}' +
              'html::-webkit-scrollbar-thumb{background:#B9B1A4;border-radius:999px;border:2px solid #EAE6DF}' +
              'html::-webkit-scrollbar-thumb:hover{background:#8F877A}'
            : '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}') +
          '.checklist-scene{background:transparent!important;padding:24px 0 0!important;min-height:0!important;height:100vh}' +
          '.office-wash{display:none!important}.checklist-sheet{width:100%!important;height:calc(100vh - 24px)!important;min-height:0!important}' +
          // quiz (GEN Z QUIZ): transparent page around its own card
          '.gq-scene{background:transparent!important}';
        doc.head.appendChild(st);
      }
    } catch (e) {}
    try {
      const doc = contentFrame.contentDocument;
      if (doc.fonts) doc.fonts.ready.then(fitObject);
    } catch (e) {}
  });
  addEventListener('resize', fitObject);

  // messages from the outro (/outro): close it and stay in the office, or close it and go back to the very start (the sea)
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || !String(e.data.type).startsWith('genz-outro:')) return;
    close();
    if (e.data.type === 'genz-outro:restart') setTimeout(() => scrollTo({ top: 0, behavior: 'auto' }), reduce ? 0 : 320);
  });
  // messages from the page in the popup (e.g. the card news' last card): open another desk object's popup in its place
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'genz-office:open') return;
    const s = spots.find(o => o.btn.dataset.object === e.data.object);
    if (!s) return;
    // query (e.g. '?chapter=03' from the radio's 고민상담소 바로가기): open that object's page with it, e.g. /community?chapter=03
    const q = typeof e.data.query === 'string' && /^\?[\w=&-]{1,40}$/.test(e.data.query) ? e.data.query : '';
    if (!q) return select(s);
    spots.forEach(o => o.btn.classList.toggle('is-active', o === s));
    active = s;
    openContent(s.btn.dataset.href + q, s.btn.dataset.title || s.btn.dataset.label, s.btn.dataset.popup);
  });
  // ---- checklist desk notes (feature/checklist): open a note's checklist, and the 'pin to desk' animation
  addEventListener('genz-desk:open', e => {
    const note=window.genzDeskNotes?.get(e.detail?.id);
    if(!note)return;
    const params=new URLSearchParams(note.kind==='personal'?{personal:note.personalId}:note.kind==='completed'?{record:note.recordId||''}:{pinned:note.id});
    openContent(`/checklist?${params}`,note.title,'portrait');
  });
  function pinChecklist(id){
    if(pinAnimation)return;
    const target=window.genzDeskNotes.dock(id);
    if(!target)return;
    if(reduce||!contentOpen){close();window.genzDeskNotes.focus(id);window.genzDeskTour?.(id);return;}
    const dialog=content.querySelector('.office-content__dialog');
    const from=dialog.getBoundingClientRect();
    const scale=Math.min(target.width/from.width,target.height/from.height);
    const animation=dialog.animate([
      {transform:'translate(0,0) scale(1)',opacity:1,transformOrigin:'top left'},
      {transform:`translate(${target.left-from.left}px,${target.top-from.top}px) scale(${scale})`,opacity:0,transformOrigin:'top left'},
    ],{duration:560,easing:'cubic-bezier(.3,.05,.2,1)',fill:'forwards'});
    const backdrop=content.querySelector('.office-content__backdrop').animate([{opacity:1},{opacity:0}],{duration:560,fill:'forwards'});
    pinAnimation=animation;
    animation.oncancel=()=>{backdrop.cancel();if(pinAnimation===animation)pinAnimation=null;};
    animation.onfinish=()=>{
      animation.oncancel=null;pinAnimation=null;
      close();content.hidden=true;animation.cancel();backdrop.cancel();
      window.genzDeskNotes.focus(id);
      setTimeout(()=>window.genzDeskTour?.(id),250);   // first pin: a short guide to the desk note (js/desk-notes-tour.js)
    };
  }
  addEventListener('message', e => {
    if(e.origin!==location.origin||e.source!==contentFrame.contentWindow||!e.data)return;
    if(e.data.type==='genz-checklist:editor-open'){ checklistEditorOpen=e.data.open===true; return; }
    if(e.data.type==='genz-checklist:close-confirmed'){ checklistEditorOpen=false; close(); return; }
    if(e.data.type==='genz-checklist:personal-pinned'&&typeof e.data.id==='string'){
      checklistEditorOpen=false;
      window.genzDeskNotes?.pinPersonal(e.data.id,()=>pinChecklist(e.data.id));
      return;
    }
    if(e.data.type==='genz-checklist:pinned'&&typeof e.data.id==='string'){ if(window.genzDeskNotes?.get(e.data.id))pinChecklist(e.data.id); return; }
    if(e.data.type==='genz-checklist:close') close();
  });
  // the quiz's result screen 'AI 팀장 시뮬레이션' button → open the monitor (it shows the quiz topic's card first)
  addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== contentFrame.contentWindow || e.data?.type !== 'genz-quiz:simulation') return;
    const monitor = spots.find(o => o.btn.dataset.object === 'monitor');
    if (monitor) select(monitor);
  });
  // the quiz reports its card height so the popup fits it (feature/quiz)
  addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== contentFrame.contentWindow || e.data?.type !== 'genz-quiz:resize') return;
    if (content.classList.contains('office-content--quiz') && Number.isFinite(e.data.height) && e.data.height > 0) {
      content.style.setProperty('--quiz-height', Math.ceil(e.data.height) + 'px');
    }
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

  // ---- 나가기 잠금: 책상 위 다른 물건을 모두 한 번씩 열어 봐야 나가기(→ 아웃트로)가 열린다
  // 열어 본 물건은 이 페이지를 보는 동안만 기억한다 (새로고침하면 처음부터 다시). 나가기 이름표에 '3/8'처럼 진행을 보여 준다.
  const EXIT = 'book';
  const required = () => spots.filter(o => o.btn.dataset.object !== EXIT);
  const visited = new Set();
  const remaining = () => required().filter(o => !visited.has(o.btn.dataset.object));
  const exitSpot = spots.find(o => o.btn.dataset.object === EXIT);
  function syncExit() {
    if (!exitSpot) return;
    const left = remaining().length, total = required().length;
    const text = exitSpot.dot.querySelector('.hotspot-label__text');
    text.textContent = left ? `${exitSpot.btn.dataset.label} ${total - left}/${total}` : exitSpot.btn.dataset.label;
    exitSpot.btn.classList.toggle('is-locked', left > 0);
    exitSpot.btn.setAttribute('aria-label', left ? `${exitSpot.btn.dataset.label} (책상 위 ${left}곳을 더 체험하면 열려요)` : exitSpot.btn.dataset.label);
  }
  // mark an object as tried (by its object name, or by the page it opened)
  function markVisited(object) {
    if (!object || object === EXIT || visited.has(object)) return;
    visited.add(object);
    syncExit();
    if (!remaining().length) {
      // all tried: tell once, and make the exit glow
      exitSpot?.btn.classList.add('is-unlocked');
      hint.textContent = '모든 곳을 체험했어요! 이제 나가기로 퇴근할 수 있어요.';
      hint.classList.add('is-shown');
      setTimeout(() => hint.classList.remove('is-shown'), 4200);
    }
  }
  const objectForHref = href => {
    const path = new URL(href, location.href).pathname, view = new URL(href, location.href).searchParams.get('view');
    return spots.find(o => {
      if (!o.btn.dataset.href) return false;
      const u = new URL(o.btn.dataset.href, location.href);
      return u.pathname === path && (u.searchParams.get('view') || null) === (view || null);
    })?.btn.dataset.object;
  };
  // popup that lists what is left (shown instead of leaving)
  const lock = document.createElement('div');
  lock.className = 'office-welcome office-lock'; lock.hidden = true;
  lock.innerHTML = '<div class="office-welcome__box" role="dialog" aria-modal="true" aria-labelledby="officeLockTitle">' +
    '<p class="office-welcome__k">ALMOST THERE</p><h2 class="office-welcome__t" id="officeLockTitle">아직 퇴근하기엔 일러요!</h2>' +
    '<p class="office-welcome__d"></p><div class="office-welcome__list office-lock__list"></div>' +
    '<button type="button" class="office-welcome__skip office-lock__close">계속 둘러볼게요</button></div>';
  stage.append(lock);
  function closeLock() {
    lock.classList.remove('is-open');
    setTimeout(() => { lock.hidden = true; }, reduce ? 0 : 300);
  }
  function openLock() {
    const left = remaining();
    lock.querySelector('.office-welcome__d').textContent = `책상 위 ${left.length}곳을 더 체험하면 나가기가 열려요. 눌러서 바로 가 볼까요?`;
    lock.querySelector('.office-lock__list').replaceChildren(...left.map(o => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'office-welcome__item';
      b.textContent = o.btn.dataset.label;
      b.addEventListener('click', () => { closeLock(); setTimeout(() => select(o), reduce ? 0 : 200); });
      return b;
    }));
    lock.hidden = false;
    requestAnimationFrame(() => { lock.classList.add('is-open'); lock.querySelector('.office-welcome__item')?.focus({ preventScroll: true }); });
  }
  lock.querySelector('.office-lock__close').addEventListener('click', closeLock);
  lock.addEventListener('click', e => { if (e.target === lock) closeLock(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lock.hidden) { e.stopImmediatePropagation(); closeLock(); } }, true);
  syncExit();

  // ---- welcome popup (every time the office lights up): "첫 회사생활, 뭐가 제일 걱정되나요?" + the 7 topics.
  // Until the tour below has been seen, the desk's name tags stay hidden (stage.is-tags-hidden) so the popup comes first.
  // Choosing a topic starts the tour for that topic; '먼저 사무실 둘러볼게요' starts it without one.
  let tourSeen = false;   // the full tour runs once per page load (a refresh shows it again); declared first: wantTour() runs right away
  const TOPICS = ['조직 이해·적응', '업무 절차&기준', '질문&소통', '협업&동료 존중', '직장 관계&예절', '근무&재택 수칙', '공용 공간&비품 관리'];
  const welcome = document.getElementById('officeWelcome');
  let welcomeOpen = false;
  const showTags = () => stage.classList.remove('is-tags-hidden');
  if (wantTour()) stage.classList.add('is-tags-hidden');
  // 직장 경험(참여자 구분): 이 브라우저에서 아직 답하지 않았으면 주제 고르기 전에 한 번만 묻는다.
  // 답은 localStorage 'genz_participant_experience' 에 두고 학습 기록(lt_events 'participant_profile')으로도 보낸다
  // (Supabase: supabase/migrations/202610280001_participant_profile.sql)
  const EXP_KEY = 'genz_participant_experience';
  const expStep = document.getElementById('officeWelcomeExp'), topicStep = document.getElementById('officeWelcomeTopic');
  const box = welcome.querySelector('.office-welcome__box');
  const answered = () => { try { return !!localStorage.getItem(EXP_KEY); } catch { return true; } }; // 저장소를 못 쓰면 묻지 않음
  function showStep(exp) {
    expStep.hidden = !exp; topicStep.hidden = exp;
    box.setAttribute('aria-labelledby', exp ? 'officeWelcomeExpTitle' : 'officeWelcomeTitle');
    (exp ? expStep.querySelector('.office-welcome__opt') : topicStep.querySelector('.office-welcome__item'))?.focus({ preventScroll: true });
  }
  expStep.querySelectorAll('.office-welcome__opt').forEach(opt => opt.addEventListener('click', () => {
    const experience = opt.dataset.exp;
    try { localStorage.setItem(EXP_KEY, JSON.stringify({ experience, at: new Date().toISOString() })); } catch { /* 이번 화면에서만 넘어감 */ }
    try { window.genzTracker?.record('participant_profile', { experience }); } catch { /* 기록이 안 돼도 다음 단계로 */ }
    showStep(false);
  }));
  function openWelcome() {
    if (welcomeOpen || !ready || contentOpen || menuOpen) return;
    welcomeOpen = true;
    welcome.hidden = false;
    requestAnimationFrame(() => {
      welcome.classList.add('is-open');
      showStep(!answered());
    });
  }
  // topic: 0~6 (index in TOPICS) or null
  function closeWelcome(topic = null) {
    if (!welcomeOpen) return;
    welcomeOpen = false;
    welcome.classList.remove('is-open');
    setTimeout(() => { if (!welcomeOpen) welcome.hidden = true; }, reduce ? 0 : 300);
    if (wantTour()) { tourPending = topic ?? -1; setTimeout(() => startTour(topic), reduce ? 0 : 450); }
    else showTags();
  }
  // choosing a topic always shows the learning order on the dark screen first (카드뉴스 → 퀴즈 → AI 팀장);
  // the first time the whole tour follows, after that only those 3 steps
  welcome.querySelectorAll('.office-welcome__item').forEach(item => item.addEventListener('click', () => {
    const topic = Number(item.dataset.chapter) - 1;
    if (wantTour()) return closeWelcome(topic);
    closeWelcome();
    setTimeout(() => startTour(topic, true), reduce ? 0 : 450);
  }));
  document.getElementById('officeWelcomeSkip').addEventListener('click', () => closeWelcome());
  welcome.addEventListener('click', e => { if (e.target === welcome) closeWelcome(); });   // click on the dim area
  // the card news popup, opened on one topic's tab (cardnews.html reads ?topic=0~6)
  function openCardnews(topic) {
    const s = spots.find(o => o.btn.dataset.object === 'files');
    if (topic == null || topic < 0) return select(s);
    spots.forEach(o => o.btn.classList.toggle('is-active', o === s));
    active = s;
    openContent(`${s.btn.dataset.href}?topic=${topic}`, s.btn.dataset.title || s.btn.dataset.label, s.btn.dataset.popup);
  }

  // ---- office tour (once, after the welcome popup; again from the sidebar's '사용법 보기')
  // Part 1 — the learning order: 1 card news (files) → 2 quiz (pen) → 3 AI 팀장 (monitor), for the chosen topic.
  // Part 2 — then every name tag appears and the other desk objects are introduced one by one.
  // Spotlight on the object + a tip; the last step can open the chosen topic's card news.
  const TOUR = topic => {
    const name = topic != null && topic >= 0 ? `‘${TOPICS[topic]}’ ` : '';
    return [
      { object: 'files', step: 'STEP 1 · 배우기', title: '카드뉴스로 먼저 배워요', text: `${name}카드뉴스부터 읽어 보세요. 회사생활의 기본을 그림 카드로 쉽게 익혀요.` },
      { object: 'pen', step: 'STEP 2 · 확인하기', title: '퀴즈로 확인해요', text: `카드뉴스를 다 보면 ${name ? '같은 주제의 ' : ''}퀴즈로 이어져요. 헷갈린 내용은 해설로 다시 짚어요.` },
      { object: 'monitor', step: 'STEP 3 · 연습하기', title: 'AI 팀장과 연습해요', text: '배운 내용을 AI 팀장님께 직접 말해 보며 연습해요. 대화가 끝나면 점수와 피드백을 받아요.' },
      // 마지막: 나머지 콘텐츠를 한 번에 밝히고 이름표를 모두 띄운다
      { objects: ['calendar', 'radio', 'postit', 'phone', 'notebook'], step: '더 둘러보기', title: '책상 위 다른 것들도 둘러보세요',
        text: '근태 가이드 · 보이는 라디오 · 고민상담소 · SOS · 체크리스트도 있어요. 궁금한 물건을 눌러 자유롭게 둘러보세요!', reveal: true },
    ];
  };
  let tourPending = null, tourLayer = null;
  function wantTour() { return !tourSeen; }
  // learningOnly: just the 3 learning steps (a topic chosen in the welcome popup after the full tour was seen)
  function startTour(topic = null, learningOnly = false) {
    if (tourLayer || !ready || welcomeOpen || contentOpen || menuOpen) return;
    tourPending = null;
    const has = o => spots.some(sp => sp.btn.dataset.object === o);
    const all = TOUR(topic).map(t => (t.objects ? { ...t, objects: t.objects.filter(has) } : t)).filter(t => (t.objects ? t.objects.length : has(t.object)));
    const steps = learningOnly ? all.slice(0, all.findIndex(t => t.reveal)) : all;
    stage.classList.add('is-tags-hidden');   // tags come back at the 'reveal' step (or when the tour ends)
    let i = 0, raf = 0;
    const spot = document.createElement('div'); spot.className = 'office-tour__spot';
    const tip = document.createElement('div'); tip.className = 'office-tour__tip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-labelledby', 'officeTourTitle');
    tip.innerHTML = '<p class="office-tour__step"></p><p class="office-tour__title" id="officeTourTitle"></p><p class="office-tour__text"></p>' +
      `<div class="office-tour__dots" aria-hidden="true">${'<i></i>'.repeat(steps.length)}</div>` +
      '<div class="office-tour__row"><button type="button" class="office-tour__skip">건너뛰기</button><button type="button" class="office-tour__next"></button></div>';
    tourLayer = document.createElement('div'); tourLayer.className = 'office-tour';
    // several objects at once: a dark layer with a see-through hole per object (SVG mask)
    const NS = 'http://www.w3.org/2000/svg';
    const multi = document.createElementNS(NS, 'svg'); multi.setAttribute('class', 'office-tour__multi');
    multi.innerHTML = '<defs><mask id="officeTourMask"><rect width="100%" height="100%" fill="#fff"/><g class="holes"></g></mask></defs>' +
      '<rect width="100%" height="100%" fill="rgba(6,10,20,.62)" mask="url(#officeTourMask)"/><g class="rings"></g>';
    tourLayer.append(multi, spot, tip);
    stage.append(tourLayer);
    const targets = () => (steps[i].objects || [steps[i].object]).map(o => spots.find(sp => sp.btn.dataset.object === o));
    const target = () => targets()[0];
    const boxOf = s => {
      const r = s.btn.getBoundingClientRect(), d = s.dot.getBoundingClientRect();
      return { left: Math.min(r.left, d.left - 60) - 10, right: Math.max(r.right, d.right + 60) + 10, top: Math.min(r.top, d.top - 60) - 10, bottom: Math.max(r.bottom, d.bottom + 16) + 10 };
    };
    const show = () => {
      if (steps[i].reveal) showTags();
      tip.querySelector('.office-tour__step').textContent = `${steps[i].step}  ${i + 1}/${steps.length}`;
      tip.querySelector('.office-tour__title').textContent = steps[i].title;
      tip.querySelector('.office-tour__text').textContent = steps[i].text;
      tip.querySelectorAll('.office-tour__dots i').forEach((d, k) => d.classList.toggle('is-on', k <= i));
      tip.querySelector('.office-tour__next').textContent = i === steps.length - 1 ? '카드뉴스부터 시작하기' : '다음';
      spots.forEach(o => o.btn.classList.toggle('is-hovered', targets().includes(o)));
      tourLayer.classList.toggle('is-multi', !!steps[i].objects);
      stage.classList.toggle('is-tour-multi', !!steps[i].objects);   // name tags get a more solid pill (office.css)
      tip.querySelector('.office-tour__next').focus({ preventScroll: true });
    };
    const place = () => {
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      if (steps[i].objects) {
        // holes + blue rings around each object's name tag only (boxes around the objects themselves overlap on the left);
        // the tip sits in the middle of the screen
        const rects = targets().map(o => o.dot.querySelector('.hotspot-label').getBoundingClientRect()).map(r => {
          const pad = 6, h = r.height + pad * 2;
          return `<rect x="${r.left - pad}" y="${r.top - pad}" width="${r.width + pad * 2}" height="${h}" rx="${h / 2}"`;
        });
        multi.querySelector('.holes').innerHTML = rects.map(r => r + ' fill="#000"/>').join('');
        multi.querySelector('.rings').innerHTML = rects.map(r => r + ' fill="none" stroke="rgba(120,180,255,.9)" stroke-width="3"/>').join('');
        tip.style.left = (innerWidth - tw) / 2 + 'px';
        tip.style.top = Math.max(8, innerHeight * .42 - th / 2) + 'px';
      } else {
        const { left, right, top, bottom } = boxOf(target());
        Object.assign(spot.style, { left: left + 'px', top: top + 'px', width: right - left + 'px', height: bottom - top + 'px' });
        const tx = right + 14 + tw < innerWidth - 8 ? right + 14 : Math.max(8, left - 14 - tw);
        tip.style.left = tx + 'px';
        tip.style.top = Math.min(innerHeight - th - 8, Math.max(8, (top + bottom) / 2 - th / 2)) + 'px';
      }
      raf = requestAnimationFrame(place);
    };
    const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); end(); } };
    function end(openFirst) {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey, true);
      spots.forEach(o => o.btn.classList.remove('is-hovered'));
      stage.classList.remove('is-tour-multi');
      tourLayer.remove(); tourLayer = null;
      showTags();
      tourSeen = true;
      if (openFirst) openCardnews(topic);
    }
    tip.querySelector('.office-tour__next').addEventListener('click', () => (i >= steps.length - 1 ? end(true) : (i++, show())));
    tip.querySelector('.office-tour__skip').addEventListener('click', () => end(false));
    addEventListener('keydown', onKey, true);
    show();
    place();
  }
  window.genzOfficeTour = startTour;   // e.g. from the sidebar's '사용법 보기'
  {
    const li = document.createElement('li'), item = document.createElement('button');
    item.type = 'button'; item.className = 'office-menu__item';
    item.innerHTML = '<span class="office-menu__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="#fff"/></svg></span><span class="office-menu__text">사용법 보기</span>';
    item.addEventListener('click', () => { closeMenu(false); setTimeout(() => startTour(), reduce ? 0 : 340); });
    li.appendChild(item); menuFoot.prepend(li);
  }

  panelClose.addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (welcomeOpen) closeWelcome();
    else if (menuOpen) closeMenu();
    else if (active || contentOpen) close();
  });
  window.genzOffice = { close };
  // learning record: the office was actually reached (once per page load)
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && window.genzTracker) {
        window.genzTracker.record('office_entered'); seen.disconnect();
      }
    }, { threshold: 0.3 });
    seen.observe(office);
  }

  // ---- first entry: one staggered pulse + the hint (once per page load)
  let entered = false, ready = false;
  function setReady(on) {
    if (on === ready) return;
    ready = on;
    stage.classList.toggle('is-ready', on);
    spots.forEach(s => { s.btn.tabIndex = on ? 0 : -1; });
    menuBtn.tabIndex = on ? 0 : -1;
    if (!on) { spots.forEach(s => s.reset()); closeMenu(false); closeWelcome(); close(); return; }
    if (entered) {
      // came back to the office before the tour ran (e.g. scrolled up while the welcome popup was open): run it now
      if (tourPending !== null) { const t = tourPending; setTimeout(() => startTour(t < 0 ? null : t), reduce ? 0 : 300); }
      return;
    }
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
