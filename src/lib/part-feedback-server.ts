import { authorizeRecordContext } from './learning-server';
import { ReportError } from './learning-report';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization', 'X-Content-Type-Options': 'nosniff' };
const fields = 'id,quiz_version_id,mode,signature,started_at,completed,answers';
export function partFeedbackHandler(authorize = (request: Request) => authorizeRecordContext(request, false)) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const { client, user } = await authorize(request);
      const id = new URL(request.url).searchParams.get('attempt');
      if (!id || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new ReportError(400, '응시 정보를 확인해 주세요.');
      const result = await client.from('lt_learning_records').select(fields).eq('visitor_id', user.id).eq('id', id).maybeSingle();
      if (result.error) throw new ReportError(503, '저장된 답안을 불러오지 못했습니다. 기록 연결 상태를 확인해 주세요.');
      const current = result.data;
      if (!current) throw new ReportError(404, '이번 응시의 저장된 답안을 아직 확인할 수 없어요. 저장이 끝난 뒤 다시 확인해 주세요.');
      if (!current.completed) throw new ReportError(409, '응시 결과 저장이 끝난 뒤 이전 답안과 비교할 수 있어요.');
      // Explicit self filter also applies to operators using the learner view. No caller-selected visitor/version.
      const previous = await client.from('lt_learning_records').select(fields)
        .eq('visitor_id', user.id).eq('quiz_version_id', current.quiz_version_id)
        .eq('mode', current.mode).eq('signature', current.signature).eq('completed', true)
        .or(`started_at.lt.${current.started_at},and(started_at.eq.${current.started_at},id.lt.${current.id})`)
        .order('started_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
      if (previous.error) throw new ReportError(503, '이전 응시를 불러오지 못했습니다. 이번 답안의 피드백은 계속 확인할 수 있어요.');
      return Response.json({ current, previous: previous.data }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof ReportError ? error.message : '이전 응시를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.' },
        { status: error instanceof ReportError ? error.status : 503, headers });
    }
  };
}
