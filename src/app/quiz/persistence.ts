import type { Quiz, Run } from './model';

export type AttemptIdentity = { id: string; quizId: string; visitId: string };
type QuizSnapshot = { quizId: string; run: Run; attempt: AttemptIdentity | null };
const key = (owner: string) => `genz.quiz.resume.v1.${owner}`;
export function saveQuiz(storage: Storage, owner: string, snapshot: QuizSnapshot): void {
  try { storage.setItem(key(owner), JSON.stringify(snapshot)); } catch { /* DB idempotency still applies when storage is disabled. */ }
}
export function saveQuizProgress(persistent: Storage, session: Storage, owner: string, snapshot: QuizSnapshot): void {
  saveQuiz(persistent, owner, snapshot);
  saveQuiz(session, owner, snapshot); // Fallback when durable storage is unavailable.
}
export function restoreQuizProgress(persistent: Storage, session: Storage, owner: string, quizzes: Quiz[]) {
  const saved = restoreQuiz(persistent, owner, quizzes) ?? restoreQuiz(session, owner, quizzes);
  if (saved) saveQuiz(persistent, owner, saved); // Carry existing tab-only progress into durable storage.
  return saved;
}
export function restoreQuiz(storage: Storage, owner: string, quizzes: Quiz[]): (QuizSnapshot & { topic: number }) | null {
  try {
    const snapshot = JSON.parse(storage.getItem(key(owner)) ?? 'null') as QuizSnapshot | null;
    if (!snapshot) return null;
    const topic = quizzes.findIndex(q => q.id === snapshot.quizId);
    if (topic < 0) return null; // Never resume against a different published version.
    const { run, attempt } = snapshot;
    if (!run || (run.reviewIds !== null && (!Array.isArray(run.reviewIds) || !run.sourceAttemptId))) return null;
    const ids = quizzes[topic].questions.map(q => q.id);
    if (run.reviewIds && (!run.reviewIds.length || run.reviewIds.some(id => !ids.includes(id)))) return null;
    const questions = quizzes[topic].questions.filter(q => !run.reviewIds || run.reviewIds.includes(q.id));
    if (!Number.isInteger(run.index) || run.index < 0 || run.index > questions.length || typeof run.graded !== 'boolean') return null;
    if (!Number.isInteger(run.score) || run.score < 0 || run.score > questions.length || !Array.isArray(run.wrongIds) || run.wrongIds.some(id => !questions.some(q => q.id === id))) return null;
    if (!Array.isArray(run.picked) || run.picked.some(index => !Number.isInteger(index) || index < 0 || index >= (questions[run.index]?.options.length ?? 0))) return null;
    const answers = run.answers ?? {};
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
    for (const [id, answer] of Object.entries(answers)) {
      const question = questions.find(q => q.id === id);
      if (!question || !answer || !Array.isArray(answer.selectedOptions) || typeof answer.correct !== 'boolean' ||
        answer.selectedOptions.some(option => !question.options.some(o => o.id === option))) return null;
    }
    if (attempt && (attempt.quizId !== snapshot.quizId || typeof attempt.id !== 'string' || typeof attempt.visitId !== 'string')) return null;
    return { ...snapshot, run: { ...run, answers }, topic };
  } catch { return null; }
}
