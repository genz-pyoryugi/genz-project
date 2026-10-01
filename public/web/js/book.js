// ===== 첫 화면 채팅 책 =====
// 오른쪽 아래 책 그림(assets/picture/chatbook.png)을 클릭하면 채팅창(js/chat.js)이 열리고
// 뒤 화면이 어두워진다. 다시 클릭하거나 채팅창을 닫으면(× · 바깥 클릭 · Esc) 닫힌다.
// 채팅창은 책 왼쪽에, 위는 목차 제목 높이부터 아래는 책 아래 끝까지 펼쳐진다.
(() => {
  const button = document.querySelector(".chatbook");
  const heroBook = document.querySelector(".hero__book");
  if (!button || !heroBook) return;

  const openImg = button.querySelector(".chatbook__open");

  // 채팅이 열려 있는 동안엔 펼친 책(chatbook1.png)이 보이므로 그 기준으로 자리를 잡는다
  const BOOK_BOTTOM = 0.8;  // 닫힌 책 그림 위에서 책 아래 끝까지 (펼친 책도 여기에 맞춰 놓임, CSS bottom: 20%)
  const OPEN_EDGE = 0.02;   // 펼친 책 그림 왼쪽의 투명한 여백
  const GAP = 16;           // 채팅창과 책 사이 간격

  let open = false;

  // 채팅창 위치 (화면 좌표): 펼친 책 왼쪽 끝 - 간격 / 목차 제목 위 / 책 아래 끝
  // (펼친 책은 커지며 나타나는 중일 수 있어서 변형 전 크기 offsetWidth로 계산)
  function chatGeometry() {
    const rect = button.getBoundingClientRect();
    const heading = document.querySelector(".toc__heading");
    const bottom = rect.top + rect.height * BOOK_BOTTOM;
    const openLeft = rect.right - openImg.offsetWidth * (1 - OPEN_EDGE);
    return {
      right: openLeft - GAP,
      top: heading ? heading.getBoundingClientRect().top : bottom - 480,
      bottom,
    };
  }

  function setOpen(value) {
    open = value;
    heroBook.classList.toggle("is-launched", value); // 어두운 화면보다 앞으로 + 떠오른 채 유지
    button.setAttribute("aria-expanded", String(value));
    if (value) BookChat.open(chatGeometry());
    else BookChat.close();
  }

  BookChat.onRequestClose = () => {
    if (!open) return;
    setOpen(false);
    button.focus({ preventScroll: true });
  };

  button.addEventListener("click", () => setOpen(!open));
  window.addEventListener("resize", () => {
    if (open) BookChat.position(chatGeometry());
  });
})();
