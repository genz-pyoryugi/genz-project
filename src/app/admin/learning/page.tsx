'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import LearningRecords from '@/components/LearningRecords';

export default function AdminLearningPage() {
  const client = useRef<SupabaseClient | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { Promise.resolve().then(() => { setError('Supabase 연결 설정이 필요합니다.'); setBusy(false); }); return; }
    // An operator login must never replace the learner's anonymous browser identity.
    const operator = createClient(url, key, { auth: { storageKey: 'genz.operator.auth.v1', storage: window.sessionStorage, detectSessionInUrl: false } });
    client.current = operator;
    let active = true;
    operator.auth.getSession().then(({ data }) => { if (active) { setSignedIn(!!data.session); setBusy(false); } });
    return () => { active = false; operator.auth.stopAutoRefresh(); };
  }, []);
  const getToken = useCallback(async () => {
    if (!client.current) throw new Error('Supabase 연결 설정이 필요합니다.');
    const { data, error } = await client.current.auth.getSession();
    if (error || !data.session) throw new Error('운영자 로그인이 만료됐습니다. 다시 로그인해 주세요.');
    return data.session.access_token;
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!client.current) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const result = await client.current.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) });
      if (result.error || !result.data.session) throw new Error('이메일과 비밀번호를 확인해 주세요.');
      const response = await fetch('/api/admin/learning', { cache: 'no-store', headers: { Authorization: `Bearer ${result.data.session.access_token}` } });
      if (!response.ok) { await client.current.auth.signOut({ scope: 'local' }); throw new Error((await response.json()).error || '운영자 권한을 확인해 주세요.'); }
      setSignedIn(true);
    } catch (e) { setError(e instanceof Error ? e.message : '로그인하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="lr-page" lang="ko"><section className="lr-shell lr-root"><header className="lr-shell-head"><span className="lr-brand">GEN Z QUIZ · ADMIN</span>{signedIn && <button className="lr-button" onClick={async () => { await client.current?.auth.signOut({ scope: 'local' }); setSignedIn(false); }}>로그아웃</button>}</header>
    {signedIn ? <LearningRecords admin getToken={getToken}/> : <form className="lr-login" onSubmit={login}><h2>운영자 로그인</h2><p className="lr-muted">Supabase에서 미리 지정한 운영자 계정으로 로그인하세요.</p><label>이메일<input name="email" type="email" autoComplete="username" required disabled={busy}/></label><label>비밀번호<input name="password" type="password" autoComplete="current-password" required disabled={busy}/></label><button className="lr-button" type="submit" disabled={busy}>{busy ? '연결 중…' : '로그인'}</button>{error && <p role="alert" className="lr-wrong">{error}</p>}<p className="lr-muted">이 화면에서는 가입하거나 운영자 권한을 신청할 수 없습니다. 운영자 지정은 Supabase 관리자가 직접 처리합니다.</p></form>}
  </section></main>;
}
