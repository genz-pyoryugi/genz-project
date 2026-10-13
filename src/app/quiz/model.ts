export const topics = ['첫인상 & 대면', '업무 커뮤니케이션', '회의 & 응대', '오피스 룰', '근태 & 이직·퇴사', '경조사', '업무 보고 & 실수 대처'];
export type QuizRow = {
  id: string | number; category: string | null; question: string | null;
  option1: string | null; option2: string | null; option3: string | null; option4: string | null; option5: string | null;
  answer: string | null; explanation: string | null;
};
export type Question = { id: string | number; question: string; options: { text: string; originalIndex: number }[]; answer: number; explanation: string };
const normalize = (value: string | null) => String(value || '').replace(/\s/g, '');
export function parseRows(value: unknown): QuizRow[] {
  if (!Array.isArray(value) || !value.every(row => row && (typeof row.id === 'string' || typeof row.id === 'number') &&
    ['category', 'question', 'option1', 'option2', 'option3', 'option4', 'option5', 'answer', 'explanation'].every(field => row[field] === null || typeof row[field] === 'string'))) throw new Error('Invalid quiz response');
  return value;
}
// Same original-slot answer mapping and invalid-row filtering as frontend quiz.js.
export function questionsFor(rows: QuizRow[], category: string): Question[] {
  return rows.filter(row => normalize(row.category) === normalize(category)).flatMap(row => {
    const options = [row.option1, row.option2, row.option3, row.option4, row.option5]
      .flatMap((text, originalIndex) => typeof text === 'string' && text.trim() ? [{ text, originalIndex }] : []);
    const match = String(row.answer || '').trim().match(/^선택지\s*([1-5])$/);
    const answer = match ? options.findIndex(option => option.originalIndex === Number(match[1]) - 1) : -1;
    return typeof row.question === 'string' && row.question.trim() && options.length >= 2 && answer >= 0
      ? [{ id: row.id, question: row.question, options, answer, explanation: row.explanation || '' }] : [];
  });
}
