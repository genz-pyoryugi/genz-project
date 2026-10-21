import reviewed from './learning-item-review.json';
import type { Question } from './model';

export type SubmittedAnswers = Record<string, { selectedOptions: string[]; correct: boolean }>;
export type LearningItem = {
  id: string; label: string; description: string; review: string;
  optionIds?: string[]; wrongOptionIds?: string[]; sharedOption?: boolean;
};
type ReviewedQuestion = {
  quizVersionId: string; questionVersionId: string; revision: number; content: string; items: LearningItem[];
};
export const reviewedQuestions: Record<string, ReviewedQuestion> = reviewed;
export const correctOptions = (q: Question): string[] => q.kind === 'multi_choice' ? q.correctOptions ?? [] : q.correctOption ? [q.correctOption] : [];
export const questionContent = (q: Question): string => JSON.stringify([
  q.question, q.kind, q.options.map(o => [o.id, o.text]), correctOptions(q).slice().sort(),
]);
export function learningItems(quizId: string, question: Question): LearningItem[] {
  const mapping = reviewedQuestions[question.questionKey];
  return mapping?.quizVersionId === quizId && mapping.questionVersionId === question.id &&
    mapping.revision === question.revision && mapping.content === questionContent(question) ? mapping.items : [];
}
export type Evidence = {
  question: Question; number: number; selected: string[]; correct: boolean;
  relevantMistakes: string[]; item: LearningItem;
};
export type ItemFeedback = {
  id: string; label: string; evidence: Evidence[]; right: Evidence[]; wrong: Evidence[];
  state: 'understood' | 'review' | 'mixed'; improved: Evidence[]; recheck: Evidence[];
};
function assess(questions: Question[], quizId: string, answers: SubmittedAnswers): Evidence[] {
  return questions.flatMap((question, index) => {
    const answer = answers[question.id];
    // Missing earlier browser state is not reconstructed from the aggregate score/wrong IDs.
    if (!answer?.selectedOptions.length || new Set(answer.selectedOptions).size !== answer.selectedOptions.length ||
      answer.selectedOptions.some(id => !question.options.some(option => option.id === id))) return [];
    if (question.kind !== 'multi_choice' && answer.selectedOptions.length !== 1) return [];
    const selected = answer.selectedOptions;
    const expected = correctOptions(question);
    const correct = selected.length === expected.length && expected.every(id => selected.includes(id));
    const mistakes = question.options.filter(option => selected.includes(option.id) !== expected.includes(option.id)).map(option => option.id);
    return learningItems(quizId, question).flatMap(item => {
      const relevantMistakes = question.kind === 'multi_choice' && item.optionIds
        ? mistakes.filter(id => item.optionIds!.includes(id))
        : item.wrongOptionIds ? selected.filter(id => item.wrongOptionIds!.includes(id)) : mistakes;
      // A wrong multi-answer question is not evidence that all of its learning items were misunderstood.
      // Nor is a partially matching selection counted as a correctly answered question.
      if (!correct && !relevantMistakes.length) return [];
      return [{ question, number: index + 1, selected, correct, relevantMistakes, item }];
    });
  });
}
export function buildLearningFeedback(questions: Question[], quizId: string, answers: SubmittedAnswers, previous?: SubmittedAnswers): ItemFeedback[] {
  const evidence = assess(questions, quizId, answers);
  const prior = new Map((previous ? assess(questions, quizId, previous) : []).map(e => [`${e.item.id}:${e.question.id}`, e]));
  const groups = new Map<string, Evidence[]>();
  for (const entry of evidence) groups.set(entry.item.id, [...(groups.get(entry.item.id) ?? []), entry]);
  return Array.from(groups, ([id, items]) => {
    const right = items.filter(e => e.correct), wrong = items.filter(e => !e.correct);
    return { id, label: items[0].item.label, evidence: items, right, wrong,
      state: wrong.length ? right.length ? 'mixed' : 'review' : 'understood',
      improved: right.filter(e => prior.get(`${id}:${e.question.id}`)?.correct === false),
      recheck: wrong.filter(e => prior.get(`${id}:${e.question.id}`)?.correct === true) };
  });
}
export function confusionFeedback(evidence: Evidence): { option: string; message: string; omitted: boolean }[] {
  const { question, selected } = evidence;
  if (evidence.correct) return [];
  const ids = question.kind === 'multi_choice' ? evidence.relevantMistakes : selected;
  return ids.map(id => ({ option: question.options.find(o => o.id === id)?.text ?? id,
    message: question.feedback?.[id] || question.explanation,
    omitted: !selected.includes(id) }));
}
export type ComparableAttempt = {
  id: string; quiz_version_id: string; mode: 'full' | 'review'; signature: string;
  started_at: string; completed: boolean;
  answers: { questionId: string; selectedOption: string | null; isCorrect: boolean | null }[];
};
export function submittedAnswers(attempt: ComparableAttempt): SubmittedAnswers {
  return Object.fromEntries(attempt.answers.filter(a => a.selectedOption !== null && a.isCorrect !== null)
    .map(a => [a.questionId, { selectedOptions: a.selectedOption!.split(','), correct: a.isCorrect! }]));
}
export function matchingAttempt(attempt: ComparableAttempt, questions: Question[], quizId: string, mode: 'full' | 'review'): boolean {
  const ids = questions.map(q => q.id).join(',');
  return attempt.completed && attempt.quiz_version_id === quizId && attempt.mode === mode && attempt.signature === ids &&
    attempt.answers.map(a => a.questionId).join(',') === ids && Object.keys(submittedAnswers(attempt)).length === questions.length;
}
export function comparableAttempt(current: ComparableAttempt, previous: ComparableAttempt, questions: Question[], quizId: string, mode: 'full' | 'review'): boolean {
  const before = Date.parse(previous.started_at), now = Date.parse(current.started_at);
  return current.id !== previous.id && matchingAttempt(current, questions, quizId, mode) && matchingAttempt(previous, questions, quizId, mode) &&
    (before < now || (before === now && previous.id < current.id));
}
