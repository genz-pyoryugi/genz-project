import type { Row } from './model';

export type DeskNote = {
  id: string;
  kind: 'checklist' | 'completed';
  category: string;
  title: string;
  rowId: string;
  items: { key: string; text: string }[];
  sourceUrl: string | null;
  sourceTitle?: string;
  sourcePages?: number[];
  sourceEvidence?: string;
  recordId?: string;
};
export const deskNotesKey = 'genz-office-desk-notes-v1';
export function readDeskNotes(): DeskNote[] {
  const value: unknown = JSON.parse(localStorage.getItem(deskNotesKey) || '[]');
  if (!Array.isArray(value) || !value.every(note => note && typeof note === 'object' &&
    typeof note.id === 'string' && ['checklist','completed'].includes(note.kind) &&
    typeof note.category === 'string' && typeof note.title === 'string' && typeof note.rowId === 'string' &&
    Array.isArray(note.items) && note.items.length > 0 && note.items.every((item: {key?: unknown; text?: unknown} | null) => item && typeof item.key === 'string' && typeof item.text === 'string') &&
    (note.sourceUrl === null || (typeof note.sourceUrl === 'string' && /^https?:\/\//i.test(note.sourceUrl))) &&
    (note.sourceTitle === undefined || typeof note.sourceTitle === 'string') &&
    (note.sourceEvidence === undefined || typeof note.sourceEvidence === 'string') &&
    (note.sourcePages === undefined || (Array.isArray(note.sourcePages) && note.sourcePages.every((page: unknown) => Number.isInteger(page) && Number(page)>0))) &&
    (note.recordId === undefined || typeof note.recordId === 'string'))) throw new Error('Invalid desk notes');
  return value as DeskNote[];
}
export function saveDeskNote(note: DeskNote): void {
  const previous = readDeskNotes();
  const index = previous.findIndex(item => item.id === note.id);
  const next = [...previous];
  if (index < 0) next.push(note); else next[index] = note;
  localStorage.setItem(deskNotesKey, JSON.stringify(next));
}
export function deskNoteRow(note: DeskNote): Row {
  const item=(field:string)=>note.items.find(entry=>entry.key.startsWith(`${note.rowId}:${field}:`))?.text||null;
  return {id:note.rowId,category:note.category,title:note.title,
    item1:item('item1'),item2:item('item2'),item3:item('item3'),item4:item('item4'),item5:item('item5'),
    source_url:note.sourceUrl,source_title:note.sourceTitle,source_pages:note.sourcePages,source_evidence:note.sourceEvidence};
}
