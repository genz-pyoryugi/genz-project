import { pageRange, sourceId } from '@/lib/checklist-core';
import { analyzePdf, fail, jsonBody, loadSource, requireOperator } from '@/lib/checklist-server';
export const runtime = 'nodejs';
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    requireOperator(request);
    const body = await jsonBody(request);
    const range = pageRange(body.start, body.end);
    const source = await loadSource(sourceId(body.sourceId));
    const result = await analyzePdf(source, range.start, range.end);
    return Response.json(result, { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { return fail(error); }
}
