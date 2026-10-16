'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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

type Run = { index: number; picked: number[]; graded: boolean; score: number };
const freshRun = (): Run => ({ index: 0, picked: [], graded: false, score: 0 });

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
    requestAnimationFrame(() => { feedback.current?.focus(); feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
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
  const encouragement = finished ? '작은 도전이 실력이 돼요!' : run.graded ? correct ? '정답이에요! 잘하고 있어요!' : '괜찮아요, 틀려도 배울 수 있어요!' : '차근차근, 나의 답을 골라봐요!';
  return <main className="quiz-scene" lang="ko">
    <div className="quiz-office-shade" aria-hidden="true"/>
    <section className="quiz-paper" aria-labelledby="quiz-title">
      <Link className="quiz-close" href="/" aria-label="시작 화면으로 돌아가기" onClick={event => {
        if (window.parent !== window) { event.preventDefault(); window.parent.postMessage({ type: 'genz-sos:close' }, location.origin); }
      }}>×</Link>
      <header className="quiz-title-row"><h1 id="quiz-title">회사 생활, 나라면?<span aria-hidden="true">✦</span></h1>{quiz?.isTest && <p className="quiz-test-badge">테스트용 임시 문제입니다 · 실제 문제로 교체될 예정이에요</p>}</header>
      <nav className="quiz-topic-tabs" role="tablist" aria-label="퀴즈 주제">{topics.map((name, index) => <button key={quizzes[index].id} id={`quiz-tab-${index}`} role="tab" aria-selected={topic === index} aria-controls="quiz-panel" tabIndex={topic === index ? 0 : -1} onClick={() => selectTopic(index)} onKeyDown={event => tabKeys(event, index)}><b>{String(index + 1).padStart(2, '0')}</b> {name}</button>)}</nav>
      <div ref={content} id="quiz-panel" className="quiz-content" role="tabpanel" aria-labelledby={`quiz-tab-${topic}`} aria-busy={status === 'loading'}>
        {status === 'loading' && <div className="quiz-state" role="status"><span className="quiz-loader" aria-hidden="true"/><h2>퀴즈를 가져오고 있어요</h2><p>잠시만 기다려 주세요.</p></div>}
        {status === 'error' && <div className="quiz-state" role="alert"><span aria-hidden="true">☁</span><h2>퀴즈에 연결하지 못했어요</h2><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button className="quiz-primary" onClick={() => { setStatus('loading'); setRun(freshRun()); setAttempt(attempt + 1); }}>다시 불러오기 ↻</button></div>}
        {status === 'ready' && !questions.length && <div className="quiz-state" role="status"><span aria-hidden="true">✎</span><h2>아직 준비된 문제가 없어요</h2><p>다른 주제의 퀴즈를 먼저 풀어볼까요?</p></div>}
        {status === 'ready' && question && <>
          <div className="quiz-question-top"><div className="quiz-question-copy"><div className="quiz-progress" role="progressbar" aria-label="문제 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="quiz-progress-dots" aria-hidden="true">{questions.map((q, index) => <span key={q.id} className={index < run.index ? 'done' : index === run.index ? 'current' : ''}/>)}</div><p>Q{run.index + 1} <span>/ {questions.length}</span></p></div><h2 ref={heading} tabIndex={-1} className="quiz-question" key={question.id}>{question.question}</h2></div><Image className="quiz-vignette" src="/quiz/assets/office-conversation.png" width={400} height={235} alt="" unoptimized/></div>
          {question.hint && !run.graded && <details className="quiz-hint"><summary>힌트 보기</summary><p>{question.hint}</p></details>}
          <fieldset className="quiz-options"><legend className="quiz-sr-only">{multi ? '정답을 모두 선택하세요' : '답을 선택하세요'}</legend>{multi && <p className="quiz-multi-note">정답을 모두 골라주세요 (복수 선택)</p>}{question.options.map((option, index) => <label key={option.id} className={`quiz-option ${run.picked.includes(index) ? 'selected' : ''} ${run.graded && answerIdx.includes(index) ? 'correct-option' : ''} ${run.graded && run.picked.includes(index) && !answerIdx.includes(index) ? 'wrong-option' : ''}`}><input type={multi ? 'checkbox' : 'radio'} name={`answer-${question.id}`} value={index} checked={run.picked.includes(index)} disabled={run.graded} onChange={() => setRun(previous => ({ ...previous, picked: multi ? (previous.picked.includes(index) ? previous.picked.filter(item => item !== index) : [...previous.picked, index]) : [index] }))}/><span className="quiz-option-letter" aria-hidden="true">{LETTERS[index]}</span><span className="quiz-option-text">{option.text}</span><span className="quiz-option-check" aria-hidden="true">{run.graded && answerIdx.includes(index) ? '✓' : run.picked.includes(index) ? '✓' : ''}</span></label>)}</fieldset>
          {run.graded && <div ref={feedback} className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`} role="status" tabIndex={-1}><h3>{correct ? '정답이에요!' : '틀려도 배울 수 있어요!'} <span>정답 {answerIdx.map(index => LETTERS[index]).join(', ')}</span></h3><p>{question.explanation || '등록된 해설이 없습니다.'}</p>{question.feedback && <ul className="quiz-feedback-list">{run.picked.slice().sort((a, b) => a - b).flatMap(index => question.feedback?.[question.options[index].id] ? [<li key={index}><b>{LETTERS[index]}</b> {question.feedback[question.options[index].id]}</li>] : [])}</ul>}</div>}
        </>}
        {finished && <div className="quiz-result"><span className="quiz-result-stars" aria-hidden="true">✦ ★ ✦</span><h2 ref={heading} tabIndex={-1}>이번 주제, 도전 완료!</h2><p className="quiz-result-score"><strong>{run.score}</strong> / {questions.length}</p><p>{run.score === questions.length ? '모두 맞혔어요! 오늘의 자신감을 챙겨가요.' : '해설과 함께 한 걸음 더 배웠어요.'}</p><button className="quiz-primary" onClick={restart}>다시 풀기 <span aria-hidden="true">↻</span></button><p className="quiz-result-note">{save?.state === 'saved' ? '결과가 저장됐어요.' : save?.state === 'unconfigured' ? '테스트 미리보기: 결과는 이 기기에만 보관돼요.' : '결과는 자동으로 저장돼요.'}</p></div>}
      </div>
      {save?.state === 'error' && <p className="quiz-save-note" role="status">{save.message}</p>}
      {status === 'ready' && question && <><div className="quiz-actions">{run.graded ? <button className="quiz-primary" onClick={next}>{run.index === questions.length - 1 ? '결과 보기' : '다음 문제'} <span aria-hidden="true">→</span></button> : <button className="quiz-primary" disabled={!run.picked.length} onClick={grade}>정답 확인 <span aria-hidden="true">→</span></button>}<p>{run.graded ? '해설을 읽고 다음 단계로 이어가요.' : '정답을 확인하면 해설이 펼쳐져요.'}</p></div></>}
    </section>
    <aside className={`quiz-pen-side ${correct ? 'pen-happy' : ''}`} aria-label="펜 캐릭터의 응원"><p className="quiz-speech" aria-live="polite">{encouragement}<span aria-hidden="true">✦</span></p><Image className="quiz-pen" src="/quiz/assets/pen-mascot.png" width={240} height={630} alt="응원하는 남색 펜 캐릭터" unoptimized priority/></aside>
  </main>;
}
