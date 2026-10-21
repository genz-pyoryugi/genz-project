import { materialChecklists } from '@/lib/pdf-checklists';
import type { Row } from './model';

// Share mission identities so preview and live completions use the same records.
export const previewRows: Row[] = materialChecklists.map(checklist => ({
  id: `pdf:${checklist.id}`, category: checklist.category, title: checklist.title,
  item1: checklist.items[0], item2: checklist.items[1], item3: checklist.items[2], item4: checklist.items[3], item5: checklist.items[4],
  source_url: process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/genz-materials/${checklist.file}` : null,
  source_title: '관리자용에 연결된 PDF 자료', source_pages: checklist.pages, source_evidence: checklist.evidence,
}));
