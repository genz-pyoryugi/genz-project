// PDF → 서버 AI 변환 → 기존 학습 컴포넌트. 새로고침 전까지만 결과를 보관한다.
(() => {
  const input = document.querySelector("#manual-file");
  const status = document.querySelector("#manual-file-status");
  const clear = document.querySelector("#manual-file-clear");
  const convert = document.querySelector("#manual-convert");
  let pending = false;
  let sourceUrl = null;
  let chapterNumber = 9;
  input.addEventListener("change", () => {
    const file = input.files[0];
    convert.disabled = true;
    clear.hidden = !file;
    status.classList.remove("is-error");
    if (!file) {
      status.textContent = "아직 선택한 파일이 없어요.";
      return;
    }
    const error = !/\.pdf$/i.test(file.name) ? "PDF 파일을 선택해 주세요."
      : file.size === 0 ? "비어 있는 파일이에요. 다른 PDF를 선택해 주세요."
      : file.size > 10 * 1024 * 1024 ? "10MB 이하의 PDF를 선택해 주세요." : null;
    if (error) {
      input.value = "";
      clear.hidden = true;
      status.classList.add("is-error");
      status.textContent = error;
      return;
    }
    status.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB · 선택 완료`;
    convert.disabled = pending;
  });
  clear.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("change"));
    input.focus();
  });
  convert.addEventListener("click", async () => {
    const file = input.files[0];
    if (!file || pending) return;
    pending = true;
    input.disabled = clear.disabled = convert.disabled = true;
    convert.textContent = "PDF 분석·학습 자료 생성 중…";
    status.classList.remove("is-error");
    status.textContent = "PDF를 분석하고 있어요. 문서에 따라 최대 3분 정도 걸릴 수 있습니다.";
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/manuals/convert", { method: "POST", body: form, signal: AbortSignal.timeout(180000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "PDF 변환에 실패했어요.");
      const data = result.learning;
      // 서버가 검증한 데이터만 받아 textContent 기반 컴포넌트에 전달한다.
      const nextUrl = URL.createObjectURL(file);
      const id = `ch${chapterNumber++}`;
      const previous = CHAPTERS.findIndex(chapter => chapter.uploadedManual);
      if (previous >= 0) {
        const previousId = CHAPTERS[previous].id;
        for (const key of componentState.keys()) if (key.startsWith(`${previousId}:`)) componentState.delete(key);
        CHAPTERS.splice(previous, 1);
      }
      CHAPTERS.push({ id, num: "MY", title: data.title, desc: data.description,
        localOnly: true, uploadedManual: true, formats: ["guide", "adventure", "quiz", "checklist"],
        source: { title: file.name, url: nextUrl, pages: result.pageCount },
        guide: data.guide, adventure: data.adventure,
        quiz: data.quiz.map(question => ({ ...question, explain: `${question.explain} (근거: PDF ${question.page}쪽)` })),
        checklist: data.checklist.map(item => `${item.text} (근거: PDF ${item.page}쪽)`),
      });
      location.hash = id;
      // UI 교체 후 이전 PDF의 메모리를 정리한다.
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = nextUrl;
      status.textContent = "학습 챕터를 만들었어요! 아래 화면에서 학습하고 원문 근거를 확인해 주세요.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error.name === "TimeoutError" ? "처리가 오래 걸리고 있어요. 더 짧은 PDF로 다시 시도해 주세요." : error.message;
    } finally {
      pending = false;
      input.disabled = clear.disabled = false;
      convert.disabled = !input.files[0];
      convert.textContent = "학습 챕터 만들기";
    }
  });
})();
