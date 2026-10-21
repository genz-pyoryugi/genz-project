'use client';

// 보이는 라디오 튜토리얼: 라디오 화면의 각 부분을 차례로 밝게 비추고(나머지는 어둡게) 짧게 설명한다.
// 페이지를 열 때마다(새로고침 포함) 저절로 열리고, 오른쪽 아래 '?' 버튼으로 다시 열 수 있다.
// VisibleRadioModal 의 data-tour 표시로만 찾는다 (없는 부분은 건너뜀).
import { useCallback, useEffect, useState } from 'react';

const STEPS = [
  { target: '[data-tour="radio-story"]', title: '오늘의 사연', text: '고민상담소에서 공감을 많이 받은 사연이에요. 형광펜 부분이 고민의 핵심이에요.' },
  { target: '[data-tour="radio-stage"]', title: 'DJ가 읽어 줘요', text: 'DJ 하루와 새봄이 사연을 읽고, 선배들의 조언을 함께 이야기해요.' },
  { target: '[data-tour="radio-player"]', title: '재생하기', text: '재생 버튼을 누르면 방송이 시작돼요. 막대를 움직여 원하는 부분부터 들을 수 있어요.' },
  { target: '[data-tour="radio-chat"]', title: 'DJ 대화 자막', text: '방송 내용이 대화 자막으로 나와요. 소리 없이 읽기만 해도 괜찮아요.' },
  { target: '[data-tour="radio-pick"]', title: '다른 사연 듣기', text: '여기서 7가지 주제의 인기 사연 중 다른 사연을 골라 들을 수 있어요.' },
  { target: '[data-tour="radio-go"]', title: '고민상담소로 바로가기', text: '사연 원문과 선배들의 테이프 조언을 고민상담소에서 더 볼 수 있어요.' },
];
const PAD = 8;
type Box = { left: number; top: number; width: number; height: number };

export function RadioTutorial() {
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [steps, setSteps] = useState(STEPS);

  const open = useCallback(() => {
    const present = STEPS.filter(s => document.querySelector(s.target));
    if (!present.length) return;
    setSteps(present);
    setStep(0);
  }, []);
  // every page load: open after the radio has rendered
  useEffect(() => {
    const t = window.setTimeout(open, 900);
    return () => clearTimeout(t);
  }, [open]);
  const close = useCallback(() => setStep(null), []);

  // follow the spotlighted element (layout can shift while images / fonts load)
  useEffect(() => {
    if (step === null) return;
    let raf = 0;
    const el = document.querySelector(steps[step].target);
    el?.scrollIntoView({ block: 'nearest' });
    const measure = () => {
      const r = document.querySelector(steps[step].target)?.getBoundingClientRect();
      setBox(prev => {
        if (!r || !r.width) return null;
        const next = { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        return prev && Math.abs(prev.left - next.left) < .5 && Math.abs(prev.top - next.top) < .5 && Math.abs(prev.width - next.width) < .5 && Math.abs(prev.height - next.height) < .5 ? prev : next;
      });
      raf = requestAnimationFrame(measure);
    };
    measure();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); };
  }, [step, steps, close]);

  const replay = <button type="button" onClick={open} aria-label="보이는 라디오 사용법 보기" title="사용법 보기"
    className="fixed right-4 bottom-4 z-[900] w-9 h-9 rounded-full bg-[#102B46] text-white font-bold shadow-md hover:bg-[#1b3b5c]">?</button>;
  if (step === null) return replay;

  const next = () => (step >= steps.length - 1 ? close() : setStep(step + 1));
  const prev = () => step && setStep(step - 1);
  // tip: below the spotlight when there is room, otherwise above, else beside; kept inside the window
  const tipW = 300, tipH = 170, vw = window.innerWidth, vh = window.innerHeight;
  let tipTop = vh / 2 - tipH / 2, tipLeft = vw / 2 - tipW / 2;
  if (box) {
    if (box.top + box.height + 14 + tipH < vh) tipTop = box.top + box.height + 14;
    else if (box.top - 14 - tipH > 0) tipTop = box.top - 14 - tipH;
    else tipTop = Math.min(vh - tipH - 8, Math.max(8, box.top + 20));
    tipLeft = Math.min(vw - tipW - 8, Math.max(8, box.left + box.width / 2 - tipW / 2));
    if (tipTop === Math.min(vh - tipH - 8, Math.max(8, box.top + 20)) && box.width > vw * .4) tipLeft = box.left + box.width + 14 + tipW < vw ? box.left + box.width + 14 : Math.max(8, box.left - 14 - tipW);
  }

  return <>
    {replay}
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-labelledby="radio-tour-title">
      <div aria-hidden="true" className="fixed rounded-[16px] pointer-events-none transition-all duration-300"
        style={{ ...(box ?? { left: vw / 2, top: vh / 2, width: 0, height: 0 }), boxShadow: '0 0 0 9999px rgba(8,20,36,.62), 0 0 0 3px #56a5ce' }} />
      <div className="fixed box-border px-4 pt-3.5 pb-3 rounded-[14px] border-2 border-[#102B46] bg-[#F6F4EC] text-[#102B46] shadow-xl transition-all duration-300"
        style={{ top: tipTop, left: tipLeft, width: tipW }}>
        <p className="m-0 mb-0.5 text-[11px] font-extrabold text-[#397C9B]">{step + 1} / {steps.length}</p>
        <h2 id="radio-tour-title" className="m-0 mb-1.5 text-base font-extrabold">{steps[step].title}</h2>
        <p className="m-0 mb-3 text-[13px] leading-relaxed break-keep">{steps[step].text}</p>
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={close} className="mr-auto px-3 py-1.5 text-xs font-bold text-[#5E6F7C]">건너뛰기</button>
          {step > 0 && <button type="button" onClick={prev} className="px-3 py-1.5 rounded-lg border-[1.5px] border-[#102B46] bg-white text-xs font-bold">이전</button>}
          <button type="button" onClick={next} autoFocus className="px-3 py-1.5 rounded-lg bg-[#102B46] text-white text-xs font-bold">{step === steps.length - 1 ? '라디오 듣기' : '다음'}</button>
        </div>
      </div>
    </div>
  </>;
}
