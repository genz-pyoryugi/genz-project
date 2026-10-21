'use client';

// 근태 가이드(캘린더) 튜토리얼: 달력의 각 부분을 차례로 밝게 비추고(나머지는 어둡게) 짧게 설명한다.
// 근태 가이드를 열 때마다(새로고침 포함) 저절로 열리고, '?' 도움말 안의 '사용법 다시 보기'로 다시 열 수 있다
// (window 이벤트 'genz-calendar:tour'). page.tsx 는 거의 고치지 않고 아래 클래스 이름으로만 찾는다.
import { useCallback, useEffect, useState } from 'react';
import './tutorial.css';

const STEPS = [
  { target: '.calendar-tabs', title: '주제 고르기', text: '근로시간 · 휴일·휴가 · 퇴직·해고, 세 가지 주제가 있어요. 탭을 눌러 주제를 바꿔 보세요.' },
  { target: '.date-grid .sticker', title: '스티커 눌러 보기', text: '날짜에 붙은 스티커를 누르면 그날 상황에 맞는 규칙을 알려 줘요. 확인한 스티커에는 초록 체크가 생겨요.' },
  { target: '.page-controls', title: '다음 장 넘기기', text: '화살표로 달력을 넘기며 다른 주제의 스티커도 살펴보세요.' },
  { target: '.calendar-footer .quiz-start', title: 'OX 퀴즈 도전', text: '스티커로 배운 내용을 OX 퀴즈로 확인해요.' },
  { target: '.calendar-records', title: '퀴즈 기록', text: '지금까지 푼 퀴즈 결과를 다시 볼 수 있어요.' },
  { target: '.calendar-help', title: '도움말', text: '헷갈리면 언제든 ?를 눌러 이용 방법과 참고 자료를 확인하세요.' },
];
const PAD = 8;

type Box = { left: number; top: number; width: number; height: number };

export function CalendarTutorial() {
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  // every page load: open after the calendar has rendered; again from the help dialog
  useEffect(() => {
    const t = window.setTimeout(() => setStep(0), 800);
    const open = () => setStep(0);
    addEventListener('genz-calendar:tour', open);
    return () => { clearTimeout(t); removeEventListener('genz-calendar:tour', open); };
  }, []);

  const close = useCallback(() => setStep(null), []);

  // follow the spotlighted element (it can move while fonts load, the window resizes or the office popup scales the calendar)
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

  if (step === null) return null;
  const next = () => (step >= STEPS.length - 1 ? close() : setStep(step + 1));
  const prev = () => step && setStep(step - 1);

  // tip box: below the spotlight when there is room, otherwise above it; kept inside the window
  const tipW = 300, tipH = 170;
  const vw = window.innerWidth, vh = window.innerHeight;
  const below = box ? box.top + box.height + 14 + tipH < vh : true;
  const tipTop = box ? (below ? box.top + box.height + 14 : Math.max(8, box.top - 14 - tipH)) : vh / 2 - tipH / 2;
  const tipLeft = box ? Math.min(vw - tipW - 8, Math.max(8, box.left + box.width / 2 - tipW / 2)) : vw / 2 - tipW / 2;

  return <div className="cal-tour" role="dialog" aria-modal="true" aria-labelledby="cal-tour-title">
    <div className="cal-tour__spot" style={box ?? { left: vw / 2, top: vh / 2, width: 0, height: 0 }} aria-hidden="true" />
    <div className="cal-tour__tip" style={{ top: tipTop, left: tipLeft, width: tipW }}>
      <p className="cal-tour__count">{step + 1} / {STEPS.length}</p>
      <h2 id="cal-tour-title">{STEPS[step].title}</h2>
      <p>{STEPS[step].text}</p>
      <div className="cal-tour__row">
        <button type="button" className="cal-tour__skip" onClick={close}>건너뛰기</button>
        {step > 0 && <button type="button" onClick={prev}>이전</button>}
        <button type="button" className="cal-tour__next" onClick={next} autoFocus>{step === STEPS.length - 1 ? '시작하기' : '다음'}</button>
      </div>
    </div>
  </div>;
}
