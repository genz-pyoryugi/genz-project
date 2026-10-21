export type SaveIssue = { attemptId: string | null; type: string; at: string; reason: string };
export type SaveStatus = { state: 'saved' | 'pending' | 'error' | 'unconfigured'; message: string; issues?: SaveIssue[]; historicalIssues?: SaveIssue[] };
export type Tracker = {
  catalog(): Promise<unknown>; record(type: string, fields?: Record<string, unknown>): void;
  newId(): string; currentVisitId(): string; identity(): Promise<{ id: string; token: string }>;
  supportsHistory(): Promise<boolean>;
  progress(): Promise<unknown>;
  cachedOwner(): string | null;
  pendingAttempt(id: string): boolean;
  statusFor(attemptId: string | null): SaveStatus;
  retry(): Promise<void>; subscribe(fn: (status: SaveStatus) => void): () => void;
};
declare global { interface Window { genzTracker?: Tracker; supabase?: unknown } }
const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) scripts.set(src, new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.dataset.lt = src;
    el.onload = () => resolve();
    el.onerror = () => { scripts.delete(src); el.remove(); reject(new Error('기록 연결에 실패했습니다.')); };
    document.head.appendChild(el);
  }));
  return scripts.get(src)!;
}
export async function getTracker(): Promise<Tracker> {
  try { if (window.parent !== window && window.parent.genzTracker) return window.parent.genzTracker; } catch { /* cross-origin */ }
  if (!window.genzTracker) { await loadScript('/vendor/supabase.js'); await loadScript('/tracking/learning-tracker.js'); }
  if (!window.genzTracker) throw new Error('기록 연결에 실패했습니다.');
  return window.genzTracker;
}
export async function learnerToken(): Promise<string> {
  const tracker = await getTracker();
  await tracker.retry();
  return (await tracker.identity()).token;
}
