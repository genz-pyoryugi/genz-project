// 고민상담소 글·조언 AI 검사 (서버 전용)
// 규칙으로 잡기 어려운 것(실명·회사명 같은 신상, 욕설·비하, 공격적인 조언 말투, 도움이 필요한 글)을 Gemini로 판단한다.

import { generateJson } from '@/lib/radio/gemini';
import { ContentKind } from './validation';

// 글 검사는 짧은 판정이라 빠른 경량 모델을 먼저 쓴다 (등록 버튼을 누르고 오래 기다리지 않도록)
// 모델마다 최대 12초까지만 기다리고, 모두 실패하면 API가 규칙 검사만으로 판단한다
const MODERATION_MODELS = process.env.GEMINI_MODERATION_MODELS
  ? process.env.GEMINI_MODERATION_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
  : ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
const MODERATION_TIMEOUT_MS = 12000;

/**
 * ok: 그대로 등록 / block: 등록 불가 / soften: 말투를 부드럽게 바꾸도록 제안(조언) /
 * help: 등록은 하되 도움 받을 곳을 안내(괴롭힘 피해·위기)
 */
export type ModerationVerdict = 'ok' | 'block' | 'soften' | 'help';

export interface AiModeration {
  verdict: ModerationVerdict;
  categories: string[];
  reason: string;
  personal_info: { text: string; masked: string }[];
  suggestion?: string;
  crisis?: boolean; // 자해·극단적 선택 암시 → 위기 상담 번호 안내
}

const SYSTEM_PROMPT = `너는 신입사원 익명 커뮤니티 "오피스 고민상담소"의 게시물 검수 담당이다.
사용자는 직장 고민(포스트잇 글)을 올리거나, 다른 사람의 고민에 조언(테이프 조언)을 단다.
입력된 글을 검사해서 아래 JSON 형식으로만 답한다.

[판정 verdict]
- "block": 욕설·비속어, 특정 집단 비하·차별, 성적인 표현, 특정인을 겨냥한 비난·조롱, 광고·홍보, 고민과 무관한 도배.
  단, 고민글에서 "팀장님이 저에게 욕을 했어요"처럼 자신이 겪은 일을 설명하는 것은 block이 아니다.
- "soften": (조언에만 해당) 뜻은 괜찮지만 말투가 상대를 탓하거나 무시하거나 비꼬는 경우. 예: "그것도 몰라요?", "그냥 참으세요".
  suggestion에 원래 뜻을 살려 따뜻하고 존중하는 말투로 바꾼 문장을 쓴다.
- "help": 직장 내 괴롭힘·폭언·차별 피해를 호소하거나, 자해·극단적 선택을 암시하는 경우. 등록은 막지 않는다.
  자해·극단적 선택 암시가 있으면 crisis를 true로 한다.
- "ok": 위에 해당하지 않는 경우.

[개인정보 personal_info]
- 실명(예: "김민수 팀장"), 실제 회사·기관 이름, 부서와 이름을 합친 표현처럼 특정 사람·회사를 알아볼 수 있는 정보를 찾는다.
- text에는 글에 쓰인 원문 그대로, masked에는 가린 표현(예: "김○○ 팀장", "○○회사")을 쓴다.
- "팀장님", "사수", "옆 부서 선배", "IT 회사"처럼 누군지 특정할 수 없는 표현은 개인정보가 아니다.
- 전화번호·이메일 등 숫자 형식 정보는 다른 단계에서 처리하므로 넣지 않아도 된다.

[reason]
- 사용자에게 그대로 보여 줄 한 문장. 존댓말로, 왜 그런 판정인지 부드럽게 설명한다. ok이고 개인정보도 없으면 빈 문자열.

{
  "verdict": "ok | block | soften | help",
  "categories": ["해당하는 분류. 예: 욕설, 비하·차별, 특정인 비난, 광고, 공격적 말투, 괴롭힘 피해, 위기, 개인정보"],
  "reason": "",
  "personal_info": [{"text": "원문", "masked": "가린 표현"}],
  "suggestion": "soften일 때만",
  "crisis": false
}`;

export async function moderateWithAi(input: {
  kind: ContentKind;
  title?: string;
  content: string;
  postTitle?: string; // 조언을 다는 고민글 제목 (맥락)
}): Promise<AiModeration> {
  const user =
    input.kind === 'post'
      ? `[종류] 고민글(포스트잇)\n[제목] ${input.title ?? ''}\n[내용] ${input.content}`
      : `[종류] 조언(테이프 조언)\n[고민글 제목] ${input.postTitle ?? ''}\n[조언 내용] ${input.content}`;

  const r = await generateJson<Partial<AiModeration>>(SYSTEM_PROMPT, user, {
    models: MODERATION_MODELS,
    timeoutMs: MODERATION_TIMEOUT_MS,
  });
  const verdict: ModerationVerdict = ['ok', 'block', 'soften', 'help'].includes(r.verdict as string)
    ? (r.verdict as ModerationVerdict)
    : 'ok';

  return {
    // 고민글에는 '말투 바꾸기'를 적용하지 않는다 (자기 고민을 털어놓는 글이므로)
    verdict: input.kind === 'post' && verdict === 'soften' ? 'ok' : verdict,
    categories: Array.isArray(r.categories) ? r.categories.map(String) : [],
    reason: typeof r.reason === 'string' ? r.reason : '',
    personal_info: Array.isArray(r.personal_info)
      ? r.personal_info
          .filter((p) => p && typeof p.text === 'string' && typeof p.masked === 'string' && p.text.trim())
          // 글에 실제로 있는 표현만 (AI가 지어낸 것은 버림)
          .filter((p) => `${input.title ?? ''}\n${input.content}`.includes(p.text))
      : [],
    suggestion: typeof r.suggestion === 'string' && r.suggestion.trim() ? r.suggestion.trim() : undefined,
    crisis: Boolean(r.crisis),
  };
}
