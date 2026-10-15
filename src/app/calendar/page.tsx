'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { chapters, Topic } from './data';
import './calendar.css';

const stickerImage = (art: string) => `/calendar/assets/${art === 'arrival' || art === 'night' ? `${art}-reference.png` : `${art}.svg`}`;

export default function CalendarPage() {
  const [chapter, setChapter] = useState(0);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const current = chapters[chapter];
  useEffect(() => {
    if (topic || quiz) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.current?.close();
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [topic, quiz]);
  const close = () => { setTopic(null); setQuiz(false); };
  const questions = current.topics;
  const finished = step === questions.length;
  const selected = answers[step];
  const change = (index: number) => { setChapter(index); setAnswers([]); setStep(0); };
  return <main className="calendar-scene" lang="ko">
    <div className="calendar-object">
      <div className="navy-stand" aria-hidden="true"/>
      <section className="calendar-paper" aria-label="스티커로 배우는 취업규칙 달력">
        <div className="bindings" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <span key={i}/>)}</div>
        <nav className="calendar-tabs" aria-label="학습 주제">{chapters.map((c, i) => <button key={c.name} aria-current={chapter === i ? 'page' : undefined} className={`${c.color} ${chapter === i ? 'active' : ''}`} onClick={() => change(i)}>{c.name}</button>)}</nav>
        <div className="calendar-intro"><span className="example-label">학습용 예시 달력</span><p>궁금한 날짜를 콕! 눌러보세요 <span>✦</span></p><span className="tiny-note">날짜는 실제 일정과 무관해요</span></div>
        <div key={chapter} className="calendar-leaf">
          <div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day, i) => <span key={day} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{day}</span>)}</div>
          <div className="date-grid">{Array.from({ length: 28 }, (_, i) => {
            const t = current.topics.find(t => t.day === i + 1);
            return <div key={i} className={`date-cell ${i % 7 === 0 ? 'sun' : i % 7 === 6 ? 'sat' : ''}`}><span className="date-number">{i + 1}</span>{t && <button className={`sticker sticker-${t.art}`} onClick={() => setTopic(t)} aria-label={`${i + 1}일 ${t.label} 안내 열기`}><Image src={stickerImage(t.art)} alt="" width={160} height={125} unoptimized loading={t.art === 'break' ? 'eager' : undefined}/><span>{t.label}</span></button>}{[13, 22].includes(i) && !t && <span className="doodle" aria-hidden="true">☆</span>}</div>;
          })}</div>
        </div>
        <footer className="calendar-footer"><div className="page-controls"><button disabled={chapter === 0} onClick={() => change(chapter - 1)} aria-label="이전 장">‹</button><span><b>0{chapter + 1}</b> / 03</span><button disabled={chapter === 2} onClick={() => change(chapter + 1)} aria-label="다음 장">›</button></div><p className="sticker-hint">✦ <span>스티커를 누르면 상황별 안내가 열려요</span></p><button className="quiz-start" onClick={() => { setQuiz(true); setAnswers([]); setStep(0); }}>OX 퀴즈 도전 <span>→</span></button></footer>
        <div className="paper-note">2026. 2. 표준취업규칙 · 일반 근로자용 기준 · 회사별 적용 기준 확인</div><div className="page-curl" aria-hidden="true"/>
      </section>
    </div>
    <div className="source-note"><span>작은 스티커로 알아보는, 일하는 날의 규칙</span><a href="/calendar/source.pdf" target="_blank" rel="noreferrer">참고 PDF 보기 ↗</a></div>
    <dialog ref={dialog} className="calendar-dialog" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="dialog-title">
      <button className="close-dialog" onClick={close} aria-label="팝업 닫기">×</button>
      {topic && <><span className="dialog-eyebrow">{current.name} · 상황별 안내</span><Image className="dialog-art" src={stickerImage(topic.art)} alt="" width={160} height={125} unoptimized/><h2 id="dialog-title">{topic.question}</h2><p className="core-rule">{topic.core}</p><h3>자세히 살펴보기 <span className="legal-tag">PDF의 법정 기준·요건</span></h3><ul>{topic.rules.map(rule => <li key={rule}>{rule}</li>)}</ul><div className="company-rule"><h3>회사 설정·선택 사항</h3><p>{topic.company}</p></div><p className="source-ref">근거: {topic.source} · PDF 파일 {topic.page}쪽부터 <a href={`/calendar/source.pdf#page=${topic.page}`} target="_blank" rel="noreferrer">원문 확인 ↗</a></p><p className="scope-note">주40시간 제조업을 가정한 일반 근로자용 표준안 요약입니다. [필수]·[선택]은 취업규칙의 기재 구분이며 법적 의무와는 다를 수 있습니다. 단시간근로자 등은 해당 원문을 확인하세요.</p></>}
      {quiz && <><span className="dialog-eyebrow">{current.name} · OX 퀴즈</span><h2 id="dialog-title">{finished ? '이번 장, 학습 완료!' : '스티커 속 규칙을 기억하나요?'}</h2>{finished ? <div className="quiz-result"><span>✦</span><p>{questions.filter((q, i) => q.answer === answers[i]).length} / {questions.length} 정답</p><p>해설과 원문을 함께 확인하며 복습해요.</p><button className="quiz-start" onClick={() => { setAnswers([]); setStep(0); }}>다시 풀기 ↻</button></div> : <><p className="quiz-progress">{step + 1} / {questions.length}</p><p className="quiz-question">{questions[step].quiz}</p><div className="ox-choices">{[true, false].map(value => <button key={String(value)} disabled={selected !== undefined} className={selected === value ? 'selected' : ''} onClick={() => setAnswers([...answers, value])} aria-label={value ? '맞다 O' : '틀리다 X'}>{value ? 'O' : 'X'}</button>)}</div>{selected !== undefined && <div className="quiz-feedback" role="status"><h3>{selected === questions[step].answer ? '정답이에요!' : '다시 기억해봐요!'} 정답은 {questions[step].answer ? 'O' : 'X'}</h3><p>{questions[step].explanation}</p><p className="source-ref">{questions[step].source}</p><button className="quiz-start" onClick={() => setStep(step + 1)}>{step === questions.length - 1 ? '결과 보기' : '다음 문제'} →</button></div>}</>}</>}
    </dialog>
  </main>;
}
