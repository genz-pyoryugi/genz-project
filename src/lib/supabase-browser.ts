'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;
let signingIn: Promise<string> | undefined;

export function browserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') throw new Error('Browser only');
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error('Supabase configuration missing');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      // Fail instead of silently switching an anonymous identity to volatile memory storage.
      storage: { getItem: name => localStorage.getItem(name), setItem: (name, value) => localStorage.setItem(name, value), removeItem: name => localStorage.removeItem(name) },
    } });
  }
  return client;
}

export async function ensureChecklistUser(): Promise<string> {
  if (signingIn) return signingIn;
  const connect = async () => {
    const probe = 'genz-checklist-session-storage-probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    const supabase = browserSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session.user.id;
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error('Anonymous session missing');
    // Do not claim durable identity if browser storage is unavailable.
    const restored = await supabase.auth.getSession();
    if (restored.error || restored.data.session?.user.id !== result.data.session.user.id) throw new Error('Session persistence failed');
    return result.data.session.user.id;
  };
  // Coordinate first-time signup across tabs, using a lock distinct from Auth's lock.
  const pending = (async () => navigator.locks ? await navigator.locks.request('genz-checklist-anonymous-signin', connect) : await connect())();
  signingIn = pending;
  try { return await pending; } finally { signingIn = undefined; }
}
