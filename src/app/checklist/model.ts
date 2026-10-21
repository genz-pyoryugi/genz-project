// Fallback order matches the current Supabase categories; the page also loads live names.
export const topics = ['조직 이해·적응', '업무 절차·기준', '질문·소통', '협업·동료 존중', '직장 관계·예절', '근무·재택 수칙', '공용 공간·비품 관리'];
export type Row = {
  id: string | number; category: string | null; title: string | null;
  item1: string | null; item2: string | null; item3: string | null; item4: string | null; item5: string | null;
  source_url?: string | null;
  source_title?: string;
  source_pages?: number[];
  source_evidence?: string;
};
export const sameCategory = (a: string | null, b: string) => String(a || '').replace(/\s/g, '') === b.replace(/\s/g, '');
export const fields = ['item1', 'item2', 'item3', 'item4', 'item5'] as const;
export const visitKey = 'genz-checklist-last-visit-v1';
const categoryKey = (category: string | null) => String(category || '').replace(/\s/g, '');
export function selectVisitRows(rows: Row[], previous: Record<string, string>): Row[] {
  const categories = new Map<string, Row[]>();
  for (const row of rows) {
    if (!fields.some(field => typeof row[field] === 'string' && row[field]!.trim())) continue;
    const category = categoryKey(row.category);
    const candidates = categories.get(category) || [];
    candidates.push(row);
    categories.set(category, candidates);
  }
  return Array.from(categories, ([category, candidates]) => {
    const alternatives = candidates.filter(row => String(row.id) !== previous[category]);
    const pool = alternatives.length ? alternatives : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  });
}
export function rowsForVisit(rows: Row[]): Row[] {
  let previous: Record<string, string> = {};
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(visitKey) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      previous = Object.fromEntries(Object.entries(value).filter(([, id]) => typeof id === 'string'));
    }
  } catch { /* Selection still works when browser storage is unavailable. */ }
  const selected = selectVisitRows(rows, previous);
  try {
    sessionStorage.setItem(visitKey, JSON.stringify(Object.fromEntries(selected.map(row => [categoryKey(row.category), String(row.id)]))));
  } catch { /* Remembering the previous selection is optional. */ }
  return selected;
}
export function groupsFor(rows: Row[], category: string) {
  return rows.filter(row => sameCategory(row.category, category)).map(row => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url && /^https?:\/\//i.test(row.source_url) ? row.source_url : null,
    sourceTitle: row.source_title,
    sourcePages: row.source_pages,
    sourceEvidence: row.source_evidence,
    items: fields.flatMap(field => typeof row[field] === 'string' && row[field]!.trim()
      ? [{ key: `${row.id}:${field}:${row[field]}`, text: row[field]! }] : []),
  })).filter(group => group.items.length);
}
export function validateRows(value: unknown): Row[] {
  if (!Array.isArray(value) || !value.every(row => row && (typeof row.id === 'string' || typeof row.id === 'number') &&
    ['category', 'title', ...fields].every(field => row[field] === null || typeof row[field] === 'string'))) throw new Error('Invalid checklist response');
  return value;
}
export const storageKey = 'genz-checklist-page-v1';
export function readChecks(): Record<string, boolean> {
  const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([, checked]) => checked === true).map(([key]) => [key, true]));
}
