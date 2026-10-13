/* =========================================================
   젠지 표류기 — scroll intro
   r : raw progress of the #intro scroll track (0 → 1)
   p : story progress (sea → open book), p = r / SC
   hq: hand-off progress — the main web (#main-web) scrolling up after the intro (0 → 1);
       the page bookmark glides into the chat book's bookmark on the main web
   Events: window 'genz-intro:complete' / 'genz-intro:reset'
   ========================================================= */
(() => {
  // ---- set to false to remove the lifebuoys (zigzag becomes gentler)
  const TUBES = true;

  const stage = document.getElementById('stage'), intro = document.getElementById('intro');
  const cvs = document.getElementById('sea'), ctx = cvs.getContext('2d');
  const world = document.getElementById('world'), book = document.getElementById('book');
  const cover = document.getElementById('cover'), front = document.getElementById('front'), pages = document.getElementById('pages');
  const caps = [...document.querySelectorAll('.cap')], opener = document.getElementById('opener'), hint = document.getElementById('hint');
  const go = document.getElementById('go');
  const rib0 = { x: 0, w: 0 };
  const pageMarks = document.querySelectorAll('.strip b, .folio');
  const tocBits = document.querySelectorAll('.back > *'), tail = document.getElementById('tail');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mainWeb = document.getElementById('main-web'), mainFrame = document.getElementById('mainWebFrame');
  const rib2 = document.getElementById('rib2'), stripEls = document.querySelectorAll('.strip, .tail i');
  const duskBg = document.getElementById('duskBg'), duskCopy = document.getElementById('duskCopy');
  const duskT1 = document.getElementById('duskT1'), duskT2 = document.getElementById('duskT2');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const sm = (a, b, x) => ease(clamp((x - a) / (b - a)));
  const expLerp = (a, b, t) => a * Math.pow(b / a, t);

  // ---- world layout
  const BW = 760, BH = 1000;
  const shoreY = -4200, bookX = 120, bookBottom = shoreY - 90, bookY = bookBottom - BH / 2;
  const anchor = { x: bookX + 150, y: bookBottom - 40 };
  const PULL0 = -520, PULLD = 3540;
  book.style.left = (bookX - BW / 2) + 'px';
  book.style.top = (-bookY - BH / 2) + 'px'; // world is mirrored vertically: forward = down on screen

  function swY(p) {
    if (p < .26) return 0;
    if (p < .445) return PULL0 * ((p - .26) / .185);
    if (p < .74) return PULL0 - PULLD * ease((p - .445) / .295);
    return PULL0 - PULLD;
  }
  function pathX(y) {
    const k = clamp((PULL0 - y) / PULLD);
    const base = 160 * ease(k);
    const zig = TUBES ? 130 * Math.sin(6 * Math.PI * k) * Math.pow(Math.sin(Math.PI * k), .5)
                      : 50 * Math.sin(4 * Math.PI * k) * Math.sin(Math.PI * k);
    return base + zig;
  }
  const heading = y => Math.atan2(pathX(y - 8) - pathX(y), 8);

  const tubes = [];
  if (TUBES) for (let n = 0; n < 6; n++) {
    const k = (n + .5) / 6, y = PULL0 - k * PULLD, sg = Math.sign(Math.sin(6 * Math.PI * k));
    tubes.push({ x: pathX(y) - sg * 175, y, seed: n * 1.7 });
  }

  // seeded random
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const shore = x => shoreY + 34 * Math.sin(x / 170) + 18 * Math.sin(x / 61 + 1.3);
  const rocks = [[-560, -10, 70], [-470, 34, 40], [-650, -90, 52], [-380, -40, 26], [720, -20, 82], [835, 26, 46], [600, -130, 36], [930, -70, 30]]
    .map(([x, dy, r]) => ({ x, y: shoreY + dy, pts: Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2, rr = r * (.72 + .3 * rnd()); return [Math.cos(a) * rr, Math.sin(a) * rr * .8]; }) }));
  const specks = [];
  for (let i = 0; i < 900; i++) { const x = -2200 + rnd() * 4400, y = shoreY - 10 - rnd() * 2600; if (y < shore(x) - 30) specks.push([x, y, .8 + rnd() * 2.2]); }

  // ---- ocean textures (drawn once)
  function makeTile(withBase) {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d'); g.scale(2, 2);
    const T = 512, offs = [-T, 0, T];
    if (withBase) {
      g.fillStyle = '#0d4566'; g.fillRect(0, 0, T, T);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * T, y = rnd() * T, r = 40 + rnd() * 120, dark = rnd() < .55;
        for (const ox of offs) for (const oy of offs) {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, dark ? 'rgba(6,40,64,.4)' : 'rgba(30,110,145,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    const n = withBase ? 950 : 260;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd() * T, y = rnd() * T, L = (withBase ? 8 : 4) + rnd() * (withBase ? 22 : 12), bend = (rnd() - .5) * 8;
      g.strokeStyle = `rgba(255,255,255,${withBase ? .04 + rnd() * .15 : .25 + rnd() * .4})`;
      g.lineWidth = withBase ? .8 + rnd() * 1.4 : .8 + rnd();
      for (const ox of offs) for (const oy of offs) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + L / 2, y + oy + bend, x + ox + L, y + oy); g.stroke();
      }
    }
    return c;
  }
  const basePat = ctx.createPattern(makeTile(true), 'repeat'); // drawn sea, shown until the photo loads
  // sea photo (seamless 360×360 tile), each tile covering SEA_TILE world units. A small photo repeats visibly,
  // so it is baked ONCE into a large seamless texture: the photo, the same photo again rotated on a lattice that
  // still repeats every SEA_N px (half transparent), and large soft light/dark patches. Per frame it's a few drawImage calls.
  const SEA_IMG = 'assets/images/sea.png', SEA_TILE = 400, SEA_N = 2048; // SEA_N px = 5 photo tiles
  let seaBmp = null;
  const seaImg = new Image();
  seaImg.onload = () => createImageBitmap(bakeSea(seaImg)).then(bmp => { seaBmp = bmp; });
  seaImg.src = SEA_IMG;
  function bakeSea(img) {
    const N = SEA_N, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), pat = g.createPattern(img, 'repeat');
    const s1 = N / 5 / img.width;                                   // 5×5 photo tiles
    pat.setTransform(new DOMMatrix([s1, 0, 0, s1, 0, 0]));
    g.fillStyle = pat; g.fillRect(0, 0, N, N);
    // rotated copy (atan(1/3) ≈ 18°, tiles ≈ 1.58× larger): tile edges (3,1)·N/10 and (-1,3)·N/10,
    // so 3·(3,1) − (−1,3) = (10,0) and (3,1) + 3·(−1,3) = (0,10) — it repeats exactly every N px
    const a = N / 10 / img.width;
    pat.setTransform(new DOMMatrix([3 * a, a, -a, 3 * a, 0, 0]));
    g.globalAlpha = .5; g.fillRect(0, 0, N, N); g.globalAlpha = 1;
    const offs = [-N, 0, N];                                         // soft patches, wrapped around the edges
    for (let i = 0; i < 46; i++) {
      const x = rnd() * N, y = rnd() * N, r = (210 + rnd() * 450) * N / 2048, dark = rnd() < .5;
      for (const ox of offs) for (const oy of offs) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, dark ? 'rgba(3,32,56,.24)' : 'rgba(130,225,240,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
    return c;
  }
  const sparkPat = ctx.createPattern(makeTile(false), 'repeat');

  // ---- canvas sizing
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); W = r.width; H = r.height;
    dpr = Math.min(1.5, window.devicePixelRatio || 1); // the canvas is mostly soft sea texture; 1.5× is plenty
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
  }
  // final zoomed view of the open book: the right page fills the screen width (on narrow screens it is
  // zoomed in further so the text stays readable, cropping the page's blank margins instead)
  function openView() {
    const zOpen = Math.max(W / (BW - 4), Math.min(W / 560, H / 600));
    const half = W / 2 / zOpen;
    const cx = clamp(318, 2 + half, BW - 2 - half);      // never show past either edge of the page
    const cy = Math.max(360, H / 2 / zOpen);            // on tall screens pin the view to the page top
    return { zOpen, cx, cy };
  }
  // the chat book's bookmark on the main web, in screen coordinates.
  // Its SVG (.chatbook__ribbon) is drawn in a 1068×1472 box: ribbon x 570–683, notch tip at y -131,
  // tucked into the pages along a slanted line at y ≈ 188 (left) – 197 (right).
  function chatRibbon() {
    let svg = null;
    try { svg = mainFrame && mainFrame.contentDocument && mainFrame.contentDocument.querySelector('.chatbook__ribbon'); } catch (e) {}
    if (!svg) return null;
    const fr = mainFrame.getBoundingClientRect(), b = svg.getBoundingClientRect();
    if (!b.width) return null;
    const s = Math.min(b.width / 1068, b.height / 1472);
    const ox = fr.left + b.left + (b.width - 1068 * s) / 2, oy = fr.top + b.top + (b.height - 1472 * s) / 2;
    return { x: ox + 570 * s, w: 113 * s, top: oy - 131 * s, bottom: oy + 197 * s, notch: 59 * s, slant: 9 * s };
  }
  // place the page's bookmark in the final zoomed view, lined up with the chat book's bookmark below it,
  // then centre the page text + scroll hint as one group in the page area left of the bookmark
  function layoutPlatform() {
    const { zOpen: z, cx, cy } = openView(), X = u => W / 2 + (u - cx) * z;
    const cr = chatRibbon();
    const stubC = cr ? cr.x + cr.w / 2 : W * .81 + clamp(W * .048, 60, 92) * .545; // bookmark centre on screen
    const u = clamp(cx + (stubC - W / 2) / z - 15, 520, 720);    // ribbon left edge in page units
    document.querySelector('.strip').style.left = u + 'px';
    document.querySelector('.tail i').style.left = (772 + u) + 'px';
    anchor.x = bookX - BW / 2 + u + 15;                            // the rope/ribbon outside the book enters at the same spot
    rib0.x = X(u); rib0.w = 30 * z;

    // the scroll hint sits near the bottom of the screen; the page text is centred in the space above it.
    // text size on screen: body text at most TEXT_PX (scaled to the screen height), and the text must fit the free area
    const col = document.querySelector('.page-r .col');
    const colW = Math.max(col.offsetWidth, col.scrollWidth), colH = col.offsetHeight; // page units (26px body text)
    const L = Math.max(0, X(40)), R = rib0.x, hintH = go.offsetHeight;
    const hintTop = H - clamp(H * .07, 24, 72) - hintH, room = clamp(H * .06, 24, 64);
    const TEXT_PX = clamp(H * .033, 16, 32);
    const k = Math.min(TEXT_PX / (26 * z),
      (R - L - 2 * Math.max(16, (R - L) * .08)) / (colW * z),   // width: keep side margins
      (hintTop - 2 * room) / (colH * z));                        // height: clear of the top and of the scroll hint
    const tw = colW * z * k, th = colH * z * k, gx = (L + R) / 2, gy = (hintTop - th) / 2;
    col.style.left = (cx + (gx - tw / 2 - W / 2) / z) + 'px';
    col.style.top = (cy + (gy + th / 2 - H / 2) / z) + 'px';
    col.style.transform = `translateY(-50%) scale(${k.toFixed(3)})`;
    go.style.left = gx + 'px';
    go.style.top = hintTop + 'px'; go.style.bottom = 'auto';
    // welcome lines: centred on the same axis as the page text, kept clear of the bookmark
    duskCopy.style.left = W / 2 + 'px';   // welcome lines sit in the middle of the screen
    duskCopy.style.setProperty('--dusk-w', '760px');
  }
  addEventListener('resize', () => { resize(); layoutPlatform(); }); resize(); layoutPlatform();
  if (mainFrame) mainFrame.addEventListener('load', () => requestAnimationFrame(layoutPlatform));
  if (document.fonts) document.fonts.ready.then(layoutPlatform); // text height changes once the web fonts load

  // ---- drawing
  function drawOcean(camX, camY, z, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ts = clamp(z, .35, 1.6) * .5;
    const ox = W / 2 - camX * ts * 2, oy = H / 2 + camY * ts * 2;
    if (seaBmp) {
      // the texture repeats every SEA_N px; draw just the few copies that cover the screen
      // (plain drawImage is much cheaper per frame than a transformed pattern fill)
      const S = ts * 2 * SEA_TILE * 5, x0 = ((ox % S) + S) % S - S, y0 = ((oy % S) + S) % S - S;
      for (let y = y0; y < H; y += S) for (let x = x0; x < W; x += S) ctx.drawImage(seaBmp, x, y, S + .5, S + .5);
    } else {
      basePat.setTransform(new DOMMatrix([ts, 0, 0, ts, ox, oy]));
      ctx.fillStyle = basePat; ctx.fillRect(0, 0, W, H);
    }
    // moving glints on top so the photo doesn't look frozen
    const glint = seaBmp ? .35 : 1;  // the photo already has foam, so the drawn glints stay faint over it
    ctx.globalAlpha = (.25 + .15 * Math.sin(t * 1.3)) * glint;
    sparkPat.setTransform(new DOMMatrix([ts, 0, 0, ts, ox + t * 9, oy + t * 6]));
    ctx.fillStyle = sparkPat; ctx.fillRect(0, 0, W, H);
    if (!seaBmp) {                   // second glint layer only for the drawn sea (the photo has its own foam)
      ctx.globalAlpha = .2 + .15 * Math.sin(t * 1.1 + 2);
      sparkPat.setTransform(new DOMMatrix([ts * 1.3, 0, 0, ts * 1.3, ox - t * 7, oy + t * 4]));
      ctx.fillStyle = sparkPat; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  function drawLand(camX, camY, z, t) {
    const x0 = camX - W / 2 / z - 60, x1 = camX + W / 2 / z + 60, top = camY - H / 2 / z - 60;
    const step = Math.max(6, 10 / z);
    // shallows
    let g = ctx.createLinearGradient(0, shoreY + 620, 0, shoreY);
    g.addColorStop(0, 'rgba(40,160,185,0)'); g.addColorStop(.7, 'rgba(60,195,205,.55)'); g.addColorStop(1, 'rgba(120,225,220,.85)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, shoreY + 640);
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x, shore(x) + 10);
    ctx.lineTo(x1 + step, shoreY + 640); ctx.fill();
    // sand
    g = ctx.createLinearGradient(0, shoreY + 40, 0, shoreY - 120);
    g.addColorStop(0, '#bda277'); g.addColorStop(.45, '#dcc393'); g.addColorStop(1, '#e8d2a4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, top);
    for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x, shore(x));
    ctx.lineTo(x1 + step, top); ctx.fill();
    ctx.fillStyle = 'rgba(140,110,70,.28)';
    for (const [x, y, r] of specks) if (x > x0 && x < x1 && y > top) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    // rocks
    for (const rk of rocks) {
      ctx.save(); ctx.translate(rk.x, rk.y);
      ctx.fillStyle = 'rgba(20,30,30,.28)'; path(rk.pts, 8, -10); ctx.fill();
      ctx.fillStyle = '#4a463f'; path(rk.pts, 0, 0); ctx.fill();
      ctx.fillStyle = 'rgba(160,150,135,.35)'; path(rk.pts.map(([a, b]) => [a * .6 - 6, b * .55 - 8]), 0, 0); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${.45 + .25 * Math.sin(t * 2 + rk.x)})`; ctx.lineWidth = 4;
      path(rk.pts.map(([a, b]) => [a * 1.14, b * 1.14]), 0, 0); ctx.stroke();
      ctx.restore();
    }
    // foam lines
    const foam = (off, amp, sp, ph, w, a) => {
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w; ctx.beginPath();
      for (let x = x0; x <= x1 + step; x += step) ctx.lineTo(x, shore(x) + off + amp * Math.sin(t * sp + ph + x / 90));
      ctx.stroke();
    };
    ctx.lineJoin = 'round';
    foam(4, 3, 1.4, 0, 9, .85);
    foam(26 + 10 * Math.sin(t * .8), 5, 1.1, 1, 4, .4);
    foam(60 + 16 * Math.sin(t * .6 + 1), 7, .9, 2, 2.5, .22);
  }
  function path(pts, dx, dy) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)); ctx.closePath(); }

  function drawTube(tb, t) {
    ctx.save(); ctx.translate(tb.x, tb.y + 6 * Math.sin(t * 1.4 + tb.seed)); ctx.rotate(t * .25 + tb.seed);
    ctx.lineWidth = 17;
    ctx.strokeStyle = 'rgba(3,25,40,.3)'; ctx.beginPath(); ctx.arc(7, -9, 31, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = i % 2 ? '#f3efe6' : '#d33a2f';
      ctx.beginPath(); ctx.arc(0, 0, 31, i * Math.PI / 4, (i + 1) * Math.PI / 4 + .01); ctx.stroke();
    }
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(0, 0, 37, 3.6, 5.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 50 + 4 * Math.sin(t * 2 + tb.seed), 48, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }

  function drawRope(E, A, reveal, t, z) {
    const dx = A.x - E.x, dy = A.y - E.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const amp = 60 * Math.min(1, len / 800) * (1 - .45 * reveal), N = 140, pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, w = Math.sin(s * len / 115 + t * 1.2) * Math.pow(Math.sin(Math.PI * s), .6) * amp;
      pts.push([E.x + dx * s + nx * w, E.y + dy * s + ny * w]);
    }
    const w = lerp(7, 22, reveal);
    const line = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    ctx.save(); ctx.translate(7, -10); ctx.strokeStyle = 'rgba(2,22,36,.32)'; ctx.lineWidth = w; line(); ctx.stroke(); ctx.restore();
    const r = Math.round(lerp(205, 70, reveal)), g = Math.round(lerp(178, 148, reveal)), b = Math.round(lerp(128, 169, reveal));
    ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = w; line(); ctx.stroke();
    if (reveal < 1) { // rope twist
      ctx.setLineDash([5, 6]); ctx.strokeStyle = `rgba(110,78,36,${.55 * (1 - reveal)})`; ctx.lineWidth = w * .75; line(); ctx.stroke(); ctx.setLineDash([]);
    }
    if (reveal > 0) { // ribbon weave + edge
      ctx.strokeStyle = `rgba(20,70,90,${.22 * reveal})`; ctx.lineWidth = w * .35; line(); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${.35 * reveal})`; ctx.lineWidth = 1.5 / Math.max(z, .3); line(); ctx.stroke();
    }
  }

  function drawSwimmer(x, y, ang, phase, hold, alpha, t, wake) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alpha;
    // ripples
    for (let i = 0; i < 3; i++) {
      const r = (t * .45 + i / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${.3 * (1 - r)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 10, 46 + 70 * r, 40 + 60 * r, 0, 0, 7); ctx.stroke();
    }
    // wake
    if (wake > .02) {
      ctx.strokeStyle = `rgba(255,255,255,${.4 * wake})`; ctx.lineWidth = 3;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 28, 34);
        ctx.quadraticCurveTo(s * 52, 120, s * (80 + 20 * wake), 220); ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${.18 * wake})`;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(Math.sin(t * 3 + i) * 14, 90 + i * 22, 12 - i, 6, 0, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.beginPath(); ctx.ellipse(0, 6, 44, 36, 0, 0, 7); ctx.fill();
    // legs (under water)
    ctx.globalAlpha = alpha * .5;
    const kick = Math.sin(t * (hold > .5 ? 9 : 6) + phase * 2) * 6;
    ctx.fillStyle = '#0f1522';
    ctx.beginPath(); ctx.roundRect(-18, 26 + kick, 15, 60, 7); ctx.fill();
    ctx.beginPath(); ctx.roundRect(3, 26 - kick, 15, 60, 7); ctx.fill();
    ctx.globalAlpha = alpha;
    // arms
    for (const s of [-1, 1]) {
      const ph = phase + (s > 0 ? Math.PI : 0), reach = (Math.cos(ph) + 1) / 2;
      const hx = lerp(s * (24 + 12 * Math.sin(ph)), s * 8, hold), hy = lerp(lerp(34, -62, reach), -66, hold);
      const sx = s * 23, sy = -4, ex = (sx + hx) / 2 + s * 11 * (1 - hold), ey = (sy + hy) / 2;
      ctx.globalAlpha = alpha * lerp(.45 + .55 * reach, 1, hold);
      ctx.strokeStyle = '#1f2738'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke();
      ctx.strokeStyle = '#f0eee8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - (hx - ex) * .12, hy - (hy - ey) * .12); ctx.lineTo(hx - (hx - ex) * .2, hy - (hy - ey) * .2); ctx.stroke();
      ctx.fillStyle = '#d7a47f'; ctx.beginPath(); ctx.arc(hx, hy, 5.6, 0, 7); ctx.fill();
      if (hold < .5 && reach > .85) {
        const k = (reach - .85) / .15;
        ctx.strokeStyle = `rgba(255,255,255,${.5 * k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx, hy - 4, 8 + 8 * (1 - k), 0, 7); ctx.stroke();
      }
    }
    ctx.globalAlpha = alpha;
    // torso (suit jacket, seen from above/back)
    const jg = ctx.createLinearGradient(-30, 0, 30, 0);
    jg.addColorStop(0, '#171e2c'); jg.addColorStop(.5, '#28324a'); jg.addColorStop(1, '#171e2c');
    ctx.fillStyle = jg; ctx.beginPath(); ctx.roundRect(-30, -13, 60, 46, [18, 18, 12, 12]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 33); ctx.stroke();
    // shirt collar
    ctx.strokeStyle = '#f2f0ea'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, -19, 12, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
    // head (back of head, no face)
    ctx.fillStyle = '#16110e'; ctx.beginPath(); ctx.arc(0, -23, 13.5, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-2, -26, 8, 3.6, 4.9); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, -34); ctx.quadraticCurveTo(i * 5, -24, i * 4, -13); ctx.stroke(); }
    ctx.restore();
  }

  // ---- captions
  const capWin = [[.12, .25], [.28, .41], [.42, .5], [.53, .66], [.67, .745], [.755, .85]];

  let cur = 0, prevY = 0, vel = 0, done = false;
  // r = raw intro progress. The story (p) runs up to SC, then holds briefly on the open page, the screen darkens
  // with the welcome lines (DUSK), then the bookmark thins down to the chat book's bookmark width (THIN).
  // Only after that does the main web (#main-web) scroll in below, and the bookmark shortens into the chat book (hq).
  // keep SC × (intro height − 100vh) ≈ 1025vh so the story pace stays the same when #intro's height changes
  // same scroll positions as before (story ends at ~1025vh); only the dark tail after the welcome lines is shorter
  const SC = .6856;                     // story (sea → open book) ends here
  const DUSK = [.715, .78], DUSK_T1 = [.766, .818], DUSK_T2 = [.8455, .9]; // screen darkens, then the welcome lines
  const THIN = [.92, 1];                // bookmark thins (over the dark screen)
  const targetP = () => { const d = intro.offsetHeight - stage.offsetHeight; return clamp(-intro.getBoundingClientRect().top / d); };

  function render(r, t, hq) {
    const p = clamp(r / SC);
    const zb = clamp(Math.min(W, H) / 760, .62, 1.15);
    const sy = swY(p), sx = pathX(sy), ang = heading(sy) * .8;
    vel = lerp(vel, prevY - sy, .15); prevY = sy;
    const wake = clamp(vel / 4), hold = sm(.445, .465, p), drop = 1 - Math.pow(1 - clamp((p - .41) / .04), 3);
    const reveal = sm(.75, .8, p), swA = sm(.07, .12, p);
    const phase = -sy * .028 + t * .5;

    // camera
    const zin = sm(.14, .26, p);
    let z = expLerp(.05 * zb, zb, zin) * expLerp(1, .5, sm(.6, .74, p));
    // swimmer sits at screen centre when the dot appears, then drifts toward the top so the sea ahead (below) opens up
    const lead = .14 * zin + .06 * sm(.26, .5, p);
    let camX = sx * .6, camY = sy - H * lead / z;
    const q = sm(.74, .84, p), zf = Math.min(W * .8 / BW, H * .8 / (BH + 300));
    camX = lerp(camX, bookX, q); camY = lerp(camY, bookY + 150, q); z = expLerp(z, zf, q);
    // as the cover opens, zoom until the right page's text block + bookmark (page x 40-580, y 80-680) sits centred on screen
    const o = sm(.86, .97, p);
    const { zOpen, cx, cy } = openView();
    const openX = bookX - BW / 2 + cx, openY = bookY + BH / 2 - cy; // world y is mirrored against page y
    camX = lerp(camX, openX, o); camY = lerp(camY, openY, o); z = expLerp(z, zOpen, o);

    // draw — the canvas is fully covered once the page is open (and off screen once the web is up), so skip it then
    const drawCanvas = !(p >= 1 && o >= 1) && hq < 1;
    if (drawCanvas) {
      drawOcean(camX, camY, z, t);
      ctx.setTransform(dpr * z, 0, 0, -dpr * z, dpr * (W / 2 - camX * z), dpr * (H / 2 + camY * z));
      if (p > .5 && camY - H / 2 / z < shoreY + 700) drawLand(camX, camY, z, t);
      const viewTop = camY - H / 2 / z - 200, viewBot = camY + H / 2 / z + 200;
      for (const tb of tubes) if (tb.y > viewTop && tb.y < viewBot) drawTube(tb, t);
      const hx = sx + Math.sin(ang) * 66, hy = sy - Math.cos(ang) * 66;
      if (drop > 0) {
        const E0 = { x: hx + 40, y: camY - H / 2 / z - 80 };
        drawRope({ x: lerp(E0.x, hx, drop), y: lerp(E0.y, hy, drop) }, anchor, reveal, t, z);
      }
      if (swA > 0) drawSwimmer(sx, sy, ang, phase, hold, swA, t, wake);
      // far-away dot
      if (swA > 0 && z < .3) {
        const k = 1 - z / .3, px = W / 2 + (sx - camX) * z, py = H / 2 - (sy - camY) * z;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = `rgba(12,16,26,${swA * k})`; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 7); ctx.fill();
        const r = (t * .6) % 1; ctx.strokeStyle = `rgba(255,255,255,${swA * k * .6 * (1 - r)})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(px, py, 5 + 14 * r, 0, 7); ctx.stroke();
      }
      // vignette
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
      vg.addColorStop(0, 'rgba(4,20,32,0)'); vg.addColorStop(1, `rgba(4,20,32,${.45 * (1 - o)})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    // DOM layers
    world.style.transform = `translate(${W / 2 - camX * z}px,${H / 2 + camY * z}px) scale(${z})`;
    book.style.visibility = p > .55 ? 'visible' : 'hidden';
    const ca = -180 * sm(.86, .95, p), lift = Math.sin(-ca * Math.PI / 180);
    cover.style.transform = `rotateY(${ca}deg)`;
    front.style.filter = `brightness(${1 - .35 * lift})`;
    pages.style.setProperty('--shade', (.12 * lift).toFixed(3));
    stage.classList.toggle('light', o > .6);
    // left page (contents) quietly fades so only the right page reads at the end
    tail.style.opacity = sm(.9, .95, p).toFixed(3);
    // hand-off: the page bookmark (now #rib2, fixed over everything) first thins to the chat book's bookmark
    // width while the page holds (THIN); then the main web scrolls up from below and the bookmark shortens
    // down into the chat book until it matches the chat book's own bookmark exactly, and hands over to it.
    const m = sm(...THIN, r), dk = sm(...DUSK, r);
    duskBg.style.opacity = dk.toFixed(3);
    [[duskT1, DUSK_T1], [duskT2, DUSK_T2]].forEach(([el, win]) => {
      const a = sm(...win, r);
      el.style.opacity = a.toFixed(3);
      el.style.transform = `translateY(${((1 - a) * 14).toFixed(1)}px)`;
    });
    // #rib2 takes over from the page bookmark as soon as the screen darkens, so the bookmark stays lit above the dark layer
    const cr = (dk > 0 || m > 0 || hq > 0) && hq < .98 ? chatRibbon() : null; // by .98 it already matches the chat book's ribbon
    stripEls.forEach(el => el.style.visibility = cr ? 'hidden' : '');
    rib2.style.opacity = cr ? 1 : 0;
    if (cr) {
      const sh = sm(.15, 1, hq);
      const w = lerp(rib0.w, cr.w, m), top = lerp(0, cr.top, sh);
      rib2.style.left = lerp(rib0.x, cr.x, m) + 'px'; rib2.style.width = w + 'px';
      rib2.style.top = top + 'px'; rib2.style.height = Math.max(0, cr.bottom - top) + 'px';
      rib2.style.setProperty('--notch', (cr.notch * sh).toFixed(2) + 'px');
      rib2.style.setProperty('--slant', (cr.slant * m).toFixed(2) + 'px');
      rib2.style.background = `rgb(${lerp(70, 67, m)},${lerp(148, 145, m)},${lerp(169, 159, m)})`; // → chat book ribbon colour
    }
    go.style.opacity = (sm(.95, .99, p) * (1 - dk) * (1 - sm(0, .15, hq))).toFixed(3);
    const tocA = (1 - sm(.92, .97, p)).toFixed(3); tocBits.forEach(el => el.style.opacity = tocA);
    pageMarks.forEach(el => el.style.opacity = tocA); // SOS label + folio sit at the page bottom, mid-screen on phones
    pages.style.borderRadius = o > .5 ? '0' : '';

    caps.forEach((c, i) => { const [a, b] = capWin[i]; c.style.opacity = Math.min(sm(a, a + .02, p), 1 - sm(b - .02, b, p)).toFixed(3); });
    opener.style.opacity = (1 - sm(.02, .07, p)).toFixed(3);
    hint.style.opacity = (1 - sm(.01, .04, p)).toFixed(3);
    // handoff events for the host page (e.g. Next.js): fired once when the intro finishes, and when scrolled back
    if (!done && r >= .999) { done = true; window.dispatchEvent(new CustomEvent('genz-intro:complete')); }
    if (done && r < .97) { done = false; window.dispatchEvent(new CustomEvent('genz-intro:reset')); }
  }

  function frame(now) {
    // read layout first (before render writes styles) so the browser doesn't have to lay out twice per frame
    const tp = targetP(), hq = mainWeb ? clamp(1 - mainWeb.getBoundingClientRect().top / H) : 0;
    cur = reduce ? tp : cur + (tp - cur) * .085;
    if (Math.abs(tp - cur) < 1e-5) cur = tp;
    render(cur, now / 1000, hq);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
