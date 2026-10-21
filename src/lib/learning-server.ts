import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { LearningReport, ReportError, reportCsv, reportFilters } from './learning-report';

// Public key + the verified caller's JWT. No service-role/secret key is used, even on the server.
export async function authorizeRecords(request: Request, admin: boolean): Promise<SupabaseClient> {
  return (await authorizeRecordContext(request, admin)).client;
}
export async function authorizeRecordContext(request: Request, admin: boolean) {
  const token = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) throw new ReportError(401, '로그인이 필요합니다.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ReportError(503, 'Supabase 연결 설정을 확인해 주세요.');
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const user = await verifyRecordUser(client, token, admin);
  return { client, user };
}
export async function verifyRecordUser(client: SupabaseClient, token: string, admin: boolean): Promise<User> {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ReportError(401, '로그인이 만료됐습니다. 다시 연결해 주세요.');
  if (admin) {
    if (data.user.is_anonymous) throw new ReportError(403, '지정된 운영자만 조회할 수 있습니다.');
    const role = await client.rpc('lt_is_admin');
    if (role.error) throw new ReportError(503, '운영자 권한을 확인하지 못했습니다. Supabase 연결과 학습 기록 SQL 적용 여부를 확인해 주세요.');
    if (role.data !== true) throw new ReportError(403, '지정된 운영자만 조회할 수 있습니다.');
  }
  return data.user;
}
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Authorization', 'X-Content-Type-Options': 'nosniff' };
// Dependency injection keeps the actual request boundary testable without production credentials.
export function recordsHandler(admin: boolean, authorize = authorizeRecords) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const client = await authorize(request, admin);
      const url = new URL(request.url);
      const filters = reportFilters(url, admin);
      const { data, error } = await client.rpc('lt_records', filters);
      if (error) throw new ReportError(error.code === '42501' ? 403 : 503,
        error.code === '42501' ? '기록 조회 권한이 없습니다.' : '기록을 불러오지 못했습니다. 연결 상태와 학습 기록 SQL 적용 여부를 확인해 주세요.');
      const report = data as LearningReport;
      if (url.searchParams.get('format') === 'csv') {
        const visits = url.searchParams.get('dataset') === 'visits';
        if ((visits ? report.visitTotal : report.total) > 10000) throw new ReportError(422, '한 번에 10,000건까지 내보낼 수 있습니다. 기간이나 주제를 좁혀 주세요.');
        return new Response(reportCsv(report, visits), { headers: { ...privateHeaders,
          'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="learning-${visits ? 'visits' : 'attempts'}.csv"` } });
      }
      return Response.json(report, { headers: privateHeaders });
    } catch (error) {
      return Response.json({ error: error instanceof ReportError ? error.message : '기록을 불러오지 못했습니다. 다시 시도해 주세요.' },
        { status: error instanceof ReportError ? error.status : 503, headers: privateHeaders });
    }
  };
}
