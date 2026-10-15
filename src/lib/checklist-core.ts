export class ChecklistError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export type ChecklistItem = { text: string; page: number; evidence: string };
export type ChecklistDraft = { title: string; description: string; items: ChecklistItem[] };
export type Source = { id: number; title: string; category: string; url: string };
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_ANALYSIS_PAGES = 20;

export function pageRange(start: unknown, end: unknown) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || Number(start) < 1 || Number(end) < Number(start) || Number(end) - Number(start) + 1 > MAX_ANALYSIS_PAGES)
    throw new ChecklistError('PDF 페이지를 1부터 시작하는 번호로, 한 번에 20쪽 이내로 선택해 주세요.');
  return { start: Number(start), end: Number(end) };
}
export function sourceId(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new ChecklistError('자료를 다시 선택해 주세요.');
  return Number(value);
}
export function storagePdfUrl(value: string, supabaseUrl: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new ChecklistError('자료 주소가 올바르지 않아요.'); }
  const base = new URL(supabaseUrl);
  const prefix = '/storage/v1/object/public/genz-materials/';
  if (parsed.origin !== base.origin || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.startsWith(prefix)
      || !/^[a-zA-Z0-9_-]+\.pdf$/.test(parsed.pathname.slice(prefix.length)))
    throw new ChecklistError('이 프로젝트의 genz-materials에 공개된 PDF만 분석할 수 있어요.');
  return parsed.href;
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validateDraft(value: unknown, start: number, end: number): ChecklistDraft {
  if (!record(value) || !text(value.title, 120) || !text(value.description, 1200) || !Array.isArray(value.items) || value.items.length !== 5)
    throw new ChecklistError('체크리스트는 제목, 설명과 확인 항목 5개가 필요해요.');
  const items = value.items.map((item,index) => {
    if (!record(item) || !text(item.text, 250) || !text(item.evidence, 400))
      throw new ChecklistError(`미션 ${index+1}의 내용 또는 근거 설명이 비어 있거나 너무 길어요.`);
    if (!Number.isInteger(item.page) || Number(item.page) < start || Number(item.page) > end)
      throw new ChecklistError(`미션 ${index+1}의 근거 페이지가 선택한 ${start}~${end}쪽 범위를 벗어났어요.`);
    return { text: String(item.text).trim(), page: Number(item.page), evidence: String(item.evidence).trim() };
  });
  if (new Set(items.map(i => i.text)).size !== 5) throw new ChecklistError('중복된 확인 항목을 수정해 주세요.');
  return { title: String(value.title).trim(), description: String(value.description).trim(), items };
}
export const checklistSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string' }, description: { type: 'string' },
    items: { type: 'array', minItems: 5, maxItems: 5, items: {
      type: 'object', additionalProperties: false,
      properties: { text: { type: 'string' }, page: { type: 'integer' }, evidence: { type: 'string' } },
      required: ['text', 'page', 'evidence'],
    } },
  }, required: ['title', 'description', 'items'],
};
export function checklistSchemaForRange(start: number, end: number) {
  pageRange(start, end);
  return {
    ...checklistSchema,
    properties: {
      ...checklistSchema.properties,
      title: { type: 'string', pattern: '^.{1,16}$' },
      description: { type: 'string', pattern: '^.{1,28}$' },
      items: {
        ...checklistSchema.properties.items,
        items: {
          ...checklistSchema.properties.items.items,
          properties: {
            ...checklistSchema.properties.items.items.properties,
            text: { type: 'string', pattern: '^.{1,22}$' },
            evidence: { type: 'string', pattern: '^.{1,100}$' },
            page: {
              type: 'integer',
              enum: Array.from({ length: end-start+1 }, (_,i)=>start+i),
              description: 'Use SOURCE_PDF_PAGE from the added page margin, not the original printed page number.',
            },
          },
        },
      },
    },
  };
}
export function readAIResult(value: unknown, start: number, end: number) {
  if (!record(value) || value.status !== 'completed' || !Array.isArray(value.output)) throw new ChecklistError('AI 생성이 끝나지 않았어요. 페이지 범위를 줄여 다시 시도해 주세요.', 502);
  const messages = value.output.filter(record).filter(i => i.type === 'message');
  const content = messages.flatMap(i => Array.isArray(i.content) ? i.content.filter(record) : []);
  if (content.some(c => c.type === 'refusal')) throw new ChecklistError('이 자료로 체크리스트를 생성하지 못했어요.', 422);
  const output = content.filter(c => c.type === 'output_text').map(c => c.text).join('');
  let draft: unknown;
  try { draft = JSON.parse(output); }
  catch { throw new ChecklistError('AI 응답 형식을 읽지 못했어요. 다시 생성해 주세요.', 502); }
  try { return validateDraft(draft, start, end); }
  catch (error) { throw new ChecklistError(error instanceof ChecklistError ? error.message : '생성 결과를 확인하지 못했어요.', 502); }
}
