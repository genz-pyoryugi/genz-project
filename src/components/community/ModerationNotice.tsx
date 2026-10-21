'use client';

// 고민글·조언 등록 전 검사 결과 안내 (포스트잇 작성창 · 테이프 조언 작성창에서 함께 사용)
// 형식 문제 → 등록 불가 / 욕설·비하 → 등록 불가 / 개인정보 → 가리고 등록 /
// 공격적인 조언 말투 → 부드러운 문장 제안 / 괴롭힘 피해·위기 → 도움 받을 곳 안내 후 등록

import React from 'react';
import { ShieldAlert, ShieldCheck, EyeOff, Sparkles, HeartHandshake, Loader2, AlertCircle } from 'lucide-react';
import { ModerationResult } from '@/types/moderation';
import { ContentKind, validateBasics } from '@/lib/community/validation';

/** 서버 검사 요청. 네트워크 오류면 규칙 검사 결과만으로 판단(글쓰기가 막히지 않도록) */
export async function requestModeration(payload: {
  kind: ContentKind;
  title?: string;
  content: string;
  nickname?: string;
  postTitle?: string;
}): Promise<ModerationResult> {
  try {
    const res = await fetch('/api/community/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as ModerationResult;
  } catch {
    const issues = validateBasics(payload.kind, payload);
    return { ok: issues.length === 0, issues, personalInfo: [], verdict: 'ok', reason: '', categories: [], aiChecked: false };
  }
}

/** 검사 전에 브라우저에서 바로 하는 형식 검사 (서버까지 가지 않고 즉시 안내) */
export function localCheck(kind: ContentKind, fields: { title?: string; content: string; nickname?: string }): ModerationResult | null {
  const issues = validateBasics(kind, fields);
  return issues.length
    ? { ok: false, issues, personalInfo: [], verdict: 'ok', reason: '', categories: [], aiChecked: false }
    : null;
}

/** 개인정보 가리기 */
export function applyMasks(text: string, result: ModerationResult): string {
  return result.personalInfo.reduce((t, p) => t.split(p.text).join(p.masked), text);
}

interface ModerationNoticeProps {
  checking: boolean;
  result: ModerationResult | null;
  onMaskAndSubmit?: () => void; // 개인정보 가리고 등록
  onUseSuggestion?: () => void; // 제안 문장으로 바꾸기
  onSubmitAnyway?: () => void; // 안내를 확인하고 그대로 등록
}

const Box: React.FC<{ tone: 'red' | 'amber' | 'blue' | 'purple'; icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  tone,
  icon,
  title,
  children,
}) => {
  const tones = {
    red: 'bg-[#FDECEE] border-[#F3C2C8] text-[#7A1F2B]',
    amber: 'bg-[#FFF5DE] border-[#F0D9A0] text-[#6B4A06]',
    blue: 'bg-[#EAF3FA] border-[#BFD8EC] text-[#173E5C]',
    purple: 'bg-[#F2EEFB] border-[#D6CBEF] text-[#3D2A6B]',
  };
  return (
    <div className={`rounded-xl border px-3.5 py-3 text-xs font-ui leading-relaxed ${tones[tone]}`}>
      <p className="font-bold flex items-center gap-1.5 mb-1">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
};

const btn = 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors';

export const ModerationNotice: React.FC<ModerationNoticeProps> = ({
  checking,
  result,
  onMaskAndSubmit,
  onUseSuggestion,
  onSubmitAnyway,
}) => {
  if (checking) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-ui text-[#2B729E]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        개인정보와 표현을 검사하고 있어요…
      </p>
    );
  }
  if (!result || result.ok) return null;

  // ① 형식 문제
  if (result.issues.length) {
    return (
      <Box tone="red" icon={<AlertCircle className="w-3.5 h-3.5" />} title="입력 내용을 확인해 주세요">
        <ul className="list-disc pl-4 space-y-0.5">
          {result.issues.map((i, n) => (
            <li key={n}>{i.message}</li>
          ))}
        </ul>
      </Box>
    );
  }

  // ③ 등록 불가 (욕설·비하·광고 등)
  if (result.verdict === 'block') {
    return (
      <Box tone="red" icon={<ShieldAlert className="w-3.5 h-3.5" />} title="이대로는 등록할 수 없어요">
        <p>{result.reason || '다른 사람에게 상처가 될 수 있는 표현이 있어요. 내용을 고쳐서 다시 시도해 주세요.'}</p>
      </Box>
    );
  }

  const hasPersonalInfo = result.personalInfo.length > 0;

  return (
    <div className="space-y-2">
      {/* ② 개인정보 */}
      {hasPersonalInfo && (
        <Box tone="amber" icon={<EyeOff className="w-3.5 h-3.5" />} title="개인정보로 보이는 내용이 있어요">
          <p className="mb-1.5">익명 게시판이라도 나와 다른 사람을 알아볼 수 있는 정보는 가리고 올리는 게 안전해요.</p>
          <ul className="space-y-0.5 mb-2">
            {result.personalInfo.map((p, n) => (
              <li key={n}>
                <span className="font-semibold">[{p.type}]</span> <span className="line-through opacity-70">{p.text}</span> →{' '}
                <span className="font-bold">{p.masked}</span>
              </li>
            ))}
          </ul>
          {onMaskAndSubmit && (
            <button type="button" onClick={onMaskAndSubmit} className={`${btn} bg-[#6B4A06] hover:bg-[#553a04] text-white`}>
              가리고 등록하기
            </button>
          )}
        </Box>
      )}

      {/* ③ 공격적인 조언 말투 → 부드러운 문장 제안 */}
      {result.verdict === 'soften' && (
        <Box tone="blue" icon={<Sparkles className="w-3.5 h-3.5" />} title="조금 더 따뜻하게 전해 볼까요?">
          <p className="mb-1.5">{result.reason}</p>
          {result.suggestion && (
            <p className="mb-2 px-2.5 py-2 rounded-lg bg-white/70 border border-[#BFD8EC] text-[#112334]">“{result.suggestion}”</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {result.suggestion && onUseSuggestion && (
              <button type="button" onClick={onUseSuggestion} className={`${btn} bg-[#2B729E] hover:bg-[#205B80] text-white`}>
                제안 문장으로 바꾸기
              </button>
            )}
            {!hasPersonalInfo && onSubmitAnyway && (
              <button type="button" onClick={onSubmitAnyway} className={`${btn} bg-white border border-[#BFD8EC] hover:bg-[#F3F8FC]`}>
                그대로 등록
              </button>
            )}
          </div>
        </Box>
      )}

      {/* ③ 괴롭힘 피해 · 위기 → 도움 받을 곳 안내 (등록은 막지 않음) */}
      {result.verdict === 'help' && (
        <Box tone="purple" icon={<HeartHandshake className="w-3.5 h-3.5" />} title="혼자 견디지 않아도 괜찮아요">
          <p className="mb-1.5">{result.reason || '힘든 상황을 털어놓아 주셔서 고마워요. 도움을 받을 수 있는 곳도 함께 알려 드릴게요.'}</p>
          <ul className="list-disc pl-4 space-y-0.5 mb-2">
            {result.crisis && (
              <>
                <li>
                  <b>자살예방 상담전화 109</b> · 24시간
                </li>
                <li>
                  <b>정신건강 위기상담 1577-0199</b> · 24시간
                </li>
              </>
            )}
            <li>
              <b>고용노동부 고객상담센터 1350</b> · 직장 내 괴롭힘 상담·신고
            </li>
            <li>회사의 고충처리 담당자나 인사팀 · 있었던 일을 날짜별로 기록해 두면 도움이 돼요</li>
          </ul>
          {!hasPersonalInfo && onSubmitAnyway && (
            <button type="button" onClick={onSubmitAnyway} className={`${btn} bg-[#3D2A6B] hover:bg-[#2f2054] text-white`}>
              확인했어요, 등록하기
            </button>
          )}
        </Box>
      )}

      {!result.aiChecked && (
        <p className="flex items-center gap-1 text-[11px] font-ui text-[#857F76]">
          <ShieldCheck className="w-3 h-3" /> AI 검사가 잠시 어려워 기본 검사만 했어요.
        </p>
      )}
    </div>
  );
};
