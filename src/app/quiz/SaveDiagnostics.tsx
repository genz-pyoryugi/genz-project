import type { SaveIssue, SaveStatus } from '@/lib/learning-client';

const labels: Record<string, string> = { quiz_started: '응시 시작', answer_submitted: '답안', quiz_completed: '응시 완료',
  quiz_progress: '진행 상태', quiz_abandoned: '응시 중단', visit_started: '방문 시작' };
export function failureReason(reason: string) {
  if (reason.includes('Attempt was abandoned')) return '이미 중단한 응시에 대한 요청이에요.';
  if (reason.includes('ownership mismatch')) return '응시·방문 정보가 현재 사용자와 일치하지 않아요.';
  if (reason.includes('Progress position mismatch')) return '문제 위치와 서버에 제출된 답안 수가 일치하지 않아요.';
  if (reason.includes('version mismatch') || reason.includes('membership mismatch')) return '문제 버전이나 복습 구성이 저장 기록과 달라요.';
  if (reason.includes('Answer already submitted') || reason.includes('Submitted answer is immutable')) return '이미 제출한 답과 다른 답을 저장하려던 요청이에요.';
  if (reason.includes('unanswered questions')) return '일부 답안이 아직 저장되지 않아 응시 완료 요청이 거절됐어요.';
  if (reason.includes('Invalid review source')) return '복습 원본 응시를 확인하지 못했어요.';
  if (reason.includes('Attempt is already complete')) return '이미 완료한 응시에 대한 추가 요청이에요.';
  if (reason.startsWith('23505')) return '이미 존재하는 기록과 중복된 요청이에요.';
  return '서버 검증에서 요청이 거절됐어요. 아래 오류 정보를 확인해 주세요.';
}
function groupIssues(issues: SaveIssue[]) {
  const groups = new Map<string, { issue: SaveIssue; count: number }>();
  for (const issue of issues) {
    const key = `${issue.type}:${issue.reason}`;
    const group = groups.get(key);
    groups.set(key, { issue, count: (group?.count || 0) + 1 });
  }
  return [...groups.entries()];
}
export default function SaveDiagnostics({ save }: { save: SaveStatus | null }) {
  const current = save?.issues || [], previous = save?.historicalIssues || [];
  if (!current.length && !previous.length) return null;
  return <details className="gq-save-diagnostics">
    <summary>저장 실패 내역 보기 · 현재 응시 {current.length}건 / 이전 기록 {previous.length}건</summary>
    <p>거절된 요청의 내역입니다. 현재 응시 저장 상태와 이전 기록의 실패를 구분해서 확인해 주세요.</p>
    {[[current, '현재 응시'], [previous, '이전 기록']].map(([raw, title]) => {
      const issues = raw as SaveIssue[];
      return issues.length ? <section key={title as string}><h3>{title as string}</h3><ul>{groupIssues(issues).map(([key, { issue, count }]) =>
        <li key={key}><b>{labels[issue.type] || '이용 기록'} · {count}건</b><p>{failureReason(issue.reason)}</p><code>{issue.reason.slice(0, 300)}</code></li>)}</ul></section> : null;
    })}
  </details>;
}
