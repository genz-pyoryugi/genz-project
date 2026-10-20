/* exported formatTime, prefersReducedMotion, fromTable */
// ===== 컴포넌트 공통 도구 =====
// 모든 컴포넌트는 (data, ctx) => ({ el, destroy }) 형태로 만들고 window.Components에 등록한다.
//  el: 화면에 붙일 요소 / destroy: 다른 탭으로 바꿀 때 타이머·재생을 정리
window.Components = {};

// h("div", { class: "a", onClick: fn }, 자식...) 으로 요소를 만든다.
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style") el.style.cssText = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child);
  }
  return el;
}

// 초 → "0:05"
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ===== Supabase 데이터 =====
// /api/<테이블 이름>은 Next 서버가 Supabase에서 읽어서 돌려준다. (브라우저에는 키를 넣지 않는다)
// 테이블마다 한 번만 받아 두고 챕터 · 탭을 오가며 같이 쓴다.
const tableCache = {};
function fetchTable(table) {
  tableCache[table] ??= fetch(`/api/${table}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`${table} ${response.status}`);
      return response.json();
    })
    .then((rows) => {
      if (!Array.isArray(rows)) throw new Error(`${table} invalid response`);
      return rows;
    })
    .catch((error) => {
      delete tableCache[table]; // 실패하면 다음에 다시 받아 본다
      throw error;
    });
  return tableCache[table];
}

// "첫인상&대면"과 "첫인상 & 대면"처럼 띄어쓰기만 다른 카테고리는 같은 것으로 본다
const sameCategory = (a, b) =>
  String(a || "").replace(/\s/g, "") === String(b || "").replace(/\s/g, "");

// DB 테이블에서 이 챕터(ctx.category)의 행을 골라 컴포넌트를 그린다.
//  toData(rows, ctx): 행 → 컴포넌트 데이터. 쓸 데이터가 없으면 null
//  render(data, ctx): 실제 컴포넌트 ({ el, destroy })
//  fallback: DB에 이 챕터 데이터가 없거나 불러오지 못하면 대신 그릴 데이터 (chapters.js)
function fromTable(table, ctx, { toData, render, fallback }) {
  const el = h("div", { "aria-live": "polite" });
  let active = null;
  let destroyed = false;

  function show(data) {
    active = render(data, ctx);
    el.replaceChildren(active.el);
  }

  function load() {
    el.replaceChildren(h("p", null, "불러오는 중이에요…"));
    fetchTable(table)
      .then((rows) => {
        if (destroyed) return;
        const data = toData(rows.filter((row) => sameCategory(row.category, ctx.category)), ctx);
        if (data) show(data);
        else if (fallback != null) show(fallback);
        else el.replaceChildren(h("p", null, "이 챕터에 등록된 내용이 아직 없어요."));
      })
      .catch(() => {
        if (destroyed) return;
        if (fallback != null) return show(fallback);
        el.replaceChildren(
          h("p", null, "불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
          h("button", { class: "btn", type: "button", onClick: load }, "다시 시도"));
      });
  }

  load();
  return { el, destroy() { destroyed = true; active?.destroy(); } };
}
