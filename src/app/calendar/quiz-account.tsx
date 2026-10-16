'use client';

import { useEffect, useState } from 'react';
import { chapters } from './data';
import { loadQuizHistory, type QuizAttempt } from './quiz-store';

export default function QuizAccount({ userId, connecting, message, refresh, onReconnect, titleId }: {
  userId: string | null;
  connecting: boolean;
  message: string;
  refresh: number;
  onReconnect: () => void;
  titleId?: string;
}) {
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [historyMessage, setHistoryMessage] = useState('');
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
      <details><summary>최근 풀이 기록 보기</summary>
        <p role="status">{historyMessage}</p>
        <button type="button" onClick={() => setReload(n => n + 1)}>기록 새로고침</button>
        <ul>{history.map(attempt => <li key={attempt.id}>
          <details><summary>{chapters[attempt.chapter]?.name} · {attempt.score}/{attempt.total} 정답 · {new Date(attempt.completed_at).toLocaleString('ko-KR')}</summary>
            <ol>{attempt.answers.map((answer, index) => <li key={`${answer.question_id}-${index}`}>
              <p>{answer.quiz}</p><p>내 답: {answer.selected ? 'O' : 'X'} · 정답: {answer.correct ? 'O' : 'X'}</p><p>{answer.explanation}</p>
            </li>)}</ol>
          </details>
        </li>)}</ul>
      </details>
    </> : <button type="button" onClick={onReconnect} disabled={connecting}>{connecting ? '연결 중…' : '익명 사용자 다시 연결'}</button>}
    <p role="status">{message}</p>
  </section>;
}
