'use client';

// Checklist tutorial: spotlights each part of the sheet in turn (the rest is dimmed) with a short tip.
// Opens by itself every time the page loads (refresh included); the '?' button opens it again.
// Kept out of learner.tsx on purpose — it only reads the page through the class names below.
import { useCallback, useEffect, useState } from 'react';

const STEPS = [
  { target: '.cute-tabs', title: '주제 고르기', text: '회사생활 7가지 주제마다 오늘의 미션이 있어요. 아이콘을 눌러 주제를 바꿔 보세요.' },
  { target: '.cute-content', title: '하나씩 체크하기', text: '할 수 있는 것부터 하나씩 체크해 보세요. 체크한 내용은 이 브라우저에 저장돼요.' },
  { target: '.cute-evidence-button', title: '근거 보기', text: '이 미션이 왜 필요한지, 어떤 자료를 바탕으로 만들었는지 확인할 수 있어요.' },
  { target: '.cute-finish', title: '완료 기록 저장', text: '미션을 모두 체크하면 버튼이 켜져요. 눌러서 오늘의 완료 기록을 남겨 보세요.' },
  { target: '.cute-history-button', title: '나의 완료 기록', text: '지금까지 저장한 완료 기록을 다시 볼 수 있어요.' },
  { target: '.cute-desk-pin', title: '책상에 붙이기', text: '체크리스트를 사무실 책상에 메모처럼 붙여 두고, 일하면서 바로 체크할 수 있어요.' },
  { target: '.cute-personal-button', title: '나만의 체크리스트', text: '내가 할 일을 직접 적어 나만의 체크리스트를 만들 수 있어요. 만든 목록도 책상에 붙일 수 있어요.' },
];
const PAD = 8;

type Box = { left: number; top: number; width: number; height: number };

export function ChecklistTutorial() {
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  // every page load: open after the sheet has rendered
  useEffect(() => {
    const t = setTimeout(() => setStep(0), 700);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => setStep(null), []);

  // follow the spotlighted element (it can move while fonts load or the window resizes)
  useEffect(() => {
    if (step === null) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(STEPS[step].target);
      const r = el?.getBoundingClientRect();
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
  }, [step, close]);

  const next = () => (step === null || step >= STEPS.length - 1 ? close() : setStep(step + 1));
  const prev = () => step && setStep(step - 1);

  // tip box: below the spotlight when there is room, otherwise above it; kept inside the window
  const tipW = 300, tipH = 180;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1000, vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = box ? box.top + box.height + 14 + tipH < vh : true;
  const tipTop = box ? (below ? box.top + box.height + 14 : Math.max(8, box.top - 14 - tipH)) : vh / 2 - tipH / 2;
  const tipLeft = box ? Math.min(vw - tipW - 8, Math.max(8, box.left + box.width / 2 - tipW / 2)) : vw / 2 - tipW / 2;

  return <>
    <button type="button" className="cute-tour-open" onClick={() => setStep(0)} aria-label="체크리스트 사용법 보기" title="사용법 보기">?</button>
    {step !== null && <div className="cute-tour" role="dialog" aria-modal="true" aria-labelledby="cute-tour-title">
      <div className="cute-tour__spot" style={box ?? { left: vw / 2, top: vh / 2, width: 0, height: 0 }} aria-hidden="true" />
      <div className="cute-tour__tip" style={{ top: tipTop, left: tipLeft, width: tipW }}>
        <p className="cute-tour__count">{step + 1} / {STEPS.length}</p>
        <h2 id="cute-tour-title">{STEPS[step].title}</h2>
        <p>{STEPS[step].text}</p>
        <div className="cute-tour__row">
          <button type="button" className="cute-tour__skip" onClick={close}>건너뛰기</button>
          {step > 0 && <button type="button" className="cute-tour__prev" onClick={prev}>이전</button>}
          <button type="button" className="cute-tour__next" onClick={next} autoFocus>{step === STEPS.length - 1 ? '시작하기' : '다음'}</button>
        </div>
      </div>
    </div>}
  </>;
}
