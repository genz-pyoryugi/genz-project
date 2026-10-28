/* =========================================================
   젠지 표류기 — outro: lines (.reveal) appear as they scroll into view, one after another within a scene;
   a bar at the top shows how far down the way home you are.
   사무실 팝업 안에서 열리면 끝 버튼이 사무실에 알림: genz-outro:close (닫기) / genz-outro:restart (닫고 인트로 처음으로)
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const inOffice = window.parent !== window;
  const tell = type => { if (inOffice) parent.postMessage({ type }, location.origin); };

  // ---- 오늘의 성장 기록 (간결형): 오늘 연습한 것 한 문장 → 카테고리별 점수 → 다음에 연습할 것 하나 ----
  // 이 브라우저의 localStorage 에 남은 기록만 쓴다 (web/js/components/cardnews-learning.js · app/quiz/page.tsx · web/js/simulation.js 가 남김).
  //  · 카드뉴스 1~5점은 스스로 매긴 이해도라 '자기평가 이해도'로만 보여 주고, 능력이 늘었다고 말하지 않는다
  //  · 전후 비교는 같은 퀴즈 주제를 다시 풀었을 때, AI 팀장은 같은 상황 · 같은 팀장으로 다시 답변했을 때(서버가 previous 를 보냄)만
  //  · AI 팀장 피드백은 저장된 실제 평가 결과만 (Supabase simulation_attempts 에도 같은 값이 저장됨) — 핵심 한 줄, 나머지는 '자세히 보기'
  // 아래 .reveal 등록보다 먼저 그려야 새 줄도 스크롤할 때 나타난다
  (function renderGrowth() {
    // src/lib/simulation/scenarios.ts 의 CATEGORIES · web/js/simulation.js 의 CARDNEWS_BY_CATEGORY · 카드뉴스 / 퀴즈 ?topic=0~6 과 같은 순서
    const CATEGORIES = ['조직 이해·적응', '업무 절차&기준', '질문&소통', '협업&동료 존중', '직장 관계&예절', '근무&재택 수칙', '공용 공간&비품 관리'];
    const CARDNEWS = [['first-day-adaptation'], ['workplace-ethics'], ['email-messenger-communication'],
      ['communication-newsletter-test', 'workplace-communication'], ['workplace-interpersonal'], ['remote-work-agreements'], ['shared-spaces-supplies']];
    const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
    const nameKey = name => String(name).replace(/[^가-힣a-zA-Z0-9]/g, '');
    const avg = list => list.reduce((a, b) => a + b, 0) / list.length;
    const num = v => Math.round(v * 10) / 10;
    const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const quiz = read('genz_quiz_scores') || {};
    const sims = Object.values(read('genz_sim_results') || {}).filter(r => r && r.total != null);

    const kinds = new Set(), next = [];
    const rows = CATEGORIES.map((name, i) => {
      const items = [];
      const cards = CARDNEWS[i].map(id => read('genz:cardnews-learning:v1:' + id)).filter(r => r && r.completedAt && r.preResponse && r.postResponse);
      if (cards.length) {
        kinds.add('카드뉴스');
        const from = avg(cards.map(r => r.preResponse)), to = avg(cards.map(r => r.postResponse));
        items.push({ label: '카드뉴스 · 자기평가 이해도', value: `${num(from)} → ${num(to)}점` });
        if (to < from || to <= 3) next.push({ rank: to < from ? 0 : 3, text: `${name} 카드뉴스를 다시 읽고 헷갈렸던 내용을 확인해 보세요.`, go: { object: 'files', topic: i, label: '카드뉴스 다시 보기' } });
      }
      const qKey = Object.keys(quiz).find(t => nameKey(t) === nameKey(name));
      if (qKey) {
        kinds.add('퀴즈');
        const q = quiz[qKey], pct = r => Math.round((r.score / r.total) * 100), again = q.first.at !== q.last.at;
        items.push({ label: again ? '퀴즈 · 정답률 (다시 풀기)' : '퀴즈 · 정답률', value: again ? `${pct(q.first)}% → ${pct(q.last)}%` : `${pct(q.last)}%` });
        if (pct(q.last) < 100) next.push({ rank: pct(q.last) < 60 ? 1 : 2, text: `${name} 퀴즈에서 놓친 문항을 다시 풀어 보세요.`, go: { object: 'pen', topic: i, label: '퀴즈 다시 풀기' } });
      }
      sims.filter(r => r.category === name).forEach(r => {
        kinds.add('AI 팀장 대화');
        const good = (r.strengths || []).slice(0, 2), miss = (r.missedPoints || []).slice(0, 2);
        items.push({ label: `AI 팀장 · ${r.title}`, value: r.previous ? `${r.previous.total} → ${r.total}점` : `${r.total} / 15점`,
          bar: ((r.total - 3) / 12) * 100, key: miss[0] ? ['보완할 점', miss[0]] : good[0] ? ['잘한 점', good[0]] : null, good, miss });
        if (miss[0]) next.push({ rank: 2, text: `AI 팀장 「${r.title}」 상황을 다시 연습해 보세요.`, go: { object: 'monitor', label: 'AI 팀장 연습하기' } });
      });
      return { name, num: String(i + 1).padStart(2, '0'), items };
    });
    const done = rows.filter(r => r.items.length);
    if (!done.length) return; // 기록이 없으면 이 장면은 숨긴 채로

    // 오늘 연습한 것: 실제로 기록이 있는 주제와 활동만 모아 한 문장 (향상 여부는 말하지 않음)
    const names = done.map(r => r.name), list = names.length > 3 ? `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}개 주제` : names.join(', ');
    // 을/를: 마지막 글자에 받침이 있으면 '을' (활동 이름은 모두 받침 없이 끝나 '로')
    const last = list.charCodeAt(list.length - 1), batchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 > 0;
    $('growthPracticed').textContent = `${list}${batchim ? '을' : '를'} ${[...kinds].join(' · ')}로 연습했어요.`;

    // 카테고리별 기록: 지표 이름과 점수만 (AI 팀장은 점수 바 + 핵심 피드백 한 줄 + 자세히 보기)
    $('growthList').innerHTML = done.map(r => `
      <section class="growth__cat">
        <h3 class="growth__name"><span>${r.num}</span>${esc(r.name)}</h3>
        ${r.items.map(m => `<div class="growth__row">
          <span class="growth__label">${esc(m.label)}</span><span class="growth__value">${m.value}</span>
          ${m.bar != null ? `<span class="growth__bar" aria-hidden="true"><i style="width:${Math.max(4, m.bar)}%"></i></span>` : ''}
          ${m.key ? `<p class="growth__key"><b>${m.key[0]}</b> ${esc(m.key[1])}</p>` : ''}
          ${m.good && (m.good.length || m.miss.length) ? `<details class="growth__more"><summary>피드백 자세히 보기</summary><dl>
            ${m.good.map(t => `<div><dt>잘한 점</dt><dd>${esc(t)}</dd></div>`).join('')}
            ${m.miss.map(t => `<div><dt>보완할 점</dt><dd>${esc(t)}</dd></div>`).join('')}</dl></details>` : ''}
        </div>`).join('')}
      </section>`).join('');

    // 다음에 연습할 것 하나: 이해도가 낮아진 카드뉴스 → 정답률이 낮은 퀴즈 → AI 보완점 · 남은 퀴즈 → 이해도가 낮게 남은 카드뉴스 → 아직 안 한 주제
    next.sort((a, b) => a.rank - b.rank);
    if (!next.length) {
      const fresh = rows.findIndex(r => !r.items.length);
      if (fresh >= 0) next.push({ text: `아직 학습하지 않은 ${CATEGORIES[fresh]} 카드뉴스부터 시작해 보세요.`, go: { object: 'files', topic: fresh, label: '카드뉴스 보기' } });
    }
    const pick = next[0];
    $('growthNextBlock').hidden = !pick;
    if (pick) {
      $('growthNext').textContent = pick.text;
      const go = $('growthGo');
      go.textContent = pick.go.label + ' →';
      // 사무실 팝업 안이면 사무실에 그 물건(카드뉴스 · 퀴즈는 그 주제 탭)을 열어 달라고 하고, 따로 열렸으면 그 페이지로 이동
      const HREF = { files: '/web/cardnews.html', pen: '/quiz', monitor: '/web/sos.html?view=sim' };
      const query = pick.go.topic != null ? `?topic=${pick.go.topic}` : '';
      go.addEventListener('click', () => {
        if (inOffice) parent.postMessage({ type: 'genz-office:open', object: pick.go.object, query }, location.origin);
        else location.href = HREF[pick.go.object] + query;
      });
    }
    $('growth').hidden = false;
  })();

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
