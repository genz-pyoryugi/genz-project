'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { freshRun, gradeRun, parseCatalog, Quiz, Run, runQuestions } from './model';
import { getTracker, Tracker } from '@/lib/learning-client';
import { AttemptIdentity } from './persistence';
import { Draft, canResume, draftFor, drafts, hasWork, importLegacy, makeDraft, partKey, writeDraft } from './progress';
import ResumePrompt from './ResumePrompt';
import { queueDraft } from './progress-sync';
import PartLearningFeedback from './PartLearningFeedback';
import QuizCompletion from './QuizCompletion';
import './quiz.css';

const LETTERS = 'ABCDEFGH';
const TOPICS = ['조직 이해&적응', '업무 절차&기준', '질문&소통', '협업&동료 존중', '직장 내 관계&예절', '근무&재택 수칙', '공용 공간 & 비품 관리'];
const ICONS = [
  <g key="people" fill="currentColor" stroke="none"><circle cx="12" cy="5.4" r="3.1"/><circle cx="4.8" cy="8.4" r="2.6"/><circle cx="19.2" cy="8.4" r="2.6"/><path d="M7.7 21v-6.2a4.3 4.3 0 0 1 8.6 0V21zM1 20v-4.2a3.8 3.8 0 0 1 5.7-3.3 6.2 6.2 0 0 0-.8 3.1V20zM18.1 20v-4.4a6.2 6.2 0 0 0-.8-3.1 3.8 3.8 0 0 1 5.7 3.3V20z"/></g>,
  <><path d="M6.5 2h7.8l4.2 4.5V21a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M13.5 2v5h5M8.5 13l2.6 2.6 4.2-4.7"/></>,
  <><path d="M10 10h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2v3l-4-3h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path fill="var(--quiz-tab-bg)" d="M3 4h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></>,
  <><path d="M12 6h3V4a2.3 2.3 0 1 1 4.6 0v2H22v16H12"/><path fill="var(--quiz-tab-bg)" d="M5.5 9H9V7a2.2 2.2 0 1 1 4.4 0v2h3.1v4.3h-1.8a2.2 2.2 0 1 0 0 4.4h1.8V22H5.5v-4H4a2.2 2.2 0 1 1 0-4.4h1.5z"/></>,
  <><path d="M4.5 21.5h5v-6.3c0-1.5.8-2.5 2.1-3.3l2.5-1.6a2.5 2.5 0 0 0-2.6-4.3L9 7.5c-3 1.9-4.5 4.1-4.5 7.7z"/><circle cx="17.6" cy="3.8" r="2.9"/></>,
  <><rect x="3" y="4.5" width="18" height="17.5" rx="1.5"/><path d="M3 9.5h18M7.5 1.5v6M16.5 1.5v6M7.5 15l3 3 5.5-5.5"/></>,
  <><path d="M12 22V12M12 15C5.5 15 2 11.2 2 5c6.1 0 10 3.8 10 10zM12 12C12 5.5 15.8 2 22 2c0 6.1-3.8 10-10 10z"/><path d="M5 8l7 7M12 12l7-7" strokeWidth="1.2"/></>,
];
// ---- links to the rest of the site (frontend branch) ----
// ?topic=0~6 (card news '퀴즈 풀러 가기', office tour) opens that topic's tab first.
const readTopicParam = () => {
  const n = Number(new URLSearchParams(window.location.search).get('topic'));
  return new URLSearchParams(window.location.search).has('topic') && Number.isInteger(n) && n >= 0 ? n : null;
};
// AI 팀장 simulation: missed concepts per topic → '추천' (localStorage 'genz_quiz_weak'), and when each topic was finished
// (localStorage 'genz_quiz_done' — the simulation stores it to compare 카드뉴스 → 퀴즈 → AI 팀장 with going straight in).
// Topic 01 questions map to the simulation's concept keys (src/lib/simulation/scenarios.ts quizConcepts); other topics as a whole.
const CONCEPT_BY_KEY: Record<string, string> = {
  'quizzes-22': 'org-start', 'quizzes-23': 'org-process', 'quizzes-24': 'org-process', 'quizzes-25': 'org-process',
  'quizzes-26': 'org-start', 'quizzes-27': 'org-people', 'quizzes-28': 'org-manner',
};
function saveQuizResult(topicName: string, wrongKeys: string[]) {
  try {
    const key = topicName.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const weak = JSON.parse(localStorage.getItem('genz_quiz_weak') || '{}');
    weak[topicName] = [...new Set(wrongKeys.map(k => CONCEPT_BY_KEY[k] || `topic:${key}`))];
    localStorage.setItem('genz_quiz_weak', JSON.stringify(weak));
    const done = JSON.parse(localStorage.getItem('genz_quiz_done') || '{}');
    done[topicName] = new Date().toISOString();
    localStorage.setItem('genz_quiz_done', JSON.stringify(done));
  } catch {}
}
// Some multi-choice explanations in the DB start with '정답은 option1, option3, option4입니다.' (internal option ids) — dropped,
// the answer letters are already shown above the explanation.
const cleanExplanation = (text?: string | null) => (text ?? '').trim().replace(/^정답은\s*option[\w\s,·]*입니다\.?\s*/, '');
const briefExplanation = (text: string) => {
  const firstSentence = text.trim().split(/(?<=[.!?。])\s+|\n/)[0];
  if (firstSentence.length <= 90) return firstSentence;
  const excerpt = firstSentence.slice(0, 90);
  const boundary = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, boundary > 45 ? boundary : 90)}…`;
};

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const tracker = useRef<Tracker | null>(null);
  const attemptRef = useRef<AttemptIdentity | null>(null);
  const [feedbackAttemptId, setFeedbackAttemptId] = useState<string | null>(null);
  const grading = useRef(false);
  const owner = useRef('');
  const [recordsReady, setRecordsReady] = useState(false);
  const opened = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState(0);
  const [run, setRun] = useState<Run>(() => freshRun());
  const [resume, setResume] = useState<{ draft: Draft; compatible: boolean } | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const applyDraft = useCallback((draft: Draft) => {
    attemptRef.current = draft.attempt; setFeedbackAttemptId(draft.attempt.id);
    grading.current = draft.run.graded; setRun(draft.run); setResume(null);
    if (tracker.current && owner.current) queueDraft(tracker.current, owner.current, draft);
  }, []);
  const offerPart = useCallback((selected: Quiz, index: number) => {
    const draft = draftFor(localStorage, owner.current, selected) || draftFor(sessionStorage, owner.current, selected);
    setTopic(index); grading.current = false;
    attemptRef.current = null; setFeedbackAttemptId(null); setRun(freshRun());
    if (draft && (!canResume(draft, selected) || hasWork(draft))) {
      setResume({ draft, compatible: canResume(draft, selected) });
    } else {
      setResume(null);
      if (draft && canResume(draft, selected)) applyDraft(draft);
    }
    content.current?.scrollTo({ top: 0 });
  }, [applyDraft]);
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
    getTracker()
      .then(async t => {
        tracker.current = t;
        const value = parseCatalog(await t.catalog());
        let identity;
        try { identity = await t.identity(); }
        catch (error) {
          const cached = t.cachedOwner();
          const networkError = !navigator.onLine || (error as { name?: string })?.name === 'AuthRetryableFetchError' || error instanceof TypeError;
          if (!cached || !networkError) throw error;
          identity = { id: cached };
        }
        let supportsHistory = localStorage.getItem('genz.quiz.history-ready.v1') === 'true';
        if (navigator.onLine) {
          try { supportsHistory = await t.supportsHistory(); localStorage.setItem('genz.quiz.history-ready.v1', String(supportsHistory)); }
          catch { /* Keep the previously verified capability while offline. */ }
        }
        if (controller.signal.aborted) return;
        owner.current = identity.id;
        importLegacy(localStorage, sessionStorage, identity.id, value, () => t.newId(), t.currentVisitId());
        if (navigator.onLine) {
          try {
            const remote = await t.progress();
            if (Array.isArray(remote)) for (const raw of remote) {
              const draft = raw as Draft;
              if (!draft?.attempt?.id || !draft.quizKey || !draft.run || !Number.isFinite(Date.parse(draft.changedAt))) continue;
              const book = drafts(localStorage, identity.id);
              const local = book.parts[draft.quizKey] || Object.values(book.parts).find(d => d.quizId === draft.quizId);
              if (!book.archived[draft.attempt.id] && !t.pendingAttempt(local?.attempt.id || draft.attempt.id) &&
                (!local || Date.parse(draft.changedAt) > Date.parse(local.changedAt))) {
                writeDraft(localStorage, identity.id, draft); writeDraft(sessionStorage, identity.id, draft);
              }
            }
          } catch { /* Local drafts remain usable; the durable queue retries cloud writes. */ }
        }
        if (controller.signal.aborted) return;
        setRecordsReady(supportsHistory);
        setQuizzes(value); setStatus('ready');
        const last = drafts(localStorage, identity.id).last || drafts(sessionStorage, identity.id).last;
        const wanted = readTopicParam();
        const index = wanted !== null && wanted < value.length ? wanted : Math.max(0, value.findIndex(q => partKey(q) === last || q.title === last || q.id === last));
        if (value[index]) offerPart(value[index], index);
        if (!opened.current) { opened.current = true; t.record('quiz_opened'); }
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => { controller.abort(); };
  }, [attempt, offerPart]);
  const quiz = quizzes[topic] as Quiz | undefined;
  const questions = useMemo(() => runQuestions(quiz?.questions ?? [], run), [quiz, run]);
  const reviewing = run.reviewIds !== null;
  const topics = quizzes.map((item, index) => TOPICS[index] ?? item.title);
  const question = questions[run.index];
  const explanation = cleanExplanation(question?.explanation) || '등록된 해설이 없습니다.';
  const shortExplanation = briefExplanation(explanation);
  // For multiple answers, show one result immediately after the last selected option.
  const feedbackAfter = Math.max(-1, ...run.picked);
  const finished = !resume && status === 'ready' && questions.length > 0 && run.index >= questions.length;
  const multi = question?.kind === 'multi_choice';
  const rightIds = question ? (multi ? question.correctOptions ?? [] : [question.correctOption ?? '']) : [];
  const answerIdx = question ? question.options.flatMap((option, index) => rightIds.includes(option.id) ? [index] : []) : [];
  const isRight = (picked: number[]) => picked.length === answerIdx.length && answerIdx.every(index => picked.includes(index));
  const correct = !!question && run.graded && isRight(run.picked);
  const progress = questions.length ? Math.round((finished ? questions.length : run.index + (run.graded ? 1 : 0)) / questions.length * 100) : 0;
  function commitRun(nextRun: Run) {
    const t = tracker.current;
    if (!quiz || !t || !owner.current) return;
    const identity = attemptRef.current || { id: t.newId(), quizId: quiz.id, visitId: t.currentVisitId() };
    attemptRef.current = identity; setFeedbackAttemptId(identity.id);
    const draft = makeDraft(quiz, nextRun, identity);
    writeDraft(localStorage, owner.current, draft);
    writeDraft(sessionStorage, owner.current, draft);
    queueDraft(t, owner.current, draft);
    setRun(nextRun);
  }
  function abandonDraft(draft: Draft) {
    if (!draft.attempt?.id) return;
    const abandoned: Draft = { ...draft, state: 'abandoned', changedAt: new Date().toISOString() };
    writeDraft(localStorage, owner.current, abandoned); writeDraft(sessionStorage, owner.current, abandoned);
    const t = tracker.current;
    const fields = { attemptId: draft.attempt.id, attemptVisitId: draft.attempt.visitId, progressOwner: owner.current };
    t?.record('quiz_started', { ...fields, quizVersionId: draft.quizId, mode: draft.run.reviewIds ? 'review' : 'full',
      ...(draft.run.sourceAttemptId ? { sourceAttemptId: draft.run.sourceAttemptId } : {}) });
    t?.record('quiz_abandoned', { ...fields, snapshot: abandoned });
  }
  const selectTopic = (index: number) => {
    if (index !== topic && quizzes[index]) offerPart(quizzes[index], index);
  };
  const startFresh = () => {
    if (resume) abandonDraft(resume.draft);
    attemptRef.current = null; grading.current = false; setResume(null); commitRun(freshRun());
  };
  const restart = (reviewIds: string[] | null = null) => {
    const sourceId = attemptRef.current?.id ?? null;
    attemptRef.current = null; grading.current = false; setResume(null);
    commitRun(freshRun(reviewIds, reviewIds ? sourceId : null));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const chooseAnswer = (index: number) => {
    if (run.graded || grading.current || resume) return;
    commitRun({ ...run, picked: multi ? (run.picked.includes(index) ? run.picked.filter(item => item !== index) : [...run.picked, index]) : [index] });
  };
  const grade = () => {
    if (!question || !quiz || !run.picked.length || run.graded || grading.current || resume) return;
    grading.current = true;
    const selected = run.picked.map(index => question.options[index].id);
    const graded = gradeRun(run, question.id, isRight(run.picked), selected);
    commitRun(graded);
  };
  const next = () => {
    if (!run.graded || resume) return;
    grading.current = false;
    commitRun({ ...run, index: run.index + 1, picked: [], graded: false });
    content.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });
  };
  useEffect(() => {
    if (!finished || !quiz) return;
    saveQuizResult(quiz.title, questions.filter(q => run.wrongIds.includes(q.id)).map(q => q.questionKey));
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status !== 'ready' || !quiz) return;
    const reopen = () => offerPart(quiz, topic);
    const message = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === window.parent && event.data?.type === 'genz-quiz:opened') reopen();
    };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) reopen(); };
    window.addEventListener('message', message); window.addEventListener('pageshow', pageShow);
    return () => { window.removeEventListener('message', message); window.removeEventListener('pageshow', pageShow); };
  }, [status, quiz, topic, offerPart]);
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
      <nav className="gq-tabs" role="tablist" aria-label="퀴즈 주제">{topics.map((name, index) => <button key={quizzes[index].id} id={`quiz-tab-${index}`} role="tab" aria-selected={topic === index} aria-controls="quiz-panel" aria-label={name} title={name} tabIndex={topic === index ? 0 : -1} onClick={() => selectTopic(index)} onKeyDown={event => tabKeys(event, index)}><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[index % ICONS.length]}</svg><span>{name}</span></button>)}</nav>
      <div ref={content} id="quiz-panel" className={`gq-panel${finished ? ' gq-panel--finished' : ''}`} role="tabpanel" aria-labelledby={`quiz-tab-${topic}`} aria-busy={status === 'loading'}>
        {status === 'loading' && <div className="gq-state" role="status"><span className="gq-loader" aria-hidden="true"/><h2>퀴즈를 가져오고 있어요</h2><p>잠시만 기다려 주세요.</p></div>}
        {status === 'error' && <div className="gq-state" role="alert"><span className="gq-state-icon" aria-hidden="true">☁</span><h2>퀴즈에 연결하지 못했어요</h2><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button className="gq-primary" onClick={() => { setStatus('loading'); setRun(freshRun()); setAttempt(attempt + 1); }}>다시 불러오기 ↻</button></div>}
        {status === 'ready' && !questions.length && <div className="gq-state" role="status"><span className="gq-state-icon" aria-hidden="true">✎</span><h2>아직 준비된 문제가 없어요</h2><p>다른 주제의 퀴즈를 먼저 풀어볼까요?</p></div>}
        {status === 'ready' && !resume && question && <>
          <div className="gq-mission" role="progressbar" aria-label="문제 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <p>MISSION <b>{mission}</b> <span>/ {String(questions.length).padStart(2, '0')}</span></p>
            <div className="gq-segments" aria-hidden="true">{questions.map((q, index) => <span key={q.id} className={index < run.index || (index === run.index && run.graded) ? 'done' : index === run.index ? 'current' : ''}/>)}</div>
          </div>
          <div className="gq-body">
            <h2 ref={heading} tabIndex={-1} className="gq-question" key={question.id}><span className="gq-qno">Q.{mission}</span><span className="gq-question-text">{question.question}</span></h2>
            <aside className={`gq-pen ${correct ? 'pen-happy' : ''}`} aria-label="펜 캐릭터의 응원"><p className="gq-speech" aria-live="polite"><svg className="gq-speech-outline" viewBox="0 0 124 104" preserveAspectRatio="none" aria-hidden="true"><path d="M42 83C23 79 10 67 10 52C10 28 34 10 63 10C92 10 112 24 112 47C112 71 89 86 62 86L38 99L42 83Z" vectorEffect="non-scaling-stroke"/></svg><span>{encouragement}</span></p><Image src="/quiz/assets/pen-sky.png" width={1024} height={1536} sizes="(max-width: 600px) 84px, 150px" alt="흰 장갑과 주황색 운동화를 신은 하늘색 펜 캐릭터" priority/></aside>
            <div className="gq-main">
              {question.hint && !run.graded && <details className="gq-hint"><summary>힌트 보기</summary><p>{question.hint}</p></details>}
              <fieldset className="gq-options"><legend className="quiz-sr-only">{multi ? '정답을 모두 선택하세요' : '답을 선택하세요'}</legend>{multi && <p className="gq-multi-note">정답을 모두 골라주세요 (복수 선택)</p>}{question.options.map((option, index) => <Fragment key={option.id}><label className={`gq-option ${run.picked.includes(index) ? 'selected' : ''} ${run.graded && answerIdx.includes(index) ? 'correct-option' : ''} ${run.graded && run.picked.includes(index) && !answerIdx.includes(index) ? 'wrong-option' : ''}`}><input type={multi ? 'checkbox' : 'radio'} name={`answer-${question.id}`} value={index} checked={run.picked.includes(index)} disabled={run.graded} onChange={() => chooseAnswer(index)}/><span className="gq-letter" aria-hidden="true">{LETTERS[index]}</span><span className="gq-option-text">{option.text}</span><span className="gq-check" aria-hidden="true">{run.graded && answerIdx.includes(index) ? '✓' : run.picked.includes(index) ? '✓' : ''}</span></label>
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
        {status === 'ready' && resume && <ResumePrompt compatible={resume.compatible} onContinue={() => applyDraft(resume.draft)} onRestart={startFresh}/>}
        {finished && <QuizCompletion score={run.score} total={questions.length} wrongIds={run.wrongIds} reviewing={reviewing} onRetry={restart} headingRef={heading} topicName={quiz?.title ?? ''}/>}
        {finished && quiz && <PartLearningFeedback key={`${quiz.id}-${feedbackAttemptId ?? 'practice'}`} quiz={quiz} questions={questions} answers={run.answers} mode={reviewing ? 'review' : 'full'} attemptId={feedbackAttemptId} recordsReady={recordsReady}/>}
      </div>

    </section>
  </main>;
}
