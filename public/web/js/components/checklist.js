// ===== 체크리스트 =====
// data: [항목 문자열...] (chapters.js) 또는 [{ title, items: [...] }] (DB checklists 테이블)
// DB에 이 챕터의 체크리스트가 있으면 그것을, 없으면 chapters.js의 항목을 보여준다.
// 체크 상태는 이 브라우저에만 저장된다 (localStorage, 막혀 있으면 저장 없이 동작).
//  chapters.js 항목: 챕터(소주제)별 예) genz-checklist-ch2-mail / DB 항목: 행 id별 예) genz-checklist-db-1-2-3
Components.checklist = (localItems, ctx) => fromTable("checklists", ctx, {
  fallback: localItems,
  toData: (rows) => (rows.length
    ? rows.map((row) => ({
        id: row.id,
        title: row.title,
        items: [row.item1, row.item2, row.item3, row.item4, row.item5]
          .filter((text) => typeof text === "string" && text.trim()),
      })).filter((group) => group.items.length)
    : null),
  render: renderChecklist,
});

function renderChecklist(data, ctx) {
  const groups = typeof data[0] === "string" ? [{ items: data }] : data;
  const items = groups.flatMap((group) => group.items);
  const storageKey = groups[0].id != null
    ? `genz-checklist-db-${groups.map((group) => group.id).join("-")}`
    : `genz-checklist-${ctx.scope}`;

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

  let offset = 0;
  const el = h("div", { class: "checklist" },
    h("div", { class: "checklist__head" },
      h("div", { class: "checklist__progress" }, bar),
      count),
    groups.flatMap((group) => {
      const start = offset;
      offset += group.items.length;
      return [
        group.title && h("h3", { class: "checklist__group" }, group.title),
        h("ul", { class: "checklist__list" },
          group.items.map((text, j) =>
            h("li", null,
              h("label", { class: "checklist__label" },
                inputs[start + j],
                h("span", { class: "checklist__box", "aria-hidden": "true" }),
                h("span", { class: "checklist__text" }, text))))),
      ];
    }),
    h("div", { class: "checklist__foot" }, done, resetBtn));

  return { el, destroy() {} };
}
