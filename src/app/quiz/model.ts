// Shape returned by public.lt_catalog(): the latest published revision of every quiz.
export type Choice = { id: string; text: string };
export type Question = {
  id: string; questionKey: string; revision: number; question: string;
  kind: 'single_choice' | 'multi_choice'; options: Choice[]; correctOption: string | null; correctOptions: string[] | null;
  hint: string | null; feedback: Record<string, string> | null; explanation: string; points: number;
};
export type Quiz = { id: string; quizKey?: string; title: string; isTest: boolean; revision: number; questions: Question[] };

export type Run = {
  index: number; picked: number[]; graded: boolean; score: number;
  reviewIds: string[] | null; wrongIds: string[]; sourceAttemptId: string | null;
  answers: Record<string, { selectedOptions: string[]; correct: boolean }>;
};
export const freshRun = (reviewIds: string[] | null = null, sourceAttemptId: string | null = null): Run => ({
  index: 0, picked: [], graded: false, score: 0, reviewIds, wrongIds: [], sourceAttemptId, answers: {},
});
export const runQuestions = (questions: Question[], run: Run): Question[] =>
  run.reviewIds === null ? questions : questions.filter(question => run.reviewIds!.includes(question.id));
export function gradeRun(run: Run, questionId: string, right: boolean, selectedOptions: string[] = []): Run {
  if (run.graded) return run;
  return { ...run, graded: true, score: run.score + (right ? 1 : 0),
    wrongIds: right ? run.wrongIds : [...run.wrongIds, questionId],
    answers: { ...run.answers, [questionId]: { selectedOptions: [...selectedOptions], correct: right } } };
}

export function parseCatalog(value: unknown): Quiz[] {
  if (!Array.isArray(value)) throw new Error('Invalid quiz catalog');
  return value.flatMap(raw => {
    const quiz = raw as Record<string, unknown>;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const valid = questions.filter((q): q is Question => !!q && typeof q.id === 'string' && typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      (typeof q.correctOption === 'string' || (Array.isArray(q.correctOptions) && q.correctOptions.length > 0)));
    return typeof quiz.id === 'string' && typeof quiz.title === 'string' && valid.length
      ? [{ id: quiz.id, quizKey: typeof quiz.quizKey === 'string' ? quiz.quizKey : undefined, title: quiz.title, isTest: quiz.isTest === true, revision: Number(quiz.revision), questions: valid }] : [];
  });
}
