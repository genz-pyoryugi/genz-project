'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import { parseCatalog, Quiz } from './model';
import './quiz.css';

type Status = { state: 'saved' | 'pending' | 'error' | 'unconfigured'; message: string };
type Tracker = {
  catalog(): Promise<unknown>; record(type: string, fields?: Record<string, string>): void; newId(): string;
  subscribe(fn: (status: Status) => void): () => void;
};
declare global { interface Window { genzTracker?: Tracker; supabase?: unknown } }
const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  if (document.querySelector(`script[data-lt="${src}"]`)) { resolve(); return; }
  const el = document.createElement('script');
  el.src = src; el.dataset.lt = src; el.onload = () => resolve(); el.onerror = () => reject(new Error(src));
  document.head.appendChild(el);
});
// Same tracker as the office page when this quiz is opened inside it; otherwise its own.
async function getTracker(): Promise<Tracker> {
  try { if (window.parent !== window && window.parent.genzTracker) return window.parent.genzTracker; } catch { /* cross-origin */ }
  if (!window.genzTracker) { await loadScript('/vendor/supabase.js'); await loadScript('/tracking/learning-tracker.js'); }
  if (!window.genzTracker) throw new Error('tracker unavailable');
  return window.genzTracker;
}
const LETTERS = 'ABCDEFGH';
// Short tab names from the design; the full topic title stays as the accessible name.
const SHORT = ['조직 적응', '업무 기본', '소통', '협업', '직장 예절', '자기 관리', '성장'];
// SVG outlines traced to the supplied topic-icon reference; no platform emoji rendering.
const ICONS = [
  <g key="people" fill="currentColor" stroke="none"><circle cx="12" cy="5.4" r="3.1"/><circle cx="4.8" cy="8.4" r="2.6"/><circle cx="19.2" cy="8.4" r="2.6"/><path d="M7.7 21v-6.2a4.3 4.3 0 0 1 8.6 0V21zM1 20v-4.2a3.8 3.8 0 0 1 5.7-3.3 6.2 6.2 0 0 0-.8 3.1V20zM18.1 20v-4.4a6.2 6.2 0 0 0-.8-3.1 3.8 3.8 0 0 1 5.7 3.3V20z"/></g>,
  <><path d="M6.5 2h7.8l4.2 4.5V21a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M13.5 2v5h5M8.5 13l2.6 2.6 4.2-4.7"/></>,
  <><path d="M10 10h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2v3l-4-3h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path fill="var(--quiz-tab-bg)" d="M3 4h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></>,
  <><path d="M12 6h3V4a2.3 2.3 0 1 1 4.6 0v2H22v16H12"/><path fill="var(--quiz-tab-bg)" d="M5.5 9H9V7a2.2 2.2 0 1 1 4.4 0v2h3.1v4.3h-1.8a2.2 2.2 0 1 0 0 4.4h1.8V22H5.5v-4H4a2.2 2.2 0 1 1 0-4.4h1.5z"/></>,
  <><path d="M4.5 21.5h5v-6.3c0-1.5.8-2.5 2.1-3.3l2.5-1.6a2.5 2.5 0 0 0-2.6-4.3L9 7.5c-3 1.9-4.5 4.1-4.5 7.7z"/><circle cx="17.6" cy="3.8" r="2.9"/></>,
  <><rect x="3" y="4.5" width="18" height="17.5" rx="1.5"/><path d="M3 9.5h18M7.5 1.5v6M16.5 1.5v6M7.5 15l3 3 5.5-5.5"/></>,
  <><path d="M12 22V12M12 15C5.5 15 2 11.2 2 5c6.1 0 10 3.8 10 10zM12 12C12 5.5 15.8 2 22 2c0 6.1-3.8 10-10 10z"/><path d="M5 8l7 7M12 12l7-7" strokeWidth="1.2"/></>,
];

type Run = { index: number; picked: number[]; graded: boolean; score: number };
const freshRun = (): Run => ({ index: 0, picked: [], graded: false, score: 0 });
const briefExplanation = (text: string) => {
  const firstSentence = text.trim().split(/(?<=[.!?。])\s+|\n/)[0];
  if (firstSentence.length <= 90) return firstSentence;
  const excerpt = firstSentence.slice(0, 90);
  const boundary = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, boundary > 45 ? boundary : 90)}…`;
};

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [save, setSave] = useState<Status | null>(null);
  const tracker = useRef<Tracker | null>(null);
  const attemptRef = useRef<{ id: string; quizId: string } | null>(null);
  const grading = useRef(false);
  const opened = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState(0);
  const [run, setRun] = useState<Run>(freshRun);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.parent === window || !card.current) return;
    document.documentElement.dataset.quizEmbedded = 'true';
    const element = card.current;
    const resize = () => window.parent.postMessage({ type: 'genz-quiz:resize', height: element.getBoundingClientRect().height }, location.origin);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => { observer.disconnect(); delete document.documentElement.dataset.quizEmbedded; };
  }, []);
  useEffect(() => {
    if (!run.graded) return;
    // Move keyboard focus to the explanation without changing the reader's scroll position.
    feedback.current?.focus({ preventScroll: true });
  }, [run.graded]);
  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe = () => {};
    getTracker()
      .then(async t => {
        tracker.current = t; unsubscribe = t.subscribe(setSave);
        const value = parseCatalog(await t.catalog());
        if (controller.signal.aborted) return;
        setQuizzes(value); setStatus('ready');
        if (!opened.current) { opened.current = true; t.record('quiz_opened'); }
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => { controller.abort(); unsubscribe(); };
  }, [attempt]);
  const quiz = quizzes[topic] as Quiz | undefined;
  const questions = quiz?.questions ?? [];
  const topics = quizzes.map(item => item.title);
  const question = questions[run.index];
  const explanation = question?.explanation?.trim() || '등록된 해설이 없습니다.';
  const shortExplanation = briefExplanation(explanation);
  // For multiple answers, show one result immediately after the last selected option.
  const feedbackAfter = Math.max(-1, ...run.picked);
  const finished = status === 'ready' && questions.length > 0 && run.index >= questions.length;
  const multi = question?.kind === 'multi_choice';
  const rightIds = question ? (multi ? question.correctOptions ?? [] : [question.correctOption ?? '']) : [];
  const answerIdx = question ? question.options.flatMap((option, index) => rightIds.includes(option.id) ? [index] : []) : [];
  const isRight = (picked: number[]) => picked.length === answerIdx.length && answerIdx.every(index => picked.includes(index));
  const correct = !!question && run.graded && isRight(run.picked);
  const progress = questions.length ? Math.round((finished ? questions.length : run.index + (run.graded ? 1 : 0)) / questions.length * 100) : 0;
  const selectTopic = (index: number) => { attemptRef.current = null; grading.current = false; setTopic(index); setRun(freshRun()); content.current?.scrollTo({ top: 0 }); };
  const restart = () => { attemptRef.current = null; grading.current = false; setRun(freshRun()); content.current?.scrollTo({ top: 0 }); requestAnimationFrame(() => heading.current?.focus()); };
  const grade = () => {
    if (!question || !quiz || !run.picked.length || run.graded || grading.current) return;
    grading.current = true;
    const right = isRight(run.picked);
    const selectedOption = run.picked.map(index => question.options[index].id).sort().join(',');
    const t = tracker.current;
    if (t) {
      // The attempt starts at the first submitted answer; a retake always gets a new attempt id.
      if (!attemptRef.current) {
        attemptRef.current = { id: t.newId(), quizId: quiz.id };
        t.record('quiz_started', { attemptId: attemptRef.current.id, quizVersionId: quiz.id });
      }
      const attemptId = attemptRef.current.id;
      t.record('answer_submitted', { attemptId, questionVersionId: question.id, selectedOption });
      if (run.index === questions.length - 1) t.record('quiz_completed', { attemptId });
    }
    setRun(previous => ({ ...previous, graded: true, score: previous.score + (right ? 1 : 0) }));
  };
  const next = () => {
    if (!run.graded) return;
    grading.current = false;
    setRun(previous => previous.graded ? ({ ...previous, index: previous.index + 1, picked: [], graded: false }) : previous);
    content.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus());
  };
  const tabKeys = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = event.key === 'ArrowRight' ? (index + 1) % topics.length : event.key === 'ArrowLeft' ? (index + topics.length - 1) % topics.length : event.key === 'Home' ? 0 : event.key === 'End' ? topics.length - 1 : null;
    if (target !== null) { event.preventDefault(); selectTopic(target); document.getElementById(`quiz-tab-${target}`)?.focus(); }
  };
  const encouragement = finished ? '작은 도전이 실력이 돼요!' : run.graded ? correct ? '정답이에요! 잘하고 있어요!' : '괜찮아요, 틀려도 배울 수 있어요!' : '나의\n선택은?';
  const mission = String(Math.min(run.index + 1, Math.max(questions.length, 1))).padStart(2, '0');
  return <main className="gq-scene" lang="ko">
    <section ref={card} className="gq-card" aria-labelledby="quiz-title">
      <Link className="gq-close" href="/" aria-label="시작 화면으로 돌아가기" onClick={event => {
        if (window.parent !== window) { event.preventDefault(); window.parent.postMessage({ type: 'genz-sos:close' }, location.origin); }
      }}>×</Link>
      <header className="gq-head"><h1 id="quiz-title" className="gq-title">GEN Z QUIZ</h1><p className="gq-sub">회사 생활, 나라면?</p>{quiz?.isTest && <p className="gq-test-badge">테스트용 임시 문제입니다 · 실제 문제로 교체될 예정이에요</p>}</header>
      <nav className="gq-tabs" role="tablist" aria-label="퀴즈 주제" style={{ gridTemplateColumns: `repeat(${Math.max(topics.length, 1)}, minmax(0, 1fr))` }}>{topics.map((name, index) => <button key={quizzes[index].id} id={`quiz-tab-${index}`} role="tab" aria-selected={topic === index} aria-controls="quiz-panel" aria-label={name} title={name} tabIndex={topic === index ? 0 : -1} onClick={() => selectTopic(index)} onKeyDown={event => tabKeys(event, index)}><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[index % ICONS.length]}</svg><span>{SHORT[index] ?? name}</span></button>)}</nav>
      <div ref={content} id="quiz-panel" className="gq-panel" role="tabpanel" aria-labelledby={`quiz-tab-${topic}`} aria-busy={status === 'loading'}>
        {status === 'loading' && <div className="gq-state" role="status"><span className="gq-loader" aria-hidden="true"/><h2>퀴즈를 가져오고 있어요</h2><p>잠시만 기다려 주세요.</p></div>}
        {status === 'error' && <div className="gq-state" role="alert"><span className="gq-state-icon" aria-hidden="true">☁</span><h2>퀴즈에 연결하지 못했어요</h2><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button className="gq-primary" onClick={() => { setStatus('loading'); setRun(freshRun()); setAttempt(attempt + 1); }}>다시 불러오기 ↻</button></div>}
        {status === 'ready' && !questions.length && <div className="gq-state" role="status"><span className="gq-state-icon" aria-hidden="true">✎</span><h2>아직 준비된 문제가 없어요</h2><p>다른 주제의 퀴즈를 먼저 풀어볼까요?</p></div>}
        {status === 'ready' && question && <>
          <div className="gq-mission" role="progressbar" aria-label="문제 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <p>MISSION <b>{mission}</b> <span>/ {String(questions.length).padStart(2, '0')}</span></p>
            <div className="gq-segments" aria-hidden="true">{questions.map((q, index) => <span key={q.id} className={index < run.index || (index === run.index && run.graded) ? 'done' : index === run.index ? 'current' : ''}/>)}</div>
          </div>
          <div className="gq-body">
            <h2 ref={heading} tabIndex={-1} className="gq-question" key={question.id}><span className="gq-qno">Q.{mission}</span><span className="gq-question-text">{question.question}</span></h2>
            <aside className={`gq-pen ${correct ? 'pen-happy' : ''}`} aria-label="펜 캐릭터의 응원"><p className="gq-speech" aria-live="polite"><svg className="gq-speech-outline" viewBox="0 0 124 104" preserveAspectRatio="none" aria-hidden="true"><path d="M42 83C23 79 10 67 10 52C10 28 34 10 63 10C92 10 112 24 112 47C112 71 89 86 62 86L38 99L42 83Z" vectorEffect="non-scaling-stroke"/></svg><span>{encouragement}</span></p><Image src="/quiz/assets/pen-sky.png" width={1024} height={1536} sizes="(max-width: 600px) 84px, 150px" alt="흰 장갑과 주황색 운동화를 신은 하늘색 펜 캐릭터" priority/></aside>
            <div className="gq-main">
              {question.hint && !run.graded && <details className="gq-hint"><summary>힌트 보기</summary><p>{question.hint}</p></details>}
              <fieldset className="gq-options"><legend className="quiz-sr-only">{multi ? '정답을 모두 선택하세요' : '답을 선택하세요'}</legend>{multi && <p className="gq-multi-note">정답을 모두 골라주세요 (복수 선택)</p>}{question.options.map((option, index) => <Fragment key={option.id}><label className={`gq-option ${run.picked.includes(index) ? 'selected' : ''} ${run.graded && answerIdx.includes(index) ? 'correct-option' : ''} ${run.graded && run.picked.includes(index) && !answerIdx.includes(index) ? 'wrong-option' : ''}`}><input type={multi ? 'checkbox' : 'radio'} name={`answer-${question.id}`} value={index} checked={run.picked.includes(index)} disabled={run.graded} onChange={() => setRun(previous => ({ ...previous, picked: multi ? (previous.picked.includes(index) ? previous.picked.filter(item => item !== index) : [...previous.picked, index]) : [index] }))}/><span className="gq-letter" aria-hidden="true">{LETTERS[index]}</span><span className="gq-option-text">{option.text}</span><span className="gq-check" aria-hidden="true">{run.graded && answerIdx.includes(index) ? '✓' : run.picked.includes(index) ? '✓' : ''}</span></label>
              {run.graded && index === feedbackAfter && <div ref={feedback} className={`gq-feedback ${correct ? 'correct' : 'incorrect'}`} role="status" aria-atomic="true" tabIndex={-1}>
                <h3>{correct ? '정답이에요!' : '틀려도 배울 수 있어요!'} <span>정답 {answerIdx.map(index => LETTERS[index]).join(', ')}</span></h3>
                <p>{shortExplanation}</p>
                {(shortExplanation !== explanation || run.picked.some(picked => question.feedback?.[question.options[picked].id])) && <details key={question.id} className="gq-full-explanation"><summary>전체 해설 보기</summary><p>{explanation}</p>
                {question.feedback && <ul>{run.picked.slice().sort((a, b) => a - b).flatMap(index => question.feedback?.[question.options[index].id] ? [<li key={index}><b>{LETTERS[index]}</b> {question.feedback[question.options[index].id]}</li>] : [])}</ul>}
                </details>}
              </div>}
              </Fragment>)}</fieldset>
              <div className="gq-actions">{run.graded ? <button className="gq-primary" onClick={next}>{run.index === questions.length - 1 ? '결과 보기' : '다음 문제'} <span aria-hidden="true">→</span></button> : <button className="gq-primary" disabled={!run.picked.length} onClick={grade}>정답 확인 <span aria-hidden="true">→</span></button>}<p>{run.graded ? '해설을 읽고 다음 단계로 이어가요.' : '답을 고른 뒤 확인해 주세요.'}</p></div>
            </div>
          </div>
        </>}
        {finished && <div className="gq-result"><span className="gq-stars" aria-hidden="true">✦ ★ ✦</span><h2 ref={heading} tabIndex={-1}>이번 주제, 도전 완료!</h2><p className="gq-score"><strong>{run.score}</strong> / {questions.length}</p><p>{run.score === questions.length ? '모두 맞혔어요! 오늘의 자신감을 챙겨가요.' : '해설과 함께 한 걸음 더 배웠어요.'}</p><button className="gq-primary" onClick={restart}>다시 풀기 <span aria-hidden="true">↻</span></button><p className="gq-note">{save?.state === 'saved' ? '결과가 저장됐어요.' : save?.state === 'unconfigured' ? '테스트 미리보기: 결과는 이 기기에만 보관돼요.' : '결과는 자동으로 저장돼요.'}</p></div>}
      </div>
      {save?.state === 'error' && <p className="gq-save-note" role="status">{save.message}</p>}
    </section>
  </main>;
}
