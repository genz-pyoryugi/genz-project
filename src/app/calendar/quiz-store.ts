import { getCalendarSupabase } from '@/lib/calendar-supabase';
import { selectQuizQuestions } from './quiz-selection';

export type QuizQuestion = {
  id: string;
  chapter: number;
  position: number;
  version: number;
  quiz: string;
  answer: boolean;
  explanation: string;
  source: string;
};

export type QuizAttempt = {
  id: string;
  chapter: number;
  score: number;
  total: number;
  completed_at: string;
  retry_of?: string | null;
  answers: {
    question_id: string;
    quiz: string;
    selected: boolean;
    correct: boolean;
    explanation: string;
  }[];
};

export async function loadQuizQuestions(chapter: number): Promise<QuizQuestion[]> {
  const client = getCalendarSupabase();
  if (!client) throw new Error('아직 온라인 저장이 연결되지 않았어요. 연습 퀴즈로 풀 수 있어요.');
  const { data, error } = await client.from('calendar_quiz_questions')
    .select('id,chapter,position,version,quiz,answer,explanation,source')
    .eq('chapter', chapter).eq('active', true).order('position');
  if (error || !data?.length) throw new Error('온라인 문제를 불러오지 못했어요. 지금은 연습 모드이며 기록은 저장되지 않아요.');
  if (!data.every(q => typeof q.id === 'string' && typeof q.quiz === 'string'
    && typeof q.answer === 'boolean' && typeof q.explanation === 'string'
    && typeof q.source === 'string' && Number.isInteger(q.version))) {
    throw new Error('문제 형식을 확인하지 못했어요. 지금은 연습 모드예요.');
  }
  return selectQuizQuestions(data, chapter);
}

export async function saveQuizAttempt(id: string, chapter: number, questions: QuizQuestion[], answers: boolean[], retryOf: string | null = null) {
  const client = getCalendarSupabase();
  if (!client) throw new Error('온라인 저장 연결이 필요해요.');
  const { data, error } = await client.rpc('submit_calendar_quiz', {
    p_attempt_id: id,
    p_chapter: chapter,
    p_responses: questions.map((q, i) => ({ question_id: q.id, version: q.version, selected: answers[i] })),
    ...(retryOf ? { p_retry_of: retryOf } : {}),
  });
  if (error?.code === 'PGRST202') throw new Error('퀴즈 저장 기능이 아직 설정되지 않았어요. 저장 설정을 확인한 뒤 다시 시도해 주세요.');
  if (error) throw new Error('저장하지 못했어요. 로그인 상태와 연결을 확인한 뒤 다시 시도해 주세요. 문제가 변경됐다면 새로 풀기를 눌러 주세요.');
  return data as QuizAttempt;
}

export async function loadQuizHistory(userId: string): Promise<QuizAttempt[]> {
  const client = getCalendarSupabase();
  if (!client) return [];
  const { data, error } = await client.from('calendar_quiz_attempts')
    .select('id,chapter,score,total,completed_at,answers').eq('user_id', userId)
    .order('completed_at', { ascending: false }).limit(20);
  if (error) throw new Error('저장된 풀이 기록을 불러오지 못했어요.');
  return data ?? [];
}
