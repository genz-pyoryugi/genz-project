import type { groupsFor } from './model';

type Group = ReturnType<typeof groupsFor>[number];
export type CompletedMission = {
  id: string;
  category: string;
  completedAt: string;
  groups: {
    id: string;
    title: string;
    items: { key: string; text: string }[];
    sourceUrl: string | null;
    sourceTitle?: string;
    sourcePages?: number[];
  }[];
};
export const completionsKey = 'genz-checklist-completions-v1';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function completionId(category: string, groups: Group[], date = new Date()): string {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  return JSON.stringify([day, category, groups.map(group => [String(group.id), group.title, group.items.map(item => [item.key, item.text])])]);
}
export function readCompletions(): CompletedMission[] {
  const value: unknown = JSON.parse(localStorage.getItem(completionsKey) || '[]');
  return parseCompletions(value);
}
export function parseCompletions(value: unknown): CompletedMission[] {
  if (!Array.isArray(value) || !value.every(entry => record(entry) && typeof entry.id === 'string' &&
    typeof entry.category === 'string' && typeof entry.completedAt === 'string' && Number.isFinite(Date.parse(entry.completedAt)) &&
    Array.isArray(entry.groups) && entry.groups.length && entry.groups.every(group => record(group) &&
      typeof group.id === 'string' && typeof group.title === 'string' &&
      (group.sourceUrl === null || (typeof group.sourceUrl === 'string' && /^https?:\/\//i.test(group.sourceUrl))) &&
      (group.sourceTitle === undefined || typeof group.sourceTitle === 'string') &&
      (group.sourcePages === undefined || (Array.isArray(group.sourcePages) && group.sourcePages.every(page => Number.isInteger(page) && Number(page) > 0))) &&
      Array.isArray(group.items) && group.items.length && group.items.every(item => record(item) && typeof item.key === 'string' && typeof item.text === 'string')))) {
    throw new Error('Invalid completion history');
  }
  return value as CompletedMission[];
}
export function saveCompletion(category: string, groups: Group[], checked: Record<string, boolean>, date = new Date()): CompletedMission[] {
  const entry = createCompletion(category, groups, checked, date);
  const history = readCompletions();
  if (history.some(saved => saved.id === entry.id)) return history;
  const next = [entry, ...history];
  localStorage.setItem(completionsKey, JSON.stringify(next));
  return next;
}
// A snapshot without a storage side effect, shared by cloud saves and legacy tests.
export function createCompletion(category: string, groups: Group[], checked: Record<string, boolean>, date = new Date()): CompletedMission {
  if (!groups.length || groups.some(group => !group.items.length || group.items.some(item => !checked[item.key]))) {
    throw new Error('Complete every item before saving');
  }
  const id = completionId(category, groups, date);
  const entry: CompletedMission = {
    id, category, completedAt: date.toISOString(),
    groups: groups.map(group => ({
      id: String(group.id), title: group.title || '오늘의 작은 미션',
      items: group.items.map(item => ({ ...item })), sourceUrl: group.sourceUrl,
      ...(group.sourceTitle ? { sourceTitle: group.sourceTitle } : {}),
      ...(group.sourcePages ? { sourcePages: [...group.sourcePages] } : {}),
    })),
  };
  return entry;
}
export function deleteCompletion(id: string): { history: CompletedMission[]; removed?: CompletedMission } {
  const history = readCompletions();
  const removed = history.find(entry => entry.id === id);
  if (!removed) return { history };
  const next = history.filter(entry => entry.id !== id);
  localStorage.setItem(completionsKey, JSON.stringify(next));
  return { history: next, removed };
}
export function restoreCompletions(entries: CompletedMission[]): CompletedMission[] {
  const history = readCompletions();
  const existing = new Set(history.map(entry => entry.id));
  const restored = entries.filter(entry => !existing.has(entry.id));
  const next = [...history, ...restored].sort((a,b) => Date.parse(b.completedAt)-Date.parse(a.completedAt));
  localStorage.setItem(completionsKey, JSON.stringify(next));
  return next;
}
