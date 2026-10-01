// ===== 숏폼 =====
// data: 숏폼 하나({...}) 또는 여러 개([{...}, ...])
//  { title, youtube: "영상 ID" }
//     유튜브 쇼츠. 썸네일을 보여주다가 누르면 그 자리에서 재생 (플레이어는 누를 때만 불러옴)
//  { title, scenes: [{ sec, text }], video?: "경로.mp4" }
//     장면별 자막 대본. 세로 화면 안에서 장면마다 sec초씩 자막을 넘긴다 (합계가 영상 길이)
//  { title, captions: [자막...] }  — scenes의 간단한 형태 (한 줄에 1.8초)
// 한 번에 하나만 재생된다.
Components.shorts = (data) => {
  const shorts = Array.isArray(data) ? data : [data];
  const players = shorts.map((short) => (short.youtube ? createYoutube(short) : createScript(short)));

  function stopOthers(current) {
    players.forEach((p) => p !== current && p.pause());
  }

  // --- 유튜브 쇼츠 ---
  function createYoutube(short) {
    const watchUrl = `https://www.youtube.com/shorts/${short.youtube}`;
    let playing = false;

    const cover = h("button", {
        class: "short__frame",
        type: "button",
        "aria-label": `${short.title} 재생`,
        onClick: () => player.play(),
      },
      h("img", {
        class: "short__thumb",
        src: `https://i.ytimg.com/vi/${short.youtube}/hqdefault.jpg`,
        alt: "",
        loading: "lazy",
      }),
      h("span", { class: "short__badge" }, "YouTube"),
      h("span", { class: "short__play", "aria-hidden": "true" }));

    const box = h("div", { class: "short__box" }, cover);

    const player = {
      el: h("article", { class: "short" },
        box,
        h("h3", { class: "short__title" }, short.title),
        h("a", { class: "short__link", href: watchUrl, target: "_blank", rel: "noopener" }, "YouTube에서 보기 ↗")),
      play() {
        stopOthers(player);
        playing = true;
        box.replaceChildren(h("iframe", {
          class: "short__frame short__iframe",
          src: `https://www.youtube-nocookie.com/embed/${short.youtube}?autoplay=1&playsinline=1&rel=0`,
          title: short.title,
          allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
          allowfullscreen: true,
          referrerpolicy: "strict-origin-when-cross-origin",
        }));
      },
      // 멈추면 플레이어를 없애고 썸네일로 되돌린다
      pause() {
        if (!playing) return;
        playing = false;
        box.replaceChildren(cover);
      },
    };
    return player;
  }

  // --- 장면별 자막 대본 ---
  function createScript(short) {
    let start = 0;
    const scenes = (short.scenes || (short.captions || [short.title]).map((text) => ({ text, sec: 1.8 })))
      .map((scene) => {
        const s = { ...scene, start };
        start += scene.sec;
        return s;
      });
    const total = start;

    let playing = false;
    let elapsed = 0;
    let lastTs = 0;
    let raf = 0;
    let current = -1;

    const caption = h("p", { class: "short__caption" });
    const sceneLabel = h("span", { class: "short__scene" });
    const time = h("span", { class: "short__time" });
    const bar = h("span", { class: "short__bar" });
    const video = short.video
      ? h("video", { class: "short__video", src: short.video, loop: true, playsinline: true, preload: "metadata" })
      : null;
    if (video) video.muted = true;

    const frame = h("button", {
        class: "short__frame",
        type: "button",
        "aria-label": `${short.title} 재생`,
        onClick: () => (playing ? player.pause() : player.play()),
      },
      video,
      h("div", { class: "short__progress" }, bar),
      sceneLabel,
      caption,
      time,
      h("span", { class: "short__play", "aria-hidden": "true" }));

    function render() {
      bar.style.width = `${(elapsed / total) * 100}%`;
      time.textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;

      let idx = 0;
      scenes.forEach((scene, i) => { if (scene.start <= elapsed) idx = i; });
      if (idx === current) return;
      current = idx;
      sceneLabel.textContent = `SCENE ${idx + 1}`;
      caption.textContent = scenes[idx].text;
      caption.classList.remove("is-in");
      void caption.offsetWidth; // 애니메이션 다시 시작
      caption.classList.add("is-in");
    }

    function tick(ts) {
      elapsed += (ts - lastTs) / 1000;
      lastTs = ts;
      if (elapsed >= total) {
        elapsed = total;
        render();
        player.pause();
        return;
      }
      render();
      raf = requestAnimationFrame(tick);
    }

    const player = {
      el: h("article", { class: "short" }, frame, h("h3", { class: "short__title" }, short.title)),
      play() {
        stopOthers(player);
        if (elapsed >= total) elapsed = 0; // 끝까지 봤으면 처음부터
        playing = true;
        frame.classList.add("is-playing");
        frame.setAttribute("aria-label", `${short.title} 일시정지`);
        video?.play().catch(() => {});
        lastTs = performance.now();
        raf = requestAnimationFrame(tick);
      },
      pause() {
        if (!playing) return;
        playing = false;
        cancelAnimationFrame(raf);
        frame.classList.remove("is-playing");
        frame.setAttribute("aria-label", `${short.title} 재생`);
        video?.pause();
      },
    };

    render();
    return player;
  }

  const el = h("div", { class: "shorts" }, players.map((p) => p.el));
  return { el, destroy: () => players.forEach((p) => p.pause()) };
};
