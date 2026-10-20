'use client';

import { useEffect, useState } from 'react';
import { chapters } from './data';
import { loadQuizHistory, type QuizAttempt } from './quiz-store';
import { quizQuestionText, quizReadingText } from './quiz-text';

export default function QuizAccount({ userId, connecting, message, refresh, onReconnect, titleId }: {
  userId: string | null;
  connecting: boolean;
  message: string;
  refresh: number;
  onReconnect: () => void;
  titleId?: string;
}) {
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [historyMessage, setHistoryMessage] = useState('저장된 기록을 불러오는 중…');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (userId) {
      loadQuizHistory(userId).then(rows => {
        if (active) { setHistory(rows); setHistoryMessage(rows.length ? '' : '아직 저장된 기록이 없어요.'); }
      }).catch(error => { if (active) setHistoryMessage(error.message); });
    }
    return () => { active = false; };
  }, [userId, refresh, reload]);

  return <section className="quiz-account" aria-label="나의 퀴즈 기록">
    <h2 id={titleId}>나의 OX 퀴즈 기록</h2>
    {userId ? <>
      <p>이 브라우저의 사용자 기록이에요. 브라우저 데이터를 지우거나 다른 기기를 사용하면 기존 기록에 접근할 수 없어요.</p>
      <div className="quiz-history-list">
        <h3>최근 풀이 기록</h3>
        <p role="status">{historyMessage}</p>
        <button type="button" onClick={() => setReload(n => n + 1)}>기록 새로고침</button>
        <ul>{history.map(attempt => <li key={attempt.id}>
          <details><summary>
            {chapters[attempt.chapter]?.name} · 정답 {attempt.score}개 / 오답 {attempt.total - attempt.score}개 · {new Date(attempt.completed_at).toLocaleString('ko-KR')}
            <span className="quiz-history-results" aria-label="문제별 채점 결과">{attempt.answers.map((answer, index) =>
              <span key={`${answer.question_id}-${index}`} className={`quiz-history-verdict ${answer.selected === answer.correct ? 'is-correct' : 'is-incorrect'}`}>
                {index + 1}번 {answer.selected === answer.correct ? '✓ 정답' : '✕ 오답'}
              </span>
            )}</span>
          </summary>
            <ol>{attempt.answers.map((answer, index) => <li className="quiz-history-question" key={`${answer.question_id}-${index}`}>
              <span className={`quiz-history-verdict ${answer.selected === answer.correct ? 'is-correct' : 'is-incorrect'}`}>{answer.selected === answer.correct ? '✓ 정답' : '✕ 오답'}</span>
              <p>{quizQuestionText(answer.quiz)}</p><p>내 답: <strong>{answer.selected ? 'O' : 'X'}</strong> · 정답: <strong>{answer.correct ? 'O' : 'X'}</strong></p><p>{quizReadingText(answer.explanation)}</p>
            </li>)}</ol>
          </details>
        </li>)}</ul>
      </div>
    </> : <button type="button" onClick={onReconnect} disabled={connecting}>{connecting ? '연결 중…' : '익명 사용자 다시 연결'}</button>}
    <p role="status">{message}</p>
  </section>;
}
