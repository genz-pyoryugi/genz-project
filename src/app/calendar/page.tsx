'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { chapters, Topic } from './data';
import './calendar.css';
import './quiz-account.css';
import './calendar-board.css';
import './quiz-panel.css';
import './quiz-frame.css';
import { ensureCalendarSession, getCalendarSupabase } from '@/lib/calendar-supabase';
import QuizAccount from './quiz-account';
import TopicGuide from './topic-guide';
import { loadQuizQuestions, saveQuizAttempt, type QuizQuestion } from './quiz-store';

const stickerImage = (art: string) => `/calendar/assets/${art === 'arrival' || art === 'night' ? `${art}-reference.png` : `${art}.svg`}`;

function ChapterIcon({ chapter }: { chapter: number }) {
  return <svg viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {chapter === 0 ? <><circle cx="26" cy="26" r="20"/><path d="M26 13v14h11"/></>
      : chapter === 1 ? <><rect x="8" y="12" width="33" height="33" rx="4"/><path d="M8 22h33M17 7v11M32 7v11M17 29h1m9 0h1m-11 8h1m9 0h1"/><g stroke="#ff971f"><circle cx="42" cy="10" r="5"/><path d="M42 1v1m0 16v1M33 10h1m16 0h1M36 4l1 1m10 10 1 1M48 4l-1 1"/></g></>
      : <><path d="M30 15V5L12 2v47l18-3V35M12 5H5v43h7M25 25h22m-7-7 8 7-8 7"/><path d="M24 24v4"/></>}
  </svg>;
}

export default function CalendarPage() {
  const [chapter, setChapter] = useState(0);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [help, setHelp] = useState(false);
  const [records, setRecords] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [viewed, setViewed] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [connectionMessage, setConnectionMessage] = useState('익명 사용자 연결 중…');
  const [connectionRetry, setConnectionRetry] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const run = useRef(0);
  const attemptId = useRef('');
  const saveInProgress = useRef(false);
  const savedAttempt = useRef<string | null>(null);
  const activeUser = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const current = chapters[chapter];
  useEffect(() => {
    const client = getCalendarSupabase();
    let active = true;
    const subscription = client?.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user.id ?? null;
      setUserId(nextUser);
      if (activeUser.current !== nextUser) {
        activeUser.current = nextUser;
        run.current++;
        setQuiz(false);
        setTopic(null);
        setAnswers([]);
        setHistoryRefresh(n => n + 1);
      }
    }).data.subscription;
    ensureCalendarSession().then(() => {
      if (active) setConnectionMessage('익명 사용자로 연결됐어요. 퀴즈를 완료하면 답안과 점수를 저장해요.');
    }).catch(error => {
      if (active) setConnectionMessage(error instanceof Error ? error.message : '익명 사용자 연결에 실패했어요.');
    }).finally(() => { if (active) setConnecting(false); });
    return () => { active = false; subscription?.unsubscribe(); };
  }, [connectionRetry]);
  useEffect(() => {
    if (topic || quiz || help || records) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.current?.querySelector('.situation-content')?.scrollTo({ top: 0 });
      dialog.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.current?.close();
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [topic, quiz, help, records]);
  const close = () => { run.current++; setTopic(null); setQuiz(false); setHelp(false); setRecords(false); };
  const finished = step === questions.length;
  const selected = answers[step];
  const completedCount = answers.filter(answer => answer !== undefined).length;
  const explanation = questions[step]?.explanation ?? '';
  const sentenceEnd = explanation.search(/[.!?。](?:\s|$)/);
  const explanationLead = sentenceEnd < 0 ? explanation : explanation.slice(0, sentenceEnd + 1);
  const explanationRest = sentenceEnd < 0 ? '' : explanation.slice(sentenceEnd + 1).trim();
  const change = (index: number) => { setChapter(index); setAnswers([]); setStep(0); };
  async function startQuiz() {
    const generation = ++run.current;
    attemptId.current = crypto.randomUUID();
    saveInProgress.current = false;
    savedAttempt.current = null;
    setQuiz(true); setAnswers([]); setStep(0); setLoading(true);
    setSaved(false); setSaving(false); setSaveMessage(''); setNotice(''); setOnline(false);
    try {
      const rows = await loadQuizQuestions(chapter);
      if (run.current !== generation) return;
      setQuestions(rows); setOnline(true);
      setNotice(userId ? '온라인 문제 · 완료하면 내 기록에 저장돼요.' : '온라인 문제 · 익명 사용자 연결이 안 되어 기록은 저장되지 않아요.');
    } catch (error) {
      if (run.current !== generation) return;
      setQuestions(current.topics.map((t, position) => ({
        id: t.art, chapter, position, version: 0, quiz: t.quiz,
        answer: t.answer, explanation: t.explanation, source: t.source,
      })));
      setNotice(error instanceof Error ? error.message : '지금은 연습 모드이며 기록은 저장되지 않아요.');
    } finally { if (run.current === generation) setLoading(false); }
  }
  async function saveResult() {
    if (!online || !userId || saveInProgress.current || savedAttempt.current === attemptId.current
      || questions.length === 0 || completedCount !== questions.length) return;
    saveInProgress.current = true;
    const generation = run.current;
    setSaving(true); setSaveMessage('저장 중…');
    try {
      await saveQuizAttempt(attemptId.current, chapter, questions, answers);
      if (run.current !== generation) return;
      savedAttempt.current = attemptId.current;
      setSaved(true); setSaveMessage('내 풀이 기록과 점수를 저장했어요.');
      setHistoryRefresh(n => n + 1);
    } catch (error) {
      if (run.current === generation) setSaveMessage(error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      if (run.current === generation) { saveInProgress.current = false; setSaving(false); }
    }
  }
  function nextQuestion() {
    if (loading || finished || selected === undefined) return;
    if (step === questions.length - 1 && completedCount !== questions.length) return;
    setStep(step + 1);
    if (step === questions.length - 1) void saveResult();
  }
  const questionNavigation = <nav className="quiz-navigation" aria-label="퀴즈 문제 이동">
    <button className="quiz-previous" disabled={loading || step === 0} onClick={() => setStep(index => Math.max(0, index - 1))}><span aria-hidden="true">‹</span> 이전 문제</button>
    <button className="quiz-next" disabled={loading || selected === undefined} onClick={nextQuestion}>{step === questions.length - 1 && !loading ? '결과 보기' : <>다음 문제 <span aria-hidden="true">›</span></>}</button>
  </nav>;
  return <main className="calendar-scene" lang="ko">
    {!calendarOpen && <div className="calendar-reopen"><p>GEN Z CALENDAR</p><button className="quiz-start" onClick={() => setCalendarOpen(true)}>캘린더 다시 열기 ↗</button></div>}
    <div className="calendar-object" hidden={!calendarOpen}>
      <section className="calendar-paper" aria-label="스티커로 배우는 취업규칙 달력">
        <div className="bindings" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i}/>)}</div>
        <header className="calendar-heading">
          <button className="calendar-help" onClick={() => setHelp(true)} aria-label="캘린더 이용 방법">?</button>
          <h1>GEN Z CALENDAR</h1>
          <button className="calendar-records" onClick={() => setRecords(true)} aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2"/><rect x="7" y="2" width="10" height="5" rx="2"/><path d="m7 13 2 2 3-4m2 2h3m-10 5h10"/></svg>퀴즈 기록</button>
          <button className="calendar-close" onClick={() => setCalendarOpen(false)} aria-label="캘린더 닫기"><span/><span/></button>
        </header>
        <nav className="calendar-tabs" aria-label="학습 주제">{chapters.map((c, i) => <button key={c.name} aria-current={chapter === i ? 'page' : undefined} className={`${c.color} ${chapter === i ? 'active' : ''}`} onClick={() => change(i)}><ChapterIcon chapter={i}/><span>{c.name}</span></button>)}</nav>
        <div className="calendar-intro"><p>회사생활, 이런 날엔 어떻게 할까요?<span className="intro-rays" aria-hidden="true"><i/><i/><i/></span></p><span className="tiny-note">학습용 예시 달력 · 실제 일정과 무관해요</span></div>
        <div key={chapter} className="calendar-leaf">
          <div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day, i) => <span key={day} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{day}</span>)}</div>
          <div className="date-grid">{Array.from({ length: 28 }, (_, i) => {
            const t = current.topics.find(t => t.day === i + 1);
            return <div key={i} className={`date-cell ${i % 7 === 0 ? 'sun' : i % 7 === 6 ? 'sat' : ''}`}><span className="date-number">{i + 1}</span>{t && <button className={`sticker sticker-${t.art}`} onClick={() => { setTopic(t); setViewed(previous => previous.includes(t.art) ? previous : [...previous, t.art]); }} aria-label={`${i + 1}일 ${t.label} 안내 열기${viewed.includes(t.art) ? ', 확인함' : ''}`}><Image src={stickerImage(t.art)} alt="" width={160} height={125} unoptimized/><span>{t.label}</span>{viewed.includes(t.art) && <i className="sticker-viewed" aria-hidden="true">✓</i>}</button>}</div>;
          })}</div>
        </div>
        <footer className="calendar-footer"><div className="page-controls"><button disabled={chapter === 0} onClick={() => change(chapter - 1)} aria-label="이전 장">‹</button><span><b>0{chapter + 1}</b> / 03</span><button disabled={chapter === 2} onClick={() => change(chapter + 1)} aria-label="다음 장">›</button></div><p className="sticker-hint">✦ <span>궁금한 스티커를 눌러 확인해 보세요</span></p><button className="quiz-start" disabled={connecting} onClick={startQuiz}>OX 퀴즈 도전 <span>→</span></button></footer>
      </section>
    </div>
    <dialog ref={dialog} className={`calendar-dialog${topic ? ' situation-dialog' : ''}${quiz ? ' quiz-dialog' : ''}${quiz && finished && !loading ? ' quiz-complete-dialog' : ''}${quiz && !finished && !loading && selected !== undefined ? ' quiz-answered' : ''}`} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="dialog-title">
      <button className="close-dialog" onClick={close} aria-label="팝업 닫기">{quiz ? <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m5 5 22 22M27 5 5 27"/></svg> : '×'}</button>
      {help && <><span className="dialog-eyebrow">GEN Z CALENDAR</span><h2 id="dialog-title">스티커로 배우는 일하는 날의 규칙</h2><p className="core-rule">날짜 속 스티커를 누르면 상황별 안내가 열려요.</p><ul><li>위쪽 탭이나 아래 화살표로 근로시간, 휴일·휴가, 퇴직·해고를 살펴보세요.</li><li>한 번 확인한 스티커에는 초록색 체크가 표시돼요. 이 표시는 현재 화면을 이용하는 동안 유지돼요.</li><li>OX 퀴즈를 풀며 배운 내용을 확인하고, 연결된 익명 사용자로 풀이 기록을 저장할 수 있어요.</li></ul><p className="scope-note">학습용 예시 달력으로 실제 근무 일정이 아닙니다. 2026. 2. 표준취업규칙의 일반 근로자용 기준이며 회사별 적용 기준을 확인하세요.</p><p className="source-ref"><a href="/calendar/source.pdf" target="_blank" rel="noreferrer">참고 PDF 보기 ↗</a></p></>}
      {records && <QuizAccount key={userId ?? 'guest'} titleId="dialog-title" userId={userId} connecting={connecting} message={connectionMessage} refresh={historyRefresh} onReconnect={() => { setConnecting(true); setConnectionMessage('익명 사용자 연결 중…'); setConnectionRetry(n => n + 1); }}/>}
      {topic && <TopicGuide key={topic.art} topic={topic} chapter={current.name} image={stickerImage(topic.art)}/>}
      {quiz && <>
        <header className="quiz-panel-heading"><h2 id="dialog-title" className="quiz-title">GEN Z OX QUIZ</h2><span className="quiz-title-rays" aria-hidden="true">✦</span></header>
        {(!finished || loading) && <><div className="quiz-mission-row">
          <div className="quiz-chapter-badge"><ChapterIcon chapter={chapter}/><span>{current.name}</span></div>
          <div className="quiz-mission" role="progressbar" aria-label="답변 완료한 문제" aria-valuemin={0} aria-valuemax={loading ? current.topics.length : questions.length} aria-valuenow={completedCount}>
            <span>MISSION <b>{String(completedCount).padStart(2, '0')}</b> / {String(loading ? current.topics.length : questions.length).padStart(2, '0')}</span>
            <div className="quiz-mission-bars" aria-hidden="true">{Array.from({ length: loading ? current.topics.length : questions.length }, (_, index) => <i key={index} className={index < completedCount ? 'active' : ''}/>)}</div>
          </div>
        </div>
        </>}
        {loading ? <div className="quiz-panel-loading" role="status">문제를 불러오는 중…</div> : finished ? <div className="quiz-result quiz-completion">
          <h3 className="quiz-completion-title">퀴즈 완료!<span aria-hidden="true"><i/><i/></span></h3>
          <div className="quiz-completion-summary">
            <Image className="quiz-completion-art" src="/calendar/assets/quiz-complete.svg" alt="" width={340} height={255} unoptimized/>
            <div className="quiz-completion-score"><p><strong>{questions.filter((q, i) => q.answer === answers[i]).length}</strong><span> / {questions.length}</span></p><p>정답</p></div>
          </div>
          <div className="quiz-completion-actions">
            <button className="quiz-retry" disabled={saving} onClick={startQuiz}>다시 풀기 <span aria-hidden="true">↻</span></button>
            <button className="quiz-return" onClick={close}><span aria-hidden="true">‹</span> 캘린더로</button>
          </div>
          <p className="quiz-completion-status" role="status">{saveMessage || (!online || !userId ? '연습 모드 · 기록 미저장' : '풀이 기록을 저장하고 있어요.')}</p>
          {online && userId && !saved && <button className="quiz-save-retry" disabled={saving} onClick={saveResult}>{saving ? '저장 중…' : '결과 저장 다시 시도'}</button>}
        </div> : <>
          <div className="quiz-question-stage">
            <Image className="quiz-mascot" src="/calendar/assets/quiz-clock.svg" alt="" width={220} height={170} unoptimized/>
            <p className="quiz-question-number">Q.{String(step + 1).padStart(2, '0')}</p>
            <p className="quiz-question">{questions[step].quiz}</p>
          </div>
          <div className="quiz-answer-area">
          <div className="ox-choices">{[true, false].map(value => <button key={String(value)} disabled={selected !== undefined} className={selected === value ? 'selected' : ''} onClick={() => setAnswers(previous => { if (previous[step] !== undefined) return previous; const updated = [...previous]; updated[step] = value; return updated; })} aria-label={value ? 'O 선택' : 'X 선택'} aria-pressed={selected === value}><span aria-hidden="true">{value ? 'O' : 'X'}</span></button>)}</div>
          {selected === undefined && <div className="quiz-pending-navigation">{questionNavigation}</div>}
          {selected !== undefined && <section key={questions[step].id} className={`quiz-feedback ${selected === questions[step].answer ? 'is-correct' : 'is-incorrect'}`} aria-label="정답 해설">
            <div role="status">
              <div className="quiz-feedback-heading">
                <span className="quiz-feedback-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{selected === questions[step].answer ? <path d="m7 17 6 6L26 9"/> : <><path d="M25 12a10 10 0 1 0 0 10M25 5v8h-8"/></>}</svg></span>
                <h3>{selected === questions[step].answer ? '정답이에요!' : '다시 기억해봐요!'}</h3>
                <span className="quiz-answer-badge">정답 {questions[step].answer ? 'O' : 'X'}</span>
              </div>
              <div className="quiz-explanation"><p><strong>{explanationLead}</strong></p>{explanationRest && <p>{explanationRest}</p>}</div>
            </div>
            <div className="quiz-feedback-actions">
              <button className="quiz-source-toggle" popoverTarget="quiz-source-popover">관련 근거 보기 <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 7 7 7 7-7"/></svg></button>
              <div id="quiz-source-popover" className="quiz-source-popover" popover="auto"><button className="quiz-source-close" popoverTarget="quiz-source-popover" popoverTargetAction="hide" aria-label="근거 닫기">×</button><h4>관련 조항·출처</h4><p>{questions[step].source}</p><a href="/calendar/source.pdf" target="_blank" rel="noreferrer">참고 PDF 원문 보기 ↗</a></div>
              {questionNavigation}
            </div>
          </section>}
          </div>
        </>}
        {(!finished || loading) && <footer className="quiz-panel-footer">
          <button className="quiz-back" onClick={close}><span aria-hidden="true">‹</span> 캘린더로 돌아가기</button>
          <p className="quiz-mode-badge" role="status" title={notice}><span aria-hidden="true">ⓘ</span> {loading ? '문제를 불러오고 있어요' : !online || !userId ? '연습 모드 · 기록은 저장되지 않아요' : saved ? '내 풀이 기록에 저장했어요' : saving ? '풀이 기록 저장 중…' : '완료하면 내 기록에 저장돼요'}</p>
        </footer>}
      </>}
    </dialog>
  </main>;
}
