// ===== 체크리스트 =====
// data: [항목 문자열...]
// 체크 상태는 챕터(소주제가 있으면 소주제)별로 이 브라우저에만 저장된다
// (localStorage, 막혀 있으면 저장 없이 동작). 예) genz-checklist-ch2-mail
Components.checklist = (items, ctx) => {
  const storageKey = `genz-checklist-${ctx.scope}`;

  function load() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  }
  function save(state) {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  const saved = load();
  const count = h("span", { class: "checklist__count" });
  const bar = h("span", { class: "checklist__bar" });
  const done = h("p", { class: "checklist__done", hidden: true }, "🎉 모두 체크했어요!");

  const inputs = items.map((_, i) => {
    const input = h("input", { class: "checklist__input", type: "checkbox", onChange: update });
    input.checked = Boolean(saved[i]);
    return input;
  });

  function update() {
    const state = inputs.map((input) => input.checked);
    const n = state.filter(Boolean).length;
    save(state);
    count.textContent = `${n} / ${items.length}`;
    bar.style.width = `${(n / items.length) * 100}%`;
    done.hidden = n !== items.length;
  }

  const resetBtn = h("button", {
    class: "btn btn--ghost",
    type: "button",
    onClick: () => {
      inputs.forEach((input) => { input.checked = false; });
      update();
    },
  }, "초기화");

  update();

  const el = h("div", { class: "checklist" },
    h("div", { class: "checklist__head" },
      h("div", { class: "checklist__progress" }, bar),
      count),
    h("ul", { class: "checklist__list" },
      items.map((text, i) =>
        h("li", null,
          h("label", { class: "checklist__label" },
            inputs[i],
            h("span", { class: "checklist__box", "aria-hidden": "true" }),
            h("span", { class: "checklist__text" }, text))))),
    h("div", { class: "checklist__foot" }, done, resetBtn));

  return { el, destroy() {} };
};
