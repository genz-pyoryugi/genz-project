import extras from './quiz-bank.json';
import { chapters } from './data';
import type { QuizQuestion } from './quiz-store';

export const QUESTIONS_PER_ATTEMPT = 3;

export function localQuestionBank(chapter: number): QuizQuestion[] {
  return [
    ...chapters[chapter].topics.map((topic, position) => ({
      id: topic.art, chapter, position, version: 0, quiz: topic.quiz,
      answer: topic.answer, explanation: topic.explanation, source: topic.source,
    })),
    ...extras.filter(question => question.chapter === chapter).map(question => ({ ...question, version: 0 })),
  ];
}

// Only question IDs are remembered. No account data or answers are stored here.
export function selectQuizQuestions(pool: QuizQuestion[], chapter: number): QuizQuestion[] {
  if (pool.length < QUESTIONS_PER_ATTEMPT) throw new Error('출제할 문제가 부족해요. 잠시 후 다시 시도해 주세요.');
  const key = `calendar-quiz-last-v1-${chapter}`;
  let previous: string[] = [];
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    if (Array.isArray(stored)) previous = stored.filter((id): id is string => typeof id === 'string');
  } catch { /* Storage can be unavailable in a restricted browser. */ }
  const unseen = pool.filter(question => !previous.includes(question.id));
  const candidates = [...(unseen.length >= QUESTIONS_PER_ATTEMPT ? unseen : pool)];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const selected = candidates.slice(0, QUESTIONS_PER_ATTEMPT);
  if (selected.every((question, i) => question.id === previous[i])) selected.push(selected.shift()!);
  try { sessionStorage.setItem(key, JSON.stringify(selected.map(question => question.id))); } catch { /* Optional memory only. */ }
  return selected;
}
