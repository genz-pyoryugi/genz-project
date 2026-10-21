'use client';

import { useEffect, useRef, useState } from 'react';
import { browserSupabase, ensureChecklistUser } from '@/lib/supabase-browser';
import { cloudCompletions, completionError } from './cloud-completions';
import { readCompletions, type CompletedMission } from './completions';

export function useCompletionHistory() {
  const [history, setHistory] = useState<CompletedMission[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<CompletedMission[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);
  const [legacyError, setLegacyError] = useState('');
  const [migrationMessage, setMigrationMessage] = useState('');
  const owner = useRef<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const alive = useRef(false);
  const refreshRequest = useRef(0);

  async function refresh() {
    if (locked.current) return;
    const request = ++refreshRequest.current;
    setConnection('loading');
    try {
      const id = await ensureChecklistUser();
      if (!alive.current || request !== refreshRequest.current) return;
      if (owner.current !== id) {
        owner.current = id; generation.current++;
        setUserId(id); setHistory([]); setDeletedRecords([]); setMigrationMessage('');
      }
      const epoch = generation.current;
      const records = await cloudCompletions(browserSupabase(), id).list();
      if (!alive.current || epoch !== generation.current || request !== refreshRequest.current) return;
      setHistory(records); setError(''); setConnection('ready');
    } catch (cause) {
      if (!alive.current || request !== refreshRequest.current) return;
      setError(completionError(cause)); setConnection('error');
    }
  }

  useEffect(() => {
    alive.current = true;
    const client = browserSupabase();
    const updateLegacy = () => {
      try { setLegacyCount(readCompletions().length); setLegacyError(''); }
      catch { setLegacyError('기존 브라우저 기록을 읽지 못했어요. 원본은 변경하지 않았어요.'); }
    };
    const subscription = client.auth.onAuthStateChange((_event, session) => {
      // Never call an async Auth API inside this callback (Auth's session lock is held).
      const id = session?.user.id || null;
      if (owner.current !== null && owner.current !== id) {
        owner.current = null; generation.current++; refreshRequest.current++;
        locked.current = false;
        setHistory([]); setDeletedRecords([]); setUserId(null); setBusy(false); setMigrationMessage('');
        setConnection('error'); setError('사용자 연결이 변경됐어요. 다시 연결해 주세요.');
      }
    }).data.subscription;
    const initial = setTimeout(() => { updateLegacy(); void refresh(); }, 0);
    window.addEventListener('storage', updateLegacy);
    return () => {
      // These counters intentionally invalidate all outstanding async work on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      alive.current = false; generation.current++; refreshRequest.current++;
      clearTimeout(initial); subscription.unsubscribe(); window.removeEventListener('storage', updateLegacy);
    };
    // The lifecycle installs one subscription; current identity is tracked through refs.
  }, []);

  async function run(action: (store: ReturnType<typeof cloudCompletions>, current: () => boolean) => Promise<void>) {
    const id = owner.current;
    if (!id || locked.current || connection !== 'ready') return false;
    const epoch = generation.current;
    const current = () => alive.current && generation.current === epoch && owner.current === id;
    locked.current = true; setBusy(true); setError('');
    refreshRequest.current++; // Older reads cannot overwrite a confirmed write.
    try {
      await action(cloudCompletions(browserSupabase(), id), current);
      return current();
    } catch (cause) {
      if (current()) setError(completionError(cause));
      return false;
    } finally {
      if (current()) { locked.current = false; setBusy(false); }
    }
  }

  async function save(entry: CompletedMission) {
    return run(async (store, current) => {
      const saved = await store.save(entry);
      if (current()) {
        setHistory(previous => [saved, ...previous.filter(record => record.id !== saved.id)].sort((a,b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)));
        setDeletedRecords(previous => previous.filter(record => record.id !== saved.id));
      }
    });
  }
  async function remove(id: string) {
    return run(async (store, current) => {
      const entry = history.find(record => record.id === id);
      if (!entry) throw new Error('Record missing');
      await store.setDeleted([entry], true);
      if (current()) {
        setHistory(previous => previous.filter(record => record.id !== id));
        setDeletedRecords(previous => [...previous.filter(record => record.id !== id), entry]);
      }
    });
  }
  async function undo() {
    return run(async (store, current) => {
      // Confirm each restore independently so a partial network failure can safely be retried.
      for (const entry of deletedRecords) {
        await store.setDeleted([entry], false);
        if (current()) {
          setHistory(previous => [...previous.filter(record => record.id !== entry.id), entry].sort((a,b) => Date.parse(b.completedAt)-Date.parse(a.completedAt)));
          setDeletedRecords(previous => previous.filter(record => record.id !== entry.id));
        }
      }
    });
  }
  async function migrate() {
    return run(async (store, current) => {
      if (current()) setMigrationMessage('');
      await store.migrate(readCompletions());
      const records = await store.list();
      if (current()) {
        setHistory(records);
        setMigrationMessage('서버에서 이전을 확인했어요. 중복 기록과 이전에 삭제한 기록은 추가하지 않았고, 브라우저 원본도 그대로 보관했어요.');
      }
    });
  }

  return { history, deletedRecords, userId, connection, error, busy, legacyCount, legacyError, migrationMessage,
    refresh, save, remove, undo, migrate };
}
