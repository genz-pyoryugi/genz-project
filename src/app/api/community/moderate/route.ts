// POST /api/community/moderate — 고민글·조언을 등록하기 전에 검사한다
// ① 기본 입력 검증(규칙) → ② 개인정보 탐지(규칙) → ③ AI 검사(Gemini: 욕설·비하, 실명·회사명, 공격적 말투, 도움이 필요한 글)
// 브라우저에서도 ①②를 미리 보여 주지만, 브라우저 검사는 우회할 수 있으므로 이 서버 검사가 최종 기준이다.
// AI 서버가 바쁘거나 키가 없으면 ①②만으로 판단해서 사용자가 글을 못 쓰는 일이 없게 한다.

import { NextRequest, NextResponse } from 'next/server';
import { ContentKind, detectPersonalInfo, validateBasics } from '@/lib/community/validation';
import { moderateWithAi } from '@/lib/community/moderation';
import { ModerationResult } from '@/types/moderation';

export async function POST(req: NextRequest) {
  let body: { kind?: ContentKind; title?: string; content?: string; nickname?: string; postTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }
  const kind: ContentKind = body.kind === 'comment' ? 'comment' : 'post';
  const title = body.title ?? '';
  const content = body.content ?? '';

  // ① 기본 입력 검증 — 문제가 있으면 AI까지 가지 않고 바로 돌려준다
  const issues = validateBasics(kind, { title, content, nickname: body.nickname });
  if (issues.length) {
    const result: ModerationResult = { ok: false, issues, personalInfo: [], verdict: 'ok', reason: '', categories: [], aiChecked: false };
    return NextResponse.json(result);
  }

  // ② 개인정보 (형식이 정해진 것)
  const ruleInfo = detectPersonalInfo(kind === 'post' ? `${title}\n${content}` : content);

  // ③ AI 검사
  let ai: Awaited<ReturnType<typeof moderateWithAi>> | null = null;
  try {
    ai = await moderateWithAi({ kind, title, content, postTitle: body.postTitle });
  } catch (e) {
    console.error('AI 검사 실패 (규칙 검사만 적용):', e instanceof Error ? e.message : e);
  }

  const personalInfo = [
    ...ruleInfo,
    ...(ai?.personal_info ?? [])
      .filter((p) => !ruleInfo.some((r) => r.text === p.text))
      .map((p) => ({ type: '실명·회사명', ...p })),
  ];
  const verdict = ai?.verdict ?? 'ok';

  const result: ModerationResult = {
    // 그대로 등록: 개인정보도 없고 AI 판정도 ok일 때만 (help는 안내를 먼저 보여 준다)
    ok: personalInfo.length === 0 && verdict === 'ok',
    issues: [],
    personalInfo,
    verdict,
    reason: ai?.reason ?? '',
    categories: ai?.categories ?? [],
    ...(ai?.suggestion ? { suggestion: ai.suggestion } : {}),
    ...(ai?.crisis ? { crisis: true } : {}),
    aiChecked: ai !== null,
  };
  return NextResponse.json(result);
}
