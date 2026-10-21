export type LearningEvent = { type: string; at: string; sequence: number; object: string | null };
export type HistoricalAnswer = {
  questionId: string; question: string; options: { id: string; text: string }[];
  correctOptions: string[]; selectedOption: string | null; isCorrect: boolean | null;
  points: number | null; explanation: string; submittedAt: string | null;
};
export type AttemptRecord = {
  id: string; visitor_id: string; visit_id: string; quiz_version_id: string; quiz_key: string;
  title: string; revision: number; is_test: boolean; mode: 'full' | 'review'; source_attempt_id: string | null;
  signature: string; first_choice: string | null; path: string; started_at: string; completed_at: string | null;
  completed: boolean; question_count: number; answered_count: number; correct_count: number;
  wrong_count: number; score: number; max_score: number; answers: HistoricalAnswer[]; events: LearningEvent[];
};
export type Comparison = {
  visitor_id: string; quiz_version_id: string; quiz_key: string; title: string; revision: number;
  mode: 'full' | 'review'; signature: string; attempts: number; question_count: number; max_score: number;
  first_correct: number; latest_correct: number; first_score: number; latest_score: number;
};
export type VisitRecord = { id: string; visitor_id: string; started_at: string; first_choice: string | null; events: LearningEvent[] };
export type LearningReport = {
  attempts: AttemptRecord[]; total: number; comparisons: Comparison[];
  paths: { path: string; participants: number; attempts: number; completed_attempts: number; completion_rate: number | null; accuracy: number | null }[];
  visits: VisitRecord[]; visitTotal: number; topics: { key: string; title: string }[];
};
export const pathNames: Record<string, string> = { cardnews: '카드뉴스 → 퀴즈', office: '사무실 → 퀴즈', unclassified: '직접 진입·미분류' };
export const eventNames: Record<string, string> = {
  visit_started: '방문 시작', first_choice: '첫 화면 선택', office_entered: '사무실 입장',
  office_object_opened: '사무실 물건 열기', cardnews_opened: '카드뉴스 열기', cardnews_last_slide: '카드뉴스 마지막 장',
  quiz_opened: '퀴즈 열기', quiz_started: '응시 시작', answer_submitted: '답안 제출', quiz_completed: '응시 완료',
};
export const choiceNames: Record<string, string> = {
  files: '서류·카드뉴스', pen: '펜·퀴즈', radio: '라디오', postit: '포스트잇', calendar: '달력',
  phone: '전화기', monitor: '모니터', notebook: '노트북',
};
export const modeName = (mode: string) => mode === 'review' ? '오답 복습' : '전체 응시';
export function answerText(answer: HistoricalAnswer, selected: string[] | null): string {
  if (selected === null) return '미응답';
  return selected.map(id => answer.options.find(option => option.id === id)?.text ?? id).join(' / ');
}
export class ReportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function dayBoundary(value: string | null, exclusiveEnd = false): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ReportError(400, '날짜 형식이 올바르지 않습니다.');
  const utc = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) throw new ReportError(400, '날짜를 확인해 주세요.');
  return new Date(utc.getTime() - 9 * 3600000 + (exclusiveEnd ? 86400000 : 0)).toISOString();
}
export function reportFilters(url: URL, admin: boolean) {
  const from = dayBoundary(url.searchParams.get('from'));
  const to = dayBoundary(url.searchParams.get('to'), true);
  if (from && to && from >= to) throw new ReportError(400, '시작일과 종료일을 확인해 주세요.');
  const path = url.searchParams.get('path') || null;
  if (path && !Object.hasOwn(pathNames, path)) throw new ReportError(400, '이용 경로를 확인해 주세요.');
  const topic = url.searchParams.get('topic') || null;
  if (topic && topic.length > 200) throw new ReportError(400, '주제를 확인해 주세요.');
  const page = Number(url.searchParams.get('page') || '0');
  if (!Number.isSafeInteger(page) || page < 0 || page > 1000000) throw new ReportError(400, '페이지를 확인해 주세요.');
  const csv = url.searchParams.get('format') === 'csv';
  return { p_admin: admin, p_from: from, p_to: to, p_topic: topic, p_path: path,
    p_limit: csv ? 10000 : 50, p_offset: csv ? 0 : page * 50 };
}
// Quote every cell and neutralize spreadsheet formulas, including whitespace-prefixed formulas.
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(report: LearningReport, visits = false): string {
  const timeline = (events: LearningEvent[]) => events.map(e => `${e.sequence}. ${e.at} ${eventNames[e.type] ?? e.type}${e.object ? ` (${choiceNames[e.object] ?? e.object})` : ''}`).join(' → ');
  const rows: unknown[][] = visits ? [
    ['방문 ID', '방문자 ID', '방문 시작(UTC)', '첫 화면 선택', '이벤트 순서', '이벤트 시각(UTC)', '이벤트', '물건'],
    ...report.visits.flatMap(v => (v.events.length ? v.events : [null]).map(e => [v.id, v.visitor_id, v.started_at,
      v.first_choice ? choiceNames[v.first_choice] ?? v.first_choice : '미수집', e?.sequence, e?.at, e ? eventNames[e.type] ?? e.type : '', e?.object])),
  ] : [
    ['응시 ID', '방문자 ID', '방문 ID', '주제', '퀴즈 버전 ID', '버전', '문제 구성', '유형', '원본 응시 ID', '시작(UTC)', '완료(UTC)', '완료 여부', '경로', '첫 선택', '문제 수', '응답 수', '정답', '오답', '점수', '만점', '문제 ID', '문제', '이전 답안', '정답 보기', '채점', '문항 점수', '답안 시각(UTC)', '이용 순서'],
    ...report.attempts.flatMap(a => a.answers.map(q => [a.id, a.visitor_id, a.visit_id, a.title, a.quiz_version_id, a.revision, a.signature,
      modeName(a.mode), a.source_attempt_id, a.started_at, a.completed_at, a.completed ? '완료' : '진행 중', pathNames[a.path],
      a.first_choice ? choiceNames[a.first_choice] ?? a.first_choice : '미수집', a.question_count, a.answered_count, a.correct_count, a.wrong_count,
      a.score, a.max_score, q.questionId, q.question, answerText(q, q.selectedOption?.split(',') ?? null), answerText(q, q.correctOptions),
      q.isCorrect === null ? '미응답' : q.isCorrect ? '정답' : '오답', q.points, q.submittedAt, timeline(a.events)])),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
