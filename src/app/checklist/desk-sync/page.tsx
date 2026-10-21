'use client';
import { useEffect, useRef } from 'react';
import { usePersonalChecklists } from '../use-personal-checklists';
import type { PersonalPatch } from '../personal-store';

// The static office uses this same-origin bridge rather than creating a second Auth implementation.
export default function PersonalDeskSync() {
  const store = usePersonalChecklists();
  const current = useRef(store);
  useEffect(() => { current.current = store; }, [store]);
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: 'genz-personal:state', entries: store.entries,
      connection: store.connection, error: store.error, busy: store.busy }, window.location.origin);
  }, [store.entries, store.connection, store.error, store.busy]);
  useEffect(() => {
    const queue: MessageEvent[] = [];
    let processing = false, disposed = false;
    async function drain() {
      if (processing) return;
      processing = true;
      try {
        while (queue.length && !disposed) {
          const event = queue.shift()!;
          const snapshot = current.current;
          const entry = snapshot.entries.find(record => record.id === event.data.id);
          if (!entry || snapshot.connection !== 'ready') continue;
          let patch: PersonalPatch;
          if (event.data.action === 'toggle' && typeof event.data.itemId === 'string' && typeof event.data.checked === 'boolean') {
            patch = { items: entry.items.map(item => item.id === event.data.itemId ? { ...item, checked: event.data.checked } : item) };
          } else if (event.data.action === 'unpin') patch = { pinned: false };
          else if (event.data.action === 'position' && Number.isFinite(event.data.position?.x) && Number.isFinite(event.data.position?.y)) {
            patch = { position: { x: Math.max(0, Math.min(1, event.data.position.x)), y: Math.max(0, Math.min(1, event.data.position.y)) } };
          } else continue;
          const saved = await snapshot.update(entry, patch);
          // Update the queued writer immediately; React's render may not have committed yet.
          if (saved) current.current = { ...current.current, entries: current.current.entries.map(row => row.id === saved.id ? saved : row) };
          else queue.length = 0;
        }
      } finally { processing = false; }
    }
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== window.parent) return;
      if (event.data?.type === 'genz-personal:refresh') { void current.current.refresh(); return; }
      if (event.data?.type !== 'genz-personal:action' || typeof event.data.id !== 'string') return;
      queue.push(event); void drain();
    }
    window.addEventListener('message', receive);
    return () => { disposed = true; window.removeEventListener('message', receive); };
  }, []);
  return null;
}
