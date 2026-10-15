// ===== 보이는 라디오 =====
// data: { title, hosts: [{ name, role }], lines: [[진행자 번호, 대사, 시작 초?]], audio? }
//  hosts[0]은 DJ(왼쪽 말풍선), 나머지는 게스트(오른쪽 말풍선).
// 음성 파일(audio)이 있으면 그 재생 시간에, 없으면 대사 길이로 계산한 가상 시간에 맞춰
// 말풍선이 하나씩 나타나고, 말하는 사람 강조 · 이퀄라이저가 함께 움직인다.
// 음성과 맞추려면 lines의 세 번째 값(시작 초)을 넣으면 된다.
// DB radio_contents 테이블에 이 챕터의 회차가 있으면 그것을, 없으면 chapters.js의 라디오를 보여준다.
// 소주제가 있는 챕터는 sub_category에 소주제 이름(예: 메일)이 들어간 회차만 고른다.
const DB_RADIO_HOSTS = { senior: { name: "하루", role: "선배 DJ" }, junior: { name: "새봄", role: "신입 DJ" } };

Components.radio = (localRadio, ctx) => fromTable("radio_contents", ctx, {
  fallback: localRadio,
  toData: (rows) => {
    const episodes = rows
      .filter((row) => !ctx.topic || String(row.sub_category || "").includes(ctx.topic))
      .map(radioFromRow)
      .filter(Boolean);
    return episodes.length ? episodes : null;
  },
  render: renderRadioEpisodes,
});

// DB 한 행 → 라디오 데이터. script: [{ speaker: "senior" | "junior", line }]
function radioFromRow(row) {
  const script = (Array.isArray(row.script) ? row.script : [])
    .filter((item) => item && typeof item.line === "string" && item.line.trim());
  if (!script.length) return null;
  const speakers = ["senior", "junior"];
  script.forEach((item) => { if (!speakers.includes(item.speaker)) speakers.push(item.speaker); });
  return {
    title: row.title,
    hosts: speakers.map((speaker) => DB_RADIO_HOSTS[speaker] || { name: String(speaker || "게스트"), role: "게스트" }),
    lines: script.map((item) => [speakers.indexOf(item.speaker), item.line]),
    audio: row.audio_url || undefined,
  };
}

// 회차가 여러 개면 위에 회차 버튼을 두고 하나씩 보여준다
function renderRadioEpisodes(data) {
  const episodes = Array.isArray(data) ? data : [data];
  if (episodes.length === 1) return renderRadio(episodes[0]);

  let active = null;
  const stage = h("div");
  const tabs = episodes.map((episode, i) =>
    h("button", { class: "chapter__tab", type: "button", onClick: () => select(i) }, `${i + 1}화 · ${episode.title}`));

  function select(i) {
    active?.destroy();
    active = renderRadio(episodes[i]);
    stage.replaceChildren(active.el);
    tabs.forEach((tab, j) => tab.setAttribute("aria-pressed", String(i === j)));
  }

  select(0);
  return {
    el: h("div", null, h("div", { class: "radio__episodes" }, tabs), stage),
    destroy: () => active?.destroy(),
  };
}

function renderRadio(radio) {
  const lines = radio.lines.map(([host, text, start]) => ({ host, text, start }));
  let t = 0;
  lines.forEach((line) => {
    if (line.start == null) line.start = t;
    t = line.start + Math.max(2.5, line.text.length * 0.09 + 1);
  });
  let total = t;

  const audio = radio.audio ? new Audio(radio.audio) : null;
  audio?.addEventListener("loadedmetadata", () => { total = audio.duration; render(); });

  let playing = false;
  let elapsed = 0;
  let lastTs = 0;
  let raf = 0;
  let current = -1;

  // --- 무대 (진행자 · 이퀄라이저 · 재생 컨트롤) ---
  const hosts = radio.hosts.map((host) =>
    h("div", { class: "radio__host" },
      h("span", { class: "radio__avatar", "aria-hidden": "true" }, host.name[0]),
      h("span", { class: "radio__name" }, host.name),
      h("span", { class: "radio__role" }, host.role)));

  const eq = h("div", { class: "radio__eq", "aria-hidden": "true" },
    Array.from({ length: 28 }, () => h("span", {
      style: `animation-duration: ${(0.5 + Math.random() * 0.6).toFixed(2)}s; animation-delay: -${Math.random().toFixed(2)}s`,
    })));

  const playBtn = h("button", { class: "radio__play", type: "button", "aria-label": "재생", onClick: toggle });
  const fill = h("span", { class: "radio__fill" });
  const seek = h("div", {
    class: "radio__seek",
    role: "slider",
    tabindex: "0",
    "aria-label": "재생 위치",
    "aria-valuemin": "0",
    onClick: (e) => {
      const rect = seek.getBoundingClientRect();
      seekTo(((e.clientX - rect.left) / rect.width) * total);
    },
    onKeydown: (e) => {
      if (e.key === "ArrowRight") seekTo(getTime() + 5);
      if (e.key === "ArrowLeft") seekTo(getTime() - 5);
    },
  }, fill);
  const time = h("span", { class: "radio__time" });

  // --- 말풍선 대화 ---
  const messages = lines.map((line) => {
    const host = radio.hosts[line.host];
    return h("li", { class: `radio__msg ${line.host === 0 ? "radio__msg--dj" : "radio__msg--guest"}` },
      h("span", { class: "radio__msg-avatar", "aria-hidden": "true" }, host.name[0]),
      h("div", { class: "radio__msg-body" },
        h("span", { class: "radio__msg-name" }, `${host.name} · ${host.role}`),
        h("button", {
          class: "radio__bubble",
          type: "button",
          onClick: () => { seekTo(line.start); if (!playing) play(); },
        }, line.text)));
  });
  const chat = h("ol", { class: "radio__chat", role: "log", "aria-live": "polite" }, messages);

  const el = h("div", { class: "radio" },
    h("div", { class: "radio__stage" },
      h("div", { class: "radio__top" },
        h("span", { class: "radio__onair" }, "ON AIR"),
        h("h3", { class: "radio__title" }, radio.title)),
      h("div", { class: "radio__hosts" }, hosts),
      eq,
      h("div", { class: "radio__controls" }, playBtn, seek, time)),
    chat);

  // --- 재생 ---
  function getTime() {
    return audio ? audio.currentTime : elapsed;
  }

  function seekTo(sec) {
    const next = Math.max(0, Math.min(total, sec));
    if (audio) audio.currentTime = next;
    else elapsed = next;
    render();
  }

  function play() {
    if (getTime() >= total) seekTo(0);
    playing = true;
    el.classList.add("is-playing");
    playBtn.setAttribute("aria-label", "일시정지");
    audio?.play().catch(pause);
    lastTs = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    el.classList.remove("is-playing");
    playBtn.setAttribute("aria-label", "재생");
    audio?.pause();
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function tick(ts) {
    if (!audio) elapsed += (ts - lastTs) / 1000;
    lastTs = ts;
    if (getTime() >= total) {
      seekTo(total);
      pause();
      return;
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function render() {
    const now = getTime();
    fill.style.width = `${(now / total) * 100}%`;
    time.textContent = `${formatTime(now)} / ${formatTime(total)}`;
    seek.setAttribute("aria-valuemax", String(Math.round(total)));
    seek.setAttribute("aria-valuenow", String(Math.round(now)));
    seek.setAttribute("aria-valuetext", formatTime(now));

    let idx = 0;
    lines.forEach((line, i) => { if (line.start <= now) idx = i; });
    if (idx === current) return;
    current = idx;

    // 지금 대사까지만 말풍선을 보여주고, 지금 말하는 사람을 강조
    hosts.forEach((hostEl, i) => hostEl.classList.toggle("is-speaking", i === lines[idx].host));
    messages.forEach((msg, i) => {
      msg.hidden = i > idx;
      msg.classList.toggle("is-current", i === idx);
    });

    // 대화창 안에서만 스크롤 (페이지는 움직이지 않음)
    const msg = messages[idx];
    chat.scrollTo({
      top: msg.offsetTop + msg.offsetHeight - chat.clientHeight + 12,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  render();

  return {
    el,
    destroy() {
      pause();
      if (audio) audio.src = "";
    },
  };
}
