import { database, fail, requireOperator } from '@/lib/checklist-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    requireOperator(request);
    const db = database();
    const [categories, sources, checklists] = await Promise.all([
      db.from('categories').select('id,name,description').order('id'),
      db.from('contents').select('id,title,category,url').order('id'),
      db.from('checklists').select('id,category,title,item1,item2,item3,item4,item5,description,source_url,status').eq('status','완료').order('id'),
    ]);
    if (sources.error || checklists.error) return Response.json({ error: 'Supabase 조회에 실패했어요. 테이블 열과 읽기 권한을 확인해 주세요.' }, { status: 502 });
    // RLS may hide categories while already-public contents still supplies the current names.
    const fallback = [...new Set((sources.data || []).map(row=>row.category).filter((name): name is string => typeof name === 'string' && !!name.trim()))]
      .map((name,index)=>({id:index+1,name,description:''}));
    const topics = !categories.error && categories.data?.length ? categories.data : fallback;
    return Response.json({ categories: topics, sources: sources.data, checklists: checklists.data, configured: {
      ai: !!process.env.OPENAI_API_KEY,
      save: !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    } }, { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { return fail(error); }
}
