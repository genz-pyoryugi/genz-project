// AI 팀장 시뮬레이션 결과를 Supabase public.simulation_attempts 에 저장 (서버 전용)
// 테이블: supabase/migrations/202610200003_simulation_attempts.sql
//  - 누가: 브라우저가 보낸 Supabase 익명 사용자 토큰(퀴즈 · SOS 와 같은 사용자)을 서버에서 확인한 user id
//  - 저장: SUPABASE_SECRET_KEY(service role)로만 — 브라우저는 이 표에 쓸 수 없다 (점수 위조 방지)
//  - 설정값이 없거나 토큰이 없거나 실패하면 저장만 건너뛰고, 결과 화면은 그대로 보여 준다
import { createClient } from '@supabase/supabase-js';

export type SimulationResult = {
  scenario_id: string; scenario_title: string; category: string;
  personality_key: string; personality_label: string;
  attempt: number; turns: number;
  learning_path: string; cardnews_completed_at: string | null; quiz_completed_at: string | null;
  situation_score: number | null; response_score: number | null; followup_score: number | null;
  total_score: number | null; previous_total: number | null;
  strengths: string[]; missed_points: string[];
  original_response: string; improved_response: string; comparison: string; fallback: boolean;
};

// 'saved' 저장됨 · 'skipped' 설정/토큰 없음 · 'error' 저장 실패
export async function saveSimulationResult(token: string | null, row: SimulationResult): Promise<'saved' | 'skipped' | 'error'> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey || !token) return 'skipped';
  try {
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const { data, error } = await createClient(url, publicKey, options).auth.getUser(token);
    if (error || !data.user) return 'error';
    const { error: insertError } = await createClient(url, secretKey, options)
      .from('simulation_attempts').insert({ ...row, user_id: data.user.id });
    return insertError ? 'error' : 'saved';
  } catch {
    return 'error';
  }
}
