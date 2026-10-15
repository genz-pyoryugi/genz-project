import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Matches frontend's /api/[table] checklists configuration and ordering.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('id,category,title,item1,item2,item3,item4,item5,description,source_url')
      .eq('status', '완료')
      .order('id', { ascending: true });
    if (error) {
      console.error('checklists query failed:', error.code || 'connection');
      return NextResponse.json({ error: '체크리스트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
    }
    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: '데이터 연결을 확인해 주세요.' }, { status: 502 });
  }
}
