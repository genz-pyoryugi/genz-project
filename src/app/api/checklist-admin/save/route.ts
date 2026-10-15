import { ChecklistError, pageRange, sourceId } from '@/lib/checklist-core';
import { fail, jsonBody, loadSource, requireOperator, saveChecklist } from '@/lib/checklist-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    requireOperator(request);
    const body = await jsonBody(request);
    if (body.reviewed !== true) throw new ChecklistError('원문과 생성 내용을 확인한 뒤 저장해 주세요.');
    const range = pageRange(body.start, body.end);
    const source = await loadSource(sourceId(body.sourceId));
    return Response.json(await saveChecklist(source, range.start, range.end, body.draft), { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { return fail(error); }
}
