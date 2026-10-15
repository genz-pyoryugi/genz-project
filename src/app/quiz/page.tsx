'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CONCEPTS } from './local';
import { isLocalTopic, parseRows, Question, questionsFor, QuizRow, topics } from './model';
import './quiz.css';

// picked: chosen option indices (one for a normal question, several for a multi-select one)
// wrongIds: questions missed in this pass (used for the one-time retry of the 01 topic)
type Run = { index: number; picked: number[]; graded: boolean; score: number; hint: boolean; wrongIds: Question['id'][] };
const freshRun = (): Run => ({ index: 0, picked: [], graded: false, score: 0, hint: false, wrongIds: [] });
const sameAnswer = (picked: number[], answer: number[]) => picked.length === answer.length && answer.every(i => picked.includes(i));

export default function QuizPage() {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [dbStatus, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState(0);
  const [run, setRun] = useState<Run>(freshRun);
  // 01 topic only: first pass result, then one retry of the missed questions (screen state only, nothing is saved)
  const [firstAttempt, setFirstAttempt] = useState<{ score: number; wrongIds: Question['id'][] } | null>(null);
  const [isRetryMode, setRetryMode] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/quizzes', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Quiz connection failed'); return response.json(); })
      .then(value => { setRows(parseRows(value)); setStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);
  // topics kept in code (local.ts) don't wait for — or fail with — the Supabase request
  const status = isLocalTopic(topics[topic]) ? 'ready' : dbStatus;
  const allQuestions = questionsFor(rows, topics[topic]);
  const withRetry = isLocalTopic(topics[topic]);
  const questions = isRetryMode && firstAttempt ? allQuestions.filter(q => firstAttempt.wrongIds.includes(q.id)) : allQuestions;
  const question = questions[run.index];
  const finished = status === 'ready' && questions.length > 0 && run.index >= questions.length;
  const correct = !!question && run.graded && sameAnswer(run.picked, question.answer);
  const progress = questions.length ? Math.round((finished ? questions.length : run.index + (run.graded ? 1 : 0)) / questions.length * 100) : 0;
  const selectTopic = (index: number) => { setTopic(index); setRun(freshRun()); setFirstAttempt(null); setRetryMode(false); content.current?.scrollTo({ top: 0 }); };
  const startRetry = () => {
    setFirstAttempt({ score: run.score, wrongIds: run.wrongIds });
    setRetryMode(true);
    setRun(freshRun());
    content.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus());
  };
  const restart = () => { setRun(freshRun()); content.current?.scrollTo({ top: 0 }); requestAnimationFrame(() => heading.current?.focus()); };
  const grade = () => {
    if (!question || !run.picked.length || run.graded) return;
    setRun(previous => {
      if (previous.graded) return previous;
      const ok = sameAnswer(previous.picked, question.answer);
      return { ...previous, graded: true, score: previous.score + (ok ? 1 : 0), wrongIds: ok ? previous.wrongIds : [...previous.wrongIds, question.id] };
    });
    requestAnimationFrame(() => { feedback.current?.focus(); feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  };
  const next = () => {
    if (!run.graded) return;
    setRun(previous => previous.graded ? ({ ...previous, index: previous.index + 1, picked: [], graded: false, hint: false }) : previous);
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
      <Link className="quiz-close" href="/" aria-label="시작 화면으로 돌아가기">×</Link>
      <header className="quiz-title-row"><h1 id="quiz-title">회사 생활, 나라면?<span aria-hidden="true">✦</span></h1></header>
      <nav className="quiz-topic-tabs" role="tablist" aria-label="퀴즈 주제">{topics.map((name, index) => <button key={name} id={`quiz-tab-${index}`} role="tab" aria-selected={topic === index} aria-controls="quiz-panel" tabIndex={topic === index ? 0 : -1} onClick={() => selectTopic(index)} onKeyDown={event => tabKeys(event, index)}><b>{String(index + 1).padStart(2, '0')}</b> {name}</button>)}</nav>
      <div ref={content} id="quiz-panel" className="quiz-content" role="tabpanel" aria-labelledby={`quiz-tab-${topic}`} aria-busy={status === 'loading'}>
        {status === 'loading' && <div className="quiz-state" role="status"><span className="quiz-loader" aria-hidden="true"/><h2>퀴즈를 가져오고 있어요</h2><p>잠시만 기다려 주세요.</p></div>}
        {status === 'error' && <div className="quiz-state" role="alert"><span aria-hidden="true">☁</span><h2>퀴즈에 연결하지 못했어요</h2><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button className="quiz-primary" onClick={() => { setStatus('loading'); setRun(freshRun()); setAttempt(attempt + 1); }}>다시 불러오기 ↻</button></div>}
        {status === 'ready' && !questions.length && <div className="quiz-state" role="status"><span aria-hidden="true">✎</span><h2>아직 준비된 문제가 없어요</h2><p>다른 주제의 퀴즈를 먼저 풀어볼까요?</p></div>}
        {status === 'ready' && question && <>
          <div className="quiz-question-top"><div className="quiz-question-copy"><div className="quiz-progress" role="progressbar" aria-label="문제 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="quiz-progress-dots" aria-hidden="true">{questions.map((q, index) => <span key={q.id} className={index < run.index ? 'done' : index === run.index ? 'current' : ''}/>)}</div><p>{isRetryMode && <em className="quiz-retry-tag">다시 도전</em>}Q{run.index + 1} <span>/ {questions.length}</span></p></div><h2 ref={heading} tabIndex={-1} className="quiz-question" key={question.id}>{question.question}</h2>{question.multi && <p className="quiz-multi-note">정답 {question.answer.length}개를 모두 골라야 정답이에요.</p>}{question.hint && <><button type="button" className="quiz-hint-toggle" aria-expanded={run.hint} aria-controls="quiz-hint" onClick={() => setRun(previous => ({ ...previous, hint: !previous.hint }))}><span aria-hidden="true">💡</span> {run.hint ? '힌트 닫기' : '힌트 보기'}</button>{run.hint && <p id="quiz-hint" className="quiz-hint">{question.hint}</p>}</>}</div><Image className="quiz-vignette" src="/quiz/assets/office-conversation.png" width={400} height={235} alt="" unoptimized/></div>
          <fieldset className="quiz-options"><legend className="quiz-sr-only">{question.multi ? '답을 모두 선택하세요' : '답을 선택하세요'}</legend>{question.options.map((option, index) => <label key={option.originalIndex} className={`quiz-option ${run.picked.includes(index) ? 'selected' : ''} ${run.graded && question.answer.includes(index) ? 'correct-option' : ''} ${run.graded && run.picked.includes(index) && !question.answer.includes(index) ? 'wrong-option' : ''}`}><input type={question.multi ? 'checkbox' : 'radio'} name={`answer-${question.id}`} value={index} checked={run.picked.includes(index)} disabled={run.graded} onChange={() => setRun(previous => ({ ...previous, picked: question.multi ? (previous.picked.includes(index) ? previous.picked.filter(i => i !== index) : [...previous.picked, index]) : [index] }))}/><span className="quiz-option-letter" aria-hidden="true">{'ABCDE'[index]}</span><span className="quiz-option-text">{option.text}{run.graded && question.multi && question.answer.includes(index) && !run.picked.includes(index) && <span className="quiz-option-missed">놓친 정답</span>}{run.graded && option.reason && (run.picked.includes(index) || question.answer.includes(index)) && <span className="quiz-option-reason">{option.reason}</span>}</span><span className="quiz-option-check" aria-hidden="true">{run.graded && question.answer.includes(index) ? '✓' : run.picked.includes(index) ? '✓' : ''}</span></label>)}</fieldset>
          {run.graded && <div ref={feedback} className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`} role="status" tabIndex={-1}><h3>{correct ? '정답이에요!' : '틀려도 배울 수 있어요!'} <span>정답 {question.answer.map(i => 'ABCDE'[i]).sort().join(' · ')}</span></h3><p>{question.explanation || '등록된 해설이 없습니다.'}</p></div>}
        </>}
        {finished && withRetry && <RetryResult questions={allQuestions} run={run} firstAttempt={firstAttempt} isRetryMode={isRetryMode} onRetry={startRetry} heading={heading}/>}
        {finished && !withRetry && <div className="quiz-result"><span className="quiz-result-stars" aria-hidden="true">✦ ★ ✦</span><h2 ref={heading} tabIndex={-1}>이번 주제, 도전 완료!</h2><p className="quiz-result-score"><strong>{run.score}</strong> / {questions.length}</p><p>{run.score === questions.length ? '모두 맞혔어요! 오늘의 자신감을 챙겨가요.' : '해설과 함께 한 걸음 더 배웠어요.'}</p><button className="quiz-primary" onClick={restart}>다시 풀기 <span aria-hidden="true">↻</span></button><p className="quiz-result-note">결과는 이 화면에만 표시돼요.</p></div>}
      </div>
      {status === 'ready' && question && <><div className="quiz-actions">{run.graded ? <button className="quiz-primary" onClick={next}>{run.index === questions.length - 1 ? '결과 보기' : '다음 문제'} <span aria-hidden="true">→</span></button> : <button className="quiz-primary" disabled={!run.picked.length} onClick={grade}>정답 확인 <span aria-hidden="true">→</span></button>}<p>{run.graded ? '해설을 읽고 다음 단계로 이어가요.' : '정답을 확인하면 해설이 펼쳐져요.'}</p></div></>}
    </section>
    <aside className={`quiz-pen-side ${correct ? 'pen-happy' : ''}`} aria-label="펜 캐릭터의 응원"><p className="quiz-speech" aria-live="polite">{encouragement}<span aria-hidden="true">✦</span></p><Image className="quiz-pen" src="/quiz/assets/pen-mascot.png" width={240} height={630} alt="응원하는 남색 펜 캐릭터" unoptimized priority/></aside>
  </main>;
}

// ---- 01 topic result screens: first result → (one retry of the missed questions) → before / after comparison ----
// AI 팀장 · 카드뉴스: the same pages the office opens from the monitor / file folder (public/intro/index.html).
// Inside the office popup the office opens them (genz-office:open, public/intro/js/office.js); on its own the links just go there.
const LINKS = {
  sim: { object: 'monitor', href: '/web/sos.html?view=sim' },
  cardnews: { object: 'files', href: '/web/cardnews.html' },
};
function openLink(event: React.MouseEvent<HTMLAnchorElement>, target: { object: string }) {
  if (window.parent === window) return;
  event.preventDefault();
  window.parent.postMessage({ type: 'genz-office:open', object: target.object }, location.origin);
}
const finalMessage = (score: number) =>
  score >= 9 ? ['조직이해 핵심 내용을 잘 이해하고 있어요!', '이제 실제 상황에서도 어떻게 적용할지 연습해볼까요?']
  : score >= 7 ? ['핵심 내용은 잘 이해했어요.', '헷갈렸던 개념만 한 번 더 기억해두면 좋아요.']
  : score >= 5 ? ['조금씩 방향을 잡고 있어요.', '틀린 문제의 설명을 다시 확인해보세요.']
  : ['아직 낯선 개념이 조금 있어요.', '카드뉴스를 다시 확인하거나 SOS Chat에서 궁금한 내용을 물어볼 수 있어요.'];
// two lines under the first-attempt score
const firstMessage = (score: number) =>
  score >= 9 ? ['조직이 어떻게 움직이는지 잘 이해하고 있어요.', '헷갈린 부분만 한 번 더 확인하면 충분해요.']
  : score >= 7 ? ['핵심 개념은 잘 잡았어요.', '몇 가지 헷갈린 부분만 다시 확인해볼까요?']
  : score >= 5 ? ['기본 개념은 이해하기 시작했어요.', '틀린 문제의 설명을 다시 보면 흐름이 더 선명해질 거예요.']
  : ['아직 낯선 개념이 조금 있어요.', '카드뉴스를 다시 보거나 SOS Chat에서 궁금한 부분을 물어보세요.'];

// concepts (question.concept, keys of CONCEPTS in local.ts) of the given questions, in question order, without repeats.
// A concept with any missed question is listed only under '한 번 더 확인해보세요'.
function conceptSplit(questions: Question[], wrongIds: Question['id'][]) {
  const pick = (list: Question[]) => [...new Set(list.map(q => q.concept).filter((c): c is string => !!c))];
  const review = pick(questions.filter(q => wrongIds.includes(q.id)));
  const good = pick(questions.filter(q => !wrongIds.includes(q.id))).filter(c => !review.includes(c));
  return { good, review };
}
function ConceptList({ good, review }: { good: string[]; review: string[] }) {
  const known = (list: string[]) => list.filter(c => c in CONCEPTS);
  return <div className="quiz-concepts">
    {known(good).length > 0 && <div className="quiz-concept quiz-concept--good"><h3>이 부분은 잘 이해했어요</h3>
      {known(good).map(c => <p key={c}>{CONCEPTS[c].good}</p>)}</div>}
    {known(review).length > 0 && <div className="quiz-concept quiz-concept--review"><h3>이 부분만 한 번 더 확인해보세요</h3>
      {known(review).map(c => <p key={c}>{CONCEPTS[c].review}</p>)}</div>}
  </div>;
}

function RetryResult({ questions, run, firstAttempt, isRetryMode, onRetry, heading }: {
  questions: Question[]; run: Run; firstAttempt: { score: number; wrongIds: Question['id'][] } | null; isRetryMode: boolean;
  onRetry: () => void; heading: React.RefObject<HTMLHeadingElement | null>;
}) {
  const total = questions.length;
  const simCta = <a className="quiz-primary quiz-cta" href={LINKS.sim.href} onClick={e => openLink(e, LINKS.sim)}>AI 팀장으로 연습해보기 <span aria-hidden="true">→</span></a>;
  // first pass finished
  if (!isRetryMode || !firstAttempt) {
    const firstAttemptScore = run.score;
    const { good, review } = conceptSplit(questions, run.wrongIds);
    if (firstAttemptScore === total) return <div className="quiz-result">
      <span className="quiz-result-stars" aria-hidden="true">✦ ★ ✦</span>
      <p className="quiz-result-score"><strong>{firstAttemptScore}</strong> / {total}</p>
      <h2 ref={heading} tabIndex={-1}>한 번에 모두 맞혔어요!</h2>
      <p>조직의 기본 구조와<br/>신입사원이 조직에 적응할 때 확인해야 할 핵심 내용을<br/>잘 이해하고 있어요.</p>
      <ConceptList good={good} review={review}/>
      {simCta}
    </div>;
    return <div className="quiz-result">
      <h2 ref={heading} tabIndex={-1}>조직이해 퀴즈 완료!</h2>
      <p className="quiz-result-score"><strong>{firstAttemptScore}</strong> / {total}</p>
      <p className="quiz-result-message"><strong>{firstMessage(firstAttemptScore)[0]}</strong><br/>{firstMessage(firstAttemptScore)[1]}</p>
      <ConceptList good={good} review={review}/>
      <button className="quiz-primary" onClick={onRetry}>틀린 문제 다시 풀기 <span aria-hidden="true">→</span></button>
      <div className="quiz-practice">
        <p className="quiz-result-label">실전 연습해보기</p>
        <a className="quiz-secondary-button" href={LINKS.sim.href} onClick={e => openLink(e, LINKS.sim)}>AI 팀장 시뮬레이션 <span aria-hidden="true">→</span></a>
      </div>
    </div>;
  }
  // retry finished (only once): compare the first pass with the result after the retry, out of all questions.
  // run.wrongIds now holds the questions missed again in the retry.
  const retryCorrectCount = run.score;
  const finalScore = firstAttempt.score + retryCorrectCount;
  const missed = firstAttempt.wrongIds.length;
  const [line1, line2] = finalMessage(finalScore);
  const { good, review } = conceptSplit(questions, run.wrongIds);
  return <div className="quiz-result">
    <h2 ref={heading} tabIndex={-1}>다시 확인하니 이렇게 달라졌어요</h2>
    <div className="quiz-compare" role="img" aria-label={`첫 도전 ${firstAttempt.score} / ${total}, 다시 도전 ${finalScore} / ${total}`}>
      <p className="quiz-compare-row"><span>첫 도전</span><b>{firstAttempt.score}</b> / {total}</p>
      <span className="quiz-compare-arrow" aria-hidden="true">↓</span>
      <p className="quiz-compare-row quiz-compare-final"><span>다시 도전</span><b>{finalScore}</b> / {total}</p>
      {retryCorrectCount > 0 && <p className="quiz-compare-gain">+{retryCorrectCount} 문제 개선</p>}
    </div>
    <p>{retryCorrectCount > 0 ? `놓쳤던 ${missed}개 개념 중 ${retryCorrectCount}개를 다시 이해했어요.` : `놓쳤던 ${missed}개 개념을 다시 살펴봤어요.`}</p>
    <p className="quiz-result-message"><strong>{line1}</strong><br/>{line2}</p>
    <ConceptList good={good} review={review}/>
    {simCta}
    <a className="quiz-secondary" href={LINKS.cardnews.href} onClick={e => openLink(e, LINKS.cardnews)}>카드뉴스 다시 보기</a>
  </div>;
}
