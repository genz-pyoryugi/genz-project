/* =========================================================
   젠지 표류기 — outro: lines (.reveal) appear as they scroll into view, one after another within a scene;
   a bar at the top shows how far down the way home you are.
   사무실 팝업 안에서 열리면 끝 버튼이 사무실에 알림: genz-outro:close (닫기) / genz-outro:restart (닫고 인트로 처음으로)
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const inOffice = window.parent !== window;
  const tell = type => { if (inOffice) parent.postMessage({ type }, location.origin); };

  // stagger: the n-th line of a scene waits n × 0.35s (the first scene starts after the white of the zoom settles)
  document.querySelectorAll('.scene').forEach((scene, si) => {
    scene.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--d', ((si === 0 ? 0.3 : 0) + i * 0.35).toFixed(2) + 's'));
  });
  const seen = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    seen.unobserve(e.target);
  }), { threshold: 0, rootMargin: '0px 0px -15% 0px' });   // as soon as it is 15% into the screen (the article is taller than the screen)
  document.querySelectorAll('.reveal').forEach(el => seen.observe(el));

  // ---- marks on the article image (coordinates = pixels of article.jpg, 796 × 3812) ----
  // lead: the bold sentence to circle [left, right, centre y]; lines: the paragraph below to highlight [[right, centre y], ...] (all start at x 8)
  const MARKS = [
    { tag: '01 조직이해&적응', lead: [8, 440, 1308], lines: [[790, 1373], [775, 1404], [392, 1436]] },
    { tag: '02 업무 절차&기준', lead: [8, 580, 1501], lines: [[790, 1566], [790, 1597], [478, 1629]] },
    { tag: '03 질문&소통', lead: [8, 318, 1696], lines: [[790, 1761], [790, 1792], [190, 1824]] },
    { tag: '04 협업&동료 존중', lead: [8, 488, 2403], lines: [[790, 2468], [790, 2499], [750, 2531]] },
    { tag: '05 직장 내 관계&예절', lead: [8, 550, 2596], lines: [[790, 2661], [690, 2692]] },
    { tag: '06 근무&재택 수칙', lead: [8, 340, 3467], lines: [[790, 3532], [790, 3564], [30, 3596]] },
    { tag: '07 공용 공간 & 비품 관리', lead: [8, 482, 3661], lines: [[790, 3727], [785, 3759], [258, 3791]] },
  ];
  const NS = 'http://www.w3.org/2000/svg', svg = $('marks');
  const el = (name, attrs) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const marks = MARKS.map((m, k) => {
    const g = el('g', { class: 'mark' });
    const [x1, x2, cy] = m.lead;
    m.lines.forEach(([x, y], i) => {
      const r = el('rect', { class: 'mark__hl', x: 6, y: y - 13, width: x - 4, height: 26, rx: 4 });
      r.style.setProperty('--d', (0.75 + i * 0.4).toFixed(2) + 's');
      g.append(r);
    });
    // a clean, slim ellipse around the sentence (drawn in one stroke from the left, see .mark__ring)
    const cx = (x1 + x2) / 2 - 2;
    g.append(el('ellipse', { class: 'mark__ring', cx, cy, rx: (x2 - x1) / 2 + 22, ry: 26, pathLength: 1,
      transform: `rotate(${k % 2 ? 0.8 : -0.8} ${cx} ${cy}) rotate(180 ${cx} ${cy})` }));
    const tag = el('text', { class: 'mark__tag', x: x2 + 36, y: cy + 10 });
    tag.textContent = m.tag;
    g.append(tag);
    svg.append(g);
    return { g, y: cy };
  });
  // draw a mark once its sentence is in the lower third of the screen
  const article = svg.parentNode;
  const drawMarks = () => {
    const r = article.getBoundingClientRect(), k = r.height / 3812;
    marks.forEach(m => { if (!m.on && r.top + m.y * k < innerHeight * 0.72) { m.on = true; m.g.classList.add('is-on'); } });
  };
  addEventListener('scroll', drawMarks, { passive: true });
  addEventListener('resize', drawMarks);

  // ---- ending: once the last screen is (almost) fully in view, the white fades into the video and it plays once;
  // when it ends (the closed book's cover), the farewell appears beside it. Scrolling back up resets it for next time.
  const ending = $('ending'), video = $('outroVideo'), bye = $('bye');
  let shown = false;
  new IntersectionObserver(entries => entries.forEach(e => {
    if (e.intersectionRatio >= .9 && !ending.classList.contains('is-playing')) {
      ending.classList.add('is-playing');
      video.currentTime = 0;
      video.play().catch(() => showBye());
    } else if (e.intersectionRatio < .1 && ending.classList.contains('is-playing')) {
      ending.classList.remove('is-playing');
      video.pause(); video.currentTime = 0;
      bye.classList.remove('is-on'); ending.classList.remove('is-done'); shown = false;
    }
  }), { threshold: [0, .1, .9, 1] }).observe(ending);
  // the video element covers the screen with its whole frame (16:9, centred, overflow hidden by the stage)
  function sizeVideo() {
    const fw = Math.max(innerWidth, innerHeight * 16 / 9), fh = fw * 9 / 16;
    Object.assign(video.style, { width: fw + 'px', height: fh + 'px', left: (innerWidth - fw) / 2 + 'px', top: (innerHeight - fh) / 2 + 'px' });
    // the closed book spans y 7.0–93.6% of the frame (centre x 45.7%): shrink around it until it is 80% of the screen height
    ending.style.setProperty('--ox', '45.7%');
    ending.style.setProperty('--oy', '50.3%');
    ending.style.setProperty('--end-scale', Math.min(1, innerHeight * .8 / (fh * .866)).toFixed(3));
  }
  // the stage around the shrunk video = the colour of the frame's edges, so no border shows
  function sampleEdge() {
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 36;
      const g = c.getContext('2d'); g.drawImage(video, 0, 0, 64, 36);
      const pts = [[6, 2], [58, 2], [6, 34], [58, 34], [5, 18], [59, 18], [12, 2], [52, 34]];   // just inside the faded edge
      const sum = [0, 0, 0];
      pts.forEach(([x, y]) => { const d = g.getImageData(x, y, 1, 1).data; sum[0] += d[0]; sum[1] += d[1]; sum[2] += d[2]; });
      ending.style.setProperty('--end-bg', `rgb(${sum.map(v => Math.round(v / pts.length)).join(',')})`);
    } catch (e) {}
  }
  sizeVideo();
  addEventListener('resize', sizeVideo);
  function showBye() { if (shown) return; shown = true; sampleEdge(); ending.classList.add('is-done'); bye.classList.add('is-on'); $('endRestart').focus({ preventScroll: true }); }
    video.addEventListener('ended', showBye);

  const bar = $('progress');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? scrollY / max * 100 : 100).toFixed(1) + '%';
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);

  $('endBack').addEventListener('click', () => (inOffice ? tell('genz-outro:close') : (location.href = '/intro/index.html')));
  $('endRestart').addEventListener('click', () => (inOffice ? tell('genz-outro:restart') : (location.href = '/intro/index.html')));
})();
