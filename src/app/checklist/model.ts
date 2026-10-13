// Labels and order verified in frontend:public/web/js/data/chapters.js.
export const topics = ['첫인상 & 대면', '업무 커뮤니케이션', '회의 & 응대', '오피스 룰', '근태 & 이직·퇴사', '경조사', '업무 보고 & 실수 대처'];
export type Row = {
  id: string | number; category: string | null; title: string | null;
  item1: string | null; item2: string | null; item3: string | null; item4: string | null; item5: string | null;
};
export const sameCategory = (a: string | null, b: string) => String(a || '').replace(/\s/g, '') === b.replace(/\s/g, '');
export const fields = ['item1', 'item2', 'item3', 'item4', 'item5'] as const;
export function groupsFor(rows: Row[], category: string) {
  return rows.filter(row => sameCategory(row.category, category)).map(row => ({
    id: row.id,
    title: row.title,
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
