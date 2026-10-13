'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { parseRows, questionsFor, QuizRow, topics } from './model';
import './quiz.css';

type Run = { index: number; picked: number | null; graded: boolean; score: number };
const freshRun = (): Run => ({ index: 0, picked: null, graded: false, score: 0 });

export default function QuizPage() {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState(0);
  const [run, setRun] = useState<Run>(freshRun);
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
  const questions = questionsFor(rows, topics[topic]);
  const question = questions[run.index];
  const finished = status === 'ready' && questions.length > 0 && run.index >= questions.length;
  const correct = !!question && run.graded && run.picked === question.answer;
  const progress = questions.length ? Math.round((finished ? questions.length : run.index + (run.graded ? 1 : 0)) / questions.length * 100) : 0;
  const selectTopic = (index: number) => { setTopic(index); setRun(freshRun()); content.current?.scrollTo({ top: 0 }); };
  const restart = () => { setRun(freshRun()); content.current?.scrollTo({ top: 0 }); requestAnimationFrame(() => heading.current?.focus()); };
  const grade = () => {
    if (!question || run.picked === null || run.graded) return;
    setRun(previous => previous.graded ? previous : { ...previous, graded: true, score: previous.score + (previous.picked === question.answer ? 1 : 0) });
    requestAnimationFrame(() => { feedback.current?.focus(); feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  };
  const next = () => {
    if (!run.graded) return;
    setRun(previous => previous.graded ? ({ ...previous, index: previous.index + 1, picked: null, graded: false }) : previous);
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
          <div className="quiz-question-top"><div className="quiz-question-copy"><div className="quiz-progress" role="progressbar" aria-label="문제 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="quiz-progress-dots" aria-hidden="true">{questions.map((q, index) => <span key={q.id} className={index < run.index ? 'done' : index === run.index ? 'current' : ''}/>)}</div><p>Q{run.index + 1} <span>/ {questions.length}</span></p></div><h2 ref={heading} tabIndex={-1} className="quiz-question" key={question.id}>{question.question}</h2></div><Image className="quiz-vignette" src="/quiz/assets/office-conversation.png" width={400} height={235} alt="" unoptimized/></div>
          <fieldset className="quiz-options"><legend className="quiz-sr-only">답을 선택하세요</legend>{question.options.map((option, index) => <label key={option.originalIndex} className={`quiz-option ${run.picked === index ? 'selected' : ''} ${run.graded && question.answer === index ? 'correct-option' : ''} ${run.graded && run.picked === index && !correct ? 'wrong-option' : ''}`}><input type="radio" name={`answer-${question.id}`} value={index} checked={run.picked === index} disabled={run.graded} onChange={() => setRun(previous => ({ ...previous, picked: index }))}/><span className="quiz-option-letter" aria-hidden="true">{'ABCDE'[index]}</span><span className="quiz-option-text">{option.text}</span><span className="quiz-option-check" aria-hidden="true">{run.graded && question.answer === index ? '✓' : run.picked === index ? '✓' : ''}</span></label>)}</fieldset>
          {run.graded && <div ref={feedback} className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`} role="status" tabIndex={-1}><h3>{correct ? '정답이에요!' : '틀려도 배울 수 있어요!'} <span>정답 {'ABCDE'[question.answer]}</span></h3><p>{question.explanation || '등록된 해설이 없습니다.'}</p></div>}
        </>}
        {finished && <div className="quiz-result"><span className="quiz-result-stars" aria-hidden="true">✦ ★ ✦</span><h2 ref={heading} tabIndex={-1}>이번 주제, 도전 완료!</h2><p className="quiz-result-score"><strong>{run.score}</strong> / {questions.length}</p><p>{run.score === questions.length ? '모두 맞혔어요! 오늘의 자신감을 챙겨가요.' : '해설과 함께 한 걸음 더 배웠어요.'}</p><button className="quiz-primary" onClick={restart}>다시 풀기 <span aria-hidden="true">↻</span></button><p className="quiz-result-note">결과는 이 화면에만 표시돼요.</p></div>}
      </div>
      {status === 'ready' && question && <><div className="quiz-actions">{run.graded ? <button className="quiz-primary" onClick={next}>{run.index === questions.length - 1 ? '결과 보기' : '다음 문제'} <span aria-hidden="true">→</span></button> : <button className="quiz-primary" disabled={run.picked === null} onClick={grade}>정답 확인 <span aria-hidden="true">→</span></button>}<p>{run.graded ? '해설을 읽고 다음 단계로 이어가요.' : '정답을 확인하면 해설이 펼쳐져요.'}</p></div></>}
    </section>
    <aside className={`quiz-pen-side ${correct ? 'pen-happy' : ''}`} aria-label="펜 캐릭터의 응원"><p className="quiz-speech" aria-live="polite">{encouragement}<span aria-hidden="true">✦</span></p><Image className="quiz-pen" src="/quiz/assets/pen-mascot.png" width={240} height={630} alt="응원하는 남색 펜 캐릭터" unoptimized priority/></aside>
  </main>;
}
