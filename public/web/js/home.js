// ===== 홈페이지 스크립트 =====

// ===== 검색창 (헤더) =====
// 아직 검색 대상이 없으므로 페이지 이동을 막고 입력값만 받아 둔다.
const searchForm = document.querySelector(".search");
const searchInput = document.querySelector(".search__input");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  // TODO: 검색 결과 처리
  console.log("검색어:", query);
});
