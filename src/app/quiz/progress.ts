import { Quiz, Run, runQuestions } from './model';
import { AttemptIdentity, restoreQuiz, restoreQuizProgress } from './persistence';

export type Draft = {
  quizId: string; quizKey: string; quizRevision: number; questionIds: string[]; questionRevisions: number[];
  attempt: AttemptIdentity; run: Run; state: 'active' | 'completed' | 'abandoned'; changedAt: string;
};
type Book = { last: string | null; parts: Record<string, Draft>; archived: Record<string, Draft> };
const key = (owner: string) => `genz.quiz.parts.v2.${owner}`;
export const partKey = (quiz: Quiz) => quiz.quizKey || quiz.title;
function read(storage: Storage, owner: string): Book {
  try {
    const value = JSON.parse(storage.getItem(key(owner)) || 'null');
    if (value && typeof value.parts === 'object' && value.parts && !Array.isArray(value.parts) &&
      typeof value.archived === 'object' && value.archived && !Array.isArray(value.archived)) return value;
  } catch { /* Disabled or corrupted browser storage. */ }
  return { last: null, parts: {}, archived: {} };
}
export function makeDraft(quiz: Quiz, run: Run, attempt: AttemptIdentity): Draft {
  return { quizId: quiz.id, quizKey: partKey(quiz), quizRevision: quiz.revision,
    questionIds: quiz.questions.map(q => q.id), questionRevisions: quiz.questions.map(q => q.revision),
    attempt, run, state: run.index >= runQuestions(quiz.questions, run).length ? 'completed' : 'active', changedAt: new Date().toISOString() };
}
export function writeDraft(storage: Storage, owner: string, draft: Draft): boolean {
  try {
    const book = read(storage, owner);
    if (draft.state === 'abandoned') {
      book.archived[draft.attempt.id] = draft;
      if (book.parts[draft.quizKey]?.attempt?.id === draft.attempt.id) delete book.parts[draft.quizKey];
    } else { book.parts[draft.quizKey] = draft; book.last = draft.quizKey; }
    storage.setItem(key(owner), JSON.stringify(book)); return true;
  } catch { return false; }
}
export function drafts(storage: Storage, owner: string) { return read(storage, owner); }
export function draftFor(storage: Storage, owner: string, quiz: Quiz) {
  const book = read(storage, owner);
  return book.parts[partKey(quiz)] || Object.values(book.parts).find(d => d?.quizId === quiz.id || d?.quizKey === quiz.title) || null;
}
export function canResume(draft: Draft, quiz: Quiz): boolean {
  if (!draft || !draft.attempt || draft.state === 'abandoned' || draft.quizId !== quiz.id ||
    draft.quizRevision !== quiz.revision || draft.attempt.quizId !== quiz.id ||
    JSON.stringify(draft.questionIds) !== JSON.stringify(quiz.questions.map(q => q.id)) ||
    JSON.stringify(draft.questionRevisions) !== JSON.stringify(quiz.questions.map(q => q.revision))) return false;
  const restored = restoreQuiz({ getItem: () => JSON.stringify(draft) } as unknown as Storage, 'check', [quiz]);
  if (!restored) return false;
  const run = restored.run, questions = runQuestions(quiz.questions, run);
  if (run.graded && run.index >= questions.length) return false;
  if (questions[run.index]?.kind === 'single_choice' && run.picked.length > 1) return false;
  const submitted = questions.slice(0, run.index + (run.graded ? 1 : 0));
  if (Object.keys(run.answers).length !== submitted.length) return false;
  for (const q of submitted) {
    const answer = run.answers[q.id];
    if (!answer || !answer.selectedOptions.length || new Set(answer.selectedOptions).size !== answer.selectedOptions.length) return false;
    if (q.kind === 'single_choice' && answer.selectedOptions.length !== 1) return false;
    const right = q.kind === 'multi_choice' ? q.correctOptions || [] : [q.correctOption];
    const correct = right.length === answer.selectedOptions.length && right.every(id => id && answer.selectedOptions.includes(id));
    if (answer.correct !== correct) return false;
  }
  const wrong = submitted.filter(q => !run.answers[q.id].correct).map(q => q.id);
  if (run.score !== submitted.length - wrong.length || JSON.stringify(run.wrongIds) !== JSON.stringify(wrong)) return false;
  if (run.graded && JSON.stringify([...run.picked.map(i => questions[run.index].options[i].id)].sort()) !==
    JSON.stringify([...run.answers[questions[run.index].id].selectedOptions].sort())) return false;
  return true;
}
export function hasWork(draft: Draft) {
  return draft.run.index < (draft.run.reviewIds?.length ?? draft.questionIds.length) &&
    (draft.run.picked.length > 0 || Object.keys(draft.run.answers).length > 0 || draft.run.index > 0);
}
export function importLegacy(storage: Storage, session: Storage, owner: string, quizzes: Quiz[], newId: () => string, visitId: string) {
  if (read(storage, owner).last) return;
  const old = restoreQuizProgress(storage, session, owner, quizzes);
  if (!old) return;
  const quiz = quizzes[old.topic];
  if (draftFor(storage, owner, quiz)) return;
  const draft = makeDraft(quiz, old.run, old.attempt || { id: newId(), quizId: quiz.id, visitId });
  writeDraft(storage, owner, draft); // Preserve insufficient legacy data so the UI can explain why it cannot resume.
}
