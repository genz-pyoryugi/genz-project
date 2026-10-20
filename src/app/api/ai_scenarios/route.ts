import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export async function GET() {
  const { data, error } = await supabase.from('ai_scenarios')
    .select('id,category,situation,evaluation_points,difficulty,source_url')
    .eq('status', '완료').order('id', { ascending: true });
  if (error) return NextResponse.json({ error: '상황을 불러오지 못했습니다. 다시 시도해 주세요.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}
