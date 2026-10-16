// Shape returned by public.lt_catalog(): the latest published revision of every quiz.
export type Choice = { id: string; text: string };
export type Question = {
  id: string; questionKey: string; revision: number; question: string;
  kind: 'single_choice' | 'multi_choice'; options: Choice[]; correctOption: string | null; correctOptions: string[] | null;
  hint: string | null; feedback: Record<string, string> | null; explanation: string; points: number;
};
export type Quiz = { id: string; title: string; isTest: boolean; revision: number; questions: Question[] };

export function parseCatalog(value: unknown): Quiz[] {
  if (!Array.isArray(value)) throw new Error('Invalid quiz catalog');
  return value.flatMap(raw => {
    const quiz = raw as Record<string, unknown>;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const valid = questions.filter((q): q is Question => !!q && typeof q.id === 'string' && typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      (typeof q.correctOption === 'string' || (Array.isArray(q.correctOptions) && q.correctOptions.length > 0)));
    return typeof quiz.id === 'string' && typeof quiz.title === 'string' && valid.length
      ? [{ id: quiz.id, title: quiz.title, isTest: quiz.isTest === true, revision: Number(quiz.revision), questions: valid }] : [];
  });
}
