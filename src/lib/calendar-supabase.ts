import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let signingIn: Promise<Session> | null = null;

// Lazy initialization keeps the local calendar usable before deployment is configured.
export function getCalendarSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

// Reuse the project's default persisted session, including an existing quiz session.
// Share one pending request to avoid creating two anonymous accounts in Strict Mode.
export function ensureCalendarSession(): Promise<Session> {
  if (signingIn) return signingIn;
  signingIn = (async () => {
    const supabase = getCalendarSupabase();
    if (!supabase) throw new Error('아직 온라인 저장이 연결되지 않았어요. 지금은 연습 모드예요.');
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error('기존 사용자 연결을 확인하지 못했어요. 다시 연결해 주세요.');
    if (existing.session) return existing.session;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw new Error('익명 로그인에 실패했어요. 연결 상태와 Supabase 익명 로그인 설정을 확인해 주세요.');
    return data.session;
  })().finally(() => { signingIn = null; });
  return signingIn;
}
