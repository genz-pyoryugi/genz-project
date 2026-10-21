'use client';

import { useEffect, useState } from 'react';
import { learnerToken } from '@/lib/learning-client';
import type { Question, Quiz } from './model';
import { buildLearningFeedback, ComparableAttempt, correctOptions,
  ItemFeedback, learningItems, matchingAttempt, SubmittedAnswers, submittedAnswers } from './learning-feedback';

type Props = { quiz: Quiz; questions: Question[]; answers: SubmittedAnswers; mode: 'full' | 'review'; attemptId: string | null; recordsReady: boolean };
type ComparisonData = { current: ComparableAttempt };
const optionText = (question: Question, ids: string[]) => ids.map(id => {
  const index = question.options.findIndex(option => option.id === id);
  return index < 0 ? id : `${String.fromCharCode(65 + index)}. ${question.options[index].text}`;
}).join(' / ');

function RelatedQuestion({ question, selected, number }: { question: Question; selected: string[]; number: number }) {
  return <article className="pf-question">
    <h5>Q{number}. {question.question}</h5>
    <p><b>선택했던 답</b><span>{selected.length ? optionText(question, selected) : '선택 답안을 아직 확인할 수 없어요.'}</span></p>
    <p><b>정답</b><span>{optionText(question, correctOptions(question))}</span></p>
    <p><b>해설</b><span>{question.explanation}</span></p>
  </article>;
}
function ItemCard({ group }: { group: ItemFeedback }) {
  return <article className={`pf-item pf-item--${group.state}`}>
    <h4>{group.label}</h4>
    {group.state === 'mixed' && <p className="pf-mixed-message">일부 상황은 이해했지만 추가 확인이 필요해요</p>}
  </article>;
}
export default function PartLearningFeedback({ quiz, questions, answers, mode, attemptId, recordsReady }: Props) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const needsSavedAnswers = questions.some(question => !answers[question.id]?.selectedOptions.length);
  useEffect(() => {
    if (!attemptId || !recordsReady || !needsSavedAnswers) return;
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      setLoading(true); setError(''); setComparison(null);
      try {
        const token = await learnerToken(); // Flush the existing durable queue before reading the saved result.
        if (controller.signal.aborted) return;
        const response = await fetch(`/api/learning/part-feedback?attempt=${encodeURIComponent(attemptId)}`, {
          cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || '저장된 답안을 불러오지 못했어요.');
        const data = body as ComparisonData;
        if (!matchingAttempt(data.current, questions, quiz.id, mode)) {
          throw new Error('이번 문제·버전·응시 유형과 일치하는 저장 답안이 필요해요.');
        }
        if (!controller.signal.aborted) setComparison(data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '저장된 답안을 불러오지 못했어요.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    });
    return () => controller.abort();
  }, [attemptId, recordsReady, quiz.id, questions, mode, retry, needsSavedAnswers]);
  const currentAnswers = comparison ? submittedAnswers(comparison.current) : answers;
  const groups = buildLearningFeedback(questions, quiz.id, currentAnswers);
  const understood = groups.filter(group => group.state === 'understood');
  const review = groups.filter(group => group.state !== 'understood');
  const unmapped = questions.filter(question => !learningItems(quiz.id, question).length);
  const availableAnswers = questions.filter(question => currentAnswers[question.id]?.selectedOptions.length).length;
  return <section className="pf-root" aria-labelledby="part-feedback-title">
    <div className="pf-heading"><span className="pf-eyebrow">{mode === 'review' ? '이번 오답 복습의 답안' : '이번 파트의 답안'}</span><h3 id="part-feedback-title">{quiz.title} · 학습 항목별 피드백</h3>
      <p>이번 {questions.length}문항의 답안을 바탕으로 정리했어요.</p></div>
    {availableAnswers < questions.length && <p className="pf-notice" role="status">선택 답안 {availableAnswers}/{questions.length}문항을 확인했어요. 확인되지 않은 답안은 점수로 추정하지 않으며, 저장된 답안을 불러오면 나머지 내용을 표시해요.</p>}
    {availableAnswers < questions.length && loading && <p className="pf-note" role="status">저장된 답안을 불러오고 있어요.</p>}
    {availableAnswers < questions.length && error && <div className="pf-notice" role="status"><p>{error}</p><button className="pf-retry" onClick={() => setRetry(n => n + 1)}>답안 다시 불러오기</button></div>}
    <div className="pf-summary-cards"><section className="pf-summary pf-summary--understood" aria-labelledby="pf-understood"><h4 id="pf-understood"><span className="pf-card-icon" aria-hidden="true">✓</span>잘 이해한 내용 <small>{understood.length}개 항목</small></h4>
      {understood.length ? <div className="pf-grid">{understood.map(group => <ItemCard key={group.id} group={group}/>)}</div> :
        <p className="pf-empty">{availableAnswers ? '이번에 검토된 항목 중 정답만으로 확인된 항목은 없어요. 보완할 내용과 관련 문제를 살펴봐요.' : '선택 답안을 확인한 뒤 안내할 수 있어요.'}</p>}
    </section>
    <section className="pf-summary pf-summary--review" aria-labelledby="pf-review"><h4 id="pf-review"><span className="pf-card-icon" aria-hidden="true">!</span>한 번 더 확인할 내용 <small>{review.length}개 항목</small></h4>
      {review.length ? <div className="pf-grid">{review.map(group => <ItemCard key={group.id} group={group}/>)}</div> :
        <p className="pf-empty">{availableAnswers === questions.length ? '검토된 학습 항목에서는 오답으로 드러난 보완 사항이 없어요. 관련 문제의 정답과 해설로 판단 기준을 다시 확인해 보세요.' : '확인된 답안에서 드러난 내용만 안내하며, 나머지 항목은 아직 판단하지 않아요.'}</p>}
    </section>
    </div>
    {unmapped.length > 0 && <section className="pf-section"><h4>세부 항목 연결을 확인할 문제</h4><p className="pf-notice">{unmapped.length}문항은 이 버전의 항목 연결을 아직 검토하지 않았어요. 임의의 항목을 붙이지 않고 답안·정답·해설만 제공합니다.</p><details className="pf-related"><summary>관련 문제 보기 · {unmapped.length}문항</summary>{unmapped.map(question => <RelatedQuestion key={question.id} question={question} selected={currentAnswers[question.id]?.selectedOptions ?? []} number={questions.indexOf(question) + 1}/>)}</details></section>}

  </section>;
}
