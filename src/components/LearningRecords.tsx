'use client';

import { useEffect, useRef, useState } from 'react';
import { answerText, choiceNames, Comparison, eventNames, LearningEvent, LearningReport, modeName, pathNames } from '@/lib/learning-report';
import './learning-records.css';

const date = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const comparisonKey = (c: Comparison) => [c.visitor_id, c.quiz_version_id, c.mode, c.signature].join(':');
function Timeline({ events }: { events: LearningEvent[] }) {
  return events.length ? <ol className="lr-timeline">{events.map((event, index) => <li key={`${event.sequence}-${index}`}><time>{date(event.at)}</time><span>{eventNames[event.type] ?? event.type}{event.object ? ` · ${choiceNames[event.object] ?? event.object}` : ''}</span></li>)}</ol> : <p className="lr-muted">수집된 이용 순서가 없습니다.</p>;
}
type Props = { admin?: boolean; getToken: () => Promise<string>; onBack?: () => void };
export default function LearningRecords({ admin = false, getToken, onBack }: Props) {
  const [report, setReport] = useState<LearningReport | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [comparison, setComparison] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const endpoint = admin ? '/api/admin/learning' : '/api/learning/history';
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      setState('loading'); setError('');
      try {
        const token = await getToken();
        if (controller.signal.aborted) return;
        const response = await fetch(`${endpoint}?${query}&page=${page}`, { cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || '기록을 불러오지 못했습니다.');
        if (!controller.signal.aborted) { setReport(body); setState('ready'); }
      } catch (e) {
        if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : '기록을 불러오지 못했습니다.'); setState('error'); }
      }
    });
    return () => controller.abort();
  }, [endpoint, getToken, query, page, reload]);
  const selected = report?.comparisons.find(c => comparisonKey(c) === comparison) ?? report?.comparisons[0];
  async function download(visits: boolean) {
    setExporting(true); setExportMessage('');
    try {
      const token = await getToken();
      const response = await fetch(`${endpoint}?${query}&format=csv&dataset=${visits ? 'visits' : 'attempts'}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error((await response.json()).error || 'CSV를 내려받지 못했습니다.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `learning-${visits ? 'visits' : 'attempts'}.csv`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage('현재 조회 조건의 전체 기록을 내려받았습니다.');
    } catch (e) { setExportMessage(e instanceof Error ? e.message : 'CSV를 내려받지 못했습니다.'); }
    finally { setExporting(false); }
  }
  return <div className="lr-root">
    {onBack && <button className="lr-back" onClick={onBack}>← 결과로 돌아가기</button>}
    <div className="lr-heading"><h2 ref={title} tabIndex={-1}>{admin ? '학습 기록 관리' : '내 학습 기록'}</h2><span className="lr-pill">{admin ? '운영자 전용' : '이 브라우저의 익명 기록'}</span></div>
    <p className="lr-muted">{admin ? '저장된 익명 방문·응시 기록을 조회합니다.' : '응시 날짜와 답안, 같은 퀴즈의 첫 응시·최근 결과를 확인해 보세요.'} 시간은 한국 시간(KST)입니다.</p>
    <form className="lr-filters" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const params = new URLSearchParams();
      for (const [key, value] of form.entries()) if (String(value)) params.set(key, String(value));
      setQuery(params.toString()); setPage(0); setReload(n => n + 1); setExportMessage('');
    }}>
      <label>시작일<input type="date" name="from" /></label><label>종료일<input type="date" name="to" /></label>
      <label>주제<select name="topic"><option value="">모든 주제·버전</option>{Array.from(new Map((report?.topics ?? []).map(t => [t.key, t])).values()).map(topic => <option key={topic.key} value={topic.key}>{topic.title}</option>)}</select></label>
      {admin && <label>이용 경로<select name="path"><option value="">모든 경로</option>{Object.entries(pathNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}
      <button className="lr-button" type="submit" disabled={state === 'loading'}>조회</button>
    </form>
    {state === 'loading' && <p className="lr-state" role="status">학습 기록을 불러오고 있어요…</p>}
    {state === 'error' && <div className="lr-state" role="alert"><p>{error}</p><button className="lr-button" onClick={() => setReload(n => n + 1)}>다시 불러오기</button></div>}
    {state === 'ready' && report && <>
      {selected && <section className="lr-comparison" aria-labelledby="lr-compare-title">
        <h3 id="lr-compare-title">첫 응시와 최근 응시</h3>
        <label className="lr-compare-select">비교할 기록<select value={comparisonKey(selected)} onChange={event => setComparison(event.target.value)}>{report.comparisons.map(c => <option key={comparisonKey(c)} value={comparisonKey(c)}>{c.title} · v{c.revision} · {modeName(c.mode)} · {c.question_count}문제{admin ? ` · ${c.visitor_id}` : ''}</option>)}</select></label>
        <div className="lr-summary"><div><span>완료 응시</span><strong>{selected.attempts}<small>회</small></strong></div><div><span>첫 점수</span><strong>{selected.first_score}<small> / {selected.max_score}</small></strong><p>정답 {selected.first_correct} / {selected.question_count}</p></div><div><span>최근 점수</span><strong>{selected.latest_score}<small> / {selected.max_score}</small></strong><p>정답 {selected.latest_correct} / {selected.question_count}</p></div></div>
        <p className="lr-change">{selected.attempts < 2 ? '같은 구성으로 완료한 응시가 2회 이상이면 변화를 확인할 수 있어요.' : selected.latest_correct === selected.first_correct ? '첫 응시와 최근 응시의 정답 수가 같아요.' : `첫 응시보다 ${Math.abs(selected.latest_correct - selected.first_correct)}문제 ${selected.latest_correct > selected.first_correct ? '더' : '적게'} 맞혔어요.`}</p>
        <p className="lr-muted">현재 조회 범위에서 같은 사용자·퀴즈 버전·문제 구성·응시 유형의 완료 기록만 비교합니다. 전체 응시와 오답 복습, 서로 다른 버전은 함께 비교하지 않습니다.</p>
      </section>}
      {admin && <section aria-labelledby="lr-path-title"><h3 id="lr-path-title">이용 경로별 관찰 결과</h3><div className="lr-path-grid">{['cardnews', 'office', 'unclassified'].map(path => {
        const row = report.paths.find(p => p.path === path);
        return <article className="lr-path-card" key={path}><h4>{pathNames[path]}</h4><dl><div><dt>응시자</dt><dd>{row?.participants ?? 0}명</dd></div><div><dt>전체 응시</dt><dd>{row?.attempts ?? 0}회</dd></div><div><dt>완료율</dt><dd>{row?.completion_rate == null ? '—' : `${row.completion_rate}%`}</dd></div><div><dt>정답률</dt><dd>{row?.accuracy == null ? '—' : `${row.accuracy}%`}</dd></div></dl></article>;
      })}</div><details className="lr-method"><summary>경로 분류·계산 기준 보기</summary><p>응시 시작 이벤트 전에 같은 방문에서 마지막으로 수집된 사무실 입장·물건 열기 또는 카드뉴스 열기를 기준으로 분류합니다. 응시 시작은 첫 답안 제출 시점이며, 이용 순서는 클라이언트 이벤트 순번을 사용합니다. 선행 이벤트가 없으면 직접 진입·미분류로 둡니다. 첫 화면 선택과 경로 분류는 별개입니다.</p><p>기간은 응시 시작일(KST, 종료일 포함) 기준입니다. 응시자는 경로별 고유 익명 사용자 수이며, 한 사용자가 여러 경로에 포함될 수 있습니다. 완료율 = 완료한 전체 응시 수 ÷ 시작한 전체 응시 수. 정답률 = 완료한 전체 응시의 정답 합계 ÷ 문제 수 합계. 오답 복습과 테스트 퀴즈는 경로 집계에서 제외합니다. 분모가 없으면 —로 표시합니다.</p><p>주제·버전을 모두 조회하면 구성과 사용자 차이가 함께 반영됩니다. 같은 주제로 좁히고 버전별 기록도 확인해 주세요. 결과는 관찰된 차이이며, 경로의 학습 효과나 인과관계를 입증하지 않습니다. 과거에 수집하지 않은 기록은 보완하거나 추정하지 않았습니다.</p></details></section>}
      <section aria-labelledby="lr-records-title"><div className="lr-section-head"><h3 id="lr-records-title">응시 기록 <small>{report.total}건</small></h3>{admin && <div className="lr-downloads"><button className="lr-button" disabled={exporting} onClick={() => download(false)}>응시·답안 CSV</button><button className="lr-button" disabled={exporting} onClick={() => download(true)}>방문·이용 순서 CSV</button></div>}</div>
        {!report.total && <p className="lr-state">{query ? '조회 조건에 맞는 응시 기록이 없어요.' : '아직 저장된 응시 기록이 없어요. 퀴즈를 풀고 저장이 완료되면 여기에 표시돼요.'}</p>}
        <div className="lr-attempts">{report.attempts.map(attempt => <article className="lr-attempt" key={attempt.id}>
          <div className="lr-attempt-top"><div><time>{date(attempt.started_at)}</time><h4>{attempt.title} <small>v{attempt.revision}</small></h4><span className="lr-pill">{modeName(attempt.mode)}</span> <span className="lr-muted">{attempt.completed ? '완료' : `진행 중 · ${attempt.answered_count}/${attempt.question_count} 응답`}{attempt.is_test ? ' · 테스트 퀴즈' : ''}</span></div><div className="lr-attempt-score"><strong>{attempt.score}</strong> / {attempt.max_score}<p>정답 {attempt.correct_count} · 오답 {attempt.wrong_count}</p></div></div>
          {admin && <p className="lr-identifiers">방문자 {attempt.visitor_id}<br/>응시 {attempt.id}<br/>{pathNames[attempt.path]} · 첫 선택: {attempt.first_choice ? choiceNames[attempt.first_choice] ?? attempt.first_choice : '미수집'}</p>}
          {attempt.source_attempt_id && <p className="lr-identifiers">원본 응시: {attempt.source_attempt_id}</p>}
          <details className="lr-answers"><summary>답안 보기</summary>{attempt.answers.map((answer, index) => <div className="lr-answer" key={answer.questionId}><h5>Q{index + 1}. {answer.question}</h5><p><b>내 답안:</b> {answerText(answer, answer.selectedOption?.split(',') ?? null)} <span className={answer.isCorrect ? 'lr-right' : 'lr-wrong'}>{answer.isCorrect === null ? '미응답' : answer.isCorrect ? '정답' : '오답'}</span></p><p><b>정답:</b> {answerText(answer, answer.correctOptions)}</p><p className="lr-muted">{answer.explanation}</p></div>)}</details>
          {admin && <details className="lr-answers"><summary>이 방문의 이용 순서</summary><Timeline events={attempt.events}/></details>}
        </article>)}</div>
      </section>
      {admin && <section><h3>방문 기록 <small>{report.visitTotal}건</small></h3><p className="lr-muted">퀴즈 미응시 방문도 포함합니다. 방문 기간은 방문 시작일 기준이며, 주제·경로 필터를 적용하면 해당 응시가 있는 방문만 표시합니다.</p>{!report.visitTotal && <p className="lr-state">조회 조건에 맞는 방문 기록이 없습니다.</p>}{report.visits.map(visit => <details className="lr-visit" key={visit.id}><summary>{date(visit.started_at)} · 첫 선택: {visit.first_choice ? choiceNames[visit.first_choice] ?? visit.first_choice : '미수집'}</summary><p className="lr-identifiers">방문자 {visit.visitor_id}<br/>방문 {visit.id}</p><Timeline events={visit.events}/></details>)}</section>}
      {Math.max(report.total, admin ? report.visitTotal : 0) > 50 && <nav className="lr-pagination" aria-label="기록 페이지"><button className="lr-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.ceil(Math.max(report.total, admin ? report.visitTotal : 0) / 50)}</span><button className="lr-button" disabled={(page + 1) * 50 >= Math.max(report.total, admin ? report.visitTotal : 0)} onClick={() => setPage(p => p + 1)}>다음</button></nav>}
    </>}
    <p role="status" className="lr-muted">{exportMessage}</p>
    <p className="lr-privacy">익명 기록은 같은 브라우저에서 이어서 볼 수 있어요. 브라우저 데이터 삭제, 시크릿 모드 종료 또는 기기 변경 시 이전 기록과 연결되지 않을 수 있습니다.</p>
  </div>;
}
