// AI 팀장 시뮬레이션 민감 상황 응답 기준 (멘토 피드백 반영)
// 사용자가 연습 답변 대신 실제 괴롭힘 피해나 위기 신호를 털어놓으면, 팀장 역할극을 이어가지 않고 도움 받을 곳을 안내한다.
// - 그 답변은 대화 기록 · 평가에 넣지 않는다 (AI 에 보내지도 않음). 사용자는 원하면 연습을 계속할 수 있다.
// - 욕설 차단(src/lib/moderation.ts)보다 먼저 검사한다: 피해 사실을 말하며 들은 욕을 그대로 옮겨도 차단 대신 안내가 나오도록.
// 연락처는 고민상담소 안내(src/components/community/ModerationNotice.tsx)와 같다.

export type SensitiveKind = "crisis" | "harassment";

// 괴롭힘 낱말은 띄어쓰기를 지운 문장에서 찾는다 ("폭언을 해요" = "폭언을해요").
// 위기 낱말은 띄어쓰기를 지우면 "혼자 해" → "혼자해"(자해), "혼자 살아요"(자살)처럼 잘못 잡히므로, 띄어쓰기를 살린 문장에서 앞에 다른 한글이 붙지 않은 경우만 찾는다.
const CRISIS = /죽고 ?싶|(?<![가-힣])자살|(?<![가-힣])자해|극단적 ?선택|사라지고 ?싶|살기 ?싫|그만 ?살고 ?싶|목숨을 ?끊/;
const HARASSMENT = /괴롭힘|괴롭혀|괴롭히|따돌림|따돌리|따돌려|왕따|폭언|갑질|성희롱|성추행|추행을|폭행|때렸|때려요|협박|소리를질러|소리질러|소리를질렀|욕을했|욕을해|욕먹|모욕을|인격모독|차별당/;

export function findSensitive(text: string): SensitiveKind | null {
  if (CRISIS.test(text.replace(/\s+/g, " "))) return "crisis";
  if (HARASSMENT.test(text.replace(/\s+/g, ""))) return "harassment";
  return null;
}

export const SUPPORT: Record<SensitiveKind, { title: string; text: string; contacts: { name: string; detail: string }[] }> = {
  crisis: {
    title: "시뮬레이션을 잠시 멈출게요",
    text: "많이 힘든 마음이 느껴져요. 혼자 견디지 않아도 돼요. 지금 바로 이야기를 들어줄 수 있는 곳이 있어요.",
    contacts: [
      { name: "자살예방 상담전화 109", detail: "24시간" },
      { name: "정신건강 위기상담 1577-0199", detail: "24시간" },
    ],
  },
  harassment: {
    title: "시뮬레이션을 잠시 멈출게요",
    text: "이런 일은 참고 넘길 일이 아니에요. 날짜 · 내용 · 함께 본 사람을 기록해 두고, 믿을 수 있는 곳에 도움을 요청하세요.",
    contacts: [
      { name: "사내 고충처리 담당 · 인사팀", detail: "회사 안에서 먼저 상담" },
      { name: "고용노동부 고객상담센터 1350", detail: "직장 내 괴롭힘 상담 · 신고" },
    ],
  },
};
