import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Reuses frontend's verified quizzes query without exposing unrelated tables.
export async function GET() {
  try {
    const { data, error } = await supabase.from('quizzes')
      .select('id,category,question,option1,option2,option3,option4,option5,answer,explanation')
      .eq('status', '완료').order('id', { ascending: true });
    if (error) {
      console.error('quizzes query failed:', error.code || 'connection');
      return NextResponse.json({ error: '퀴즈를 불러오지 못했습니다.' }, { status: 502 });
    }
    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: '퀴즈 연결을 확인해 주세요.' }, { status: 502 });
  }
}
