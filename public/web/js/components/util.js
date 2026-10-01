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
