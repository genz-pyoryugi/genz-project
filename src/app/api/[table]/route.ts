import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 브라우저가 /api/<테이블 이름>으로 읽을 수 있는 테이블 목록.
// 여기에 없는 테이블(roleplay_*, search_logs 등)은 열지 않는다.
//  columns: 가져올 컬럼 / onlyDone: status가 "완료"인 행만 공개
const TABLES: Record<string, { columns: string; onlyDone: boolean }> = {
  quizzes: {
    columns: "id,category,question,option1,option2,option3,option4,option5,answer,explanation",
    onlyDone: true,
  },
  checklists: {
    columns: "id,category,title,item1,item2,item3,item4,item5,description,source_url",
    onlyDone: true,
  },
  shortform_contents: {
    columns: "id,category,title,video_url,description,source_url",
    onlyDone: true,
  },
  radio_contents: {
    columns: "id,category,sub_category,title,script,practice_line,audio_url",
    onlyDone: true,
  },
  contents: {
    columns: "id,source,title,url,category,keyword,summary,situation,published_year",
    onlyDone: false, // status 컬럼이 없는 테이블
  },
  ai_scenarios: {
    columns: "id,category,situation,evaluation_points,difficulty,source_url",
    onlyDone: true,
  },
};

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/[table]">) {
  const { table } = await ctx.params;
  const config = Object.hasOwn(TABLES, table) ? TABLES[table] : null;
  if (!config) {
    return NextResponse.json({ error: "없는 데이터입니다." }, { status: 404 });
  }

  let query = supabase.from(table).select(config.columns);
  if (config.onlyDone) query = query.eq("status", "완료");
  const { data, error } = await query.order("id", { ascending: true });

  if (error) {
    console.error(`${table} query failed:`, error.code);
    return NextResponse.json({ error: "데이터를 불러오지 못했습니다." }, { status: 502 });
  }
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
