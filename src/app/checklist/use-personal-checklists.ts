'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { browserSupabase, ensureChecklistUser } from '@/lib/supabase-browser';
import { personalChanged, personalError, personalStore, type PersonalChecklist, type PersonalItem, type PersonalPatch } from './personal-store';

export function usePersonalChecklists() {
  const [entries, setEntries] = useState<PersonalChecklist[]>([]);
  const [connection, setConnection] = useState<'loading'|'ready'|'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [identityVersion, setIdentityVersion] = useState(0);
  const owner = useRef<string | null>(null), epoch = useRef(0), request = useRef(0), alive = useRef(false), locked = useRef(false);
  const refresh = useCallback(async () => {
    if (locked.current) return;
    const token = ++request.current;
    try {
      const id = await ensureChecklistUser();
      if (!alive.current || token !== request.current) return;
      if (owner.current !== id) { owner.current = id; epoch.current++; setEntries([]); }
      const generation = epoch.current;
      const records = await personalStore(browserSupabase(), id).list();
      if (!alive.current || generation !== epoch.current || token !== request.current) return;
      setEntries(records); setConnection('ready'); setError('');
    } catch (cause) {
      if (alive.current && token === request.current) { setError(personalError(cause)); setConnection('error'); }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const sub = browserSupabase().auth.onAuthStateChange((_event, session) => {
      if (owner.current && owner.current !== session?.user.id) {
        owner.current = null; epoch.current++; request.current++; locked.current = false;
        setIdentityVersion(value => value + 1);
        setEntries([]); setBusy(false); setConnection('error'); setError('사용자 연결이 변경됐어요. 다시 연결해 주세요.');
      }
    }).data.subscription;
    const channel = new BroadcastChannel(personalChanged);
    channel.onmessage = () => void refresh();
    const focus = () => void refresh();
    const timer = setTimeout(focus, 0);
    window.addEventListener('focus', focus);
    return () => {
      // Invalidate in-flight requests on unmount; these refs are generation counters, not DOM refs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      alive.current = false; epoch.current++; request.current++;
      clearTimeout(timer); channel.close(); sub.unsubscribe(); window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  async function run(action: (store: ReturnType<typeof personalStore>) => Promise<PersonalChecklist>) {
    const id = owner.current, generation = epoch.current;
    if (!id || locked.current || connection !== 'ready') return null;
    const current = () => alive.current && owner.current === id && generation === epoch.current;
    locked.current = true; request.current++; setBusy(true); setError('');
    try {
      const saved = await action(personalStore(browserSupabase(), id));
      if (!current()) return null;
      setEntries(previous => [saved, ...previous.filter(entry => entry.id !== saved.id)].filter(entry => !entry.deleted_at));
      const channel = new BroadcastChannel(personalChanged); channel.postMessage('refresh'); channel.close();
      return saved;
    } catch (cause) {
      if (current()) setError(personalError(cause));
      return null;
    } finally { if (current()) { locked.current = false; setBusy(false); } }
  }
  const create = (title: string, items: PersonalItem[]) => run(store => store.create(title, items));
  const update = (entry: PersonalChecklist, patch: PersonalPatch) => run(store => store.update(entry, patch));
  return { entries, connection, error, busy, identityVersion, refresh, create, update };
}
