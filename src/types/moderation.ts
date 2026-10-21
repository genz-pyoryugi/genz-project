// 고민상담소 글·조언 검사 결과 (서버 API ↔ 화면)

import type { ValidationIssue, PersonalInfoMatch } from '@/lib/community/validation';

export interface ModerationResult {
  /** 고칠 것 없이 그대로 등록해도 되는지 */
  ok: boolean;
  /** ① 형식 문제 (필수·길이·도배·링크) — 있으면 등록 불가 */
  issues: ValidationIssue[];
  /** ② 개인정보 (규칙으로 찾은 것 + AI가 찾은 실명·회사명) — 가린 뒤 등록 */
  personalInfo: (Omit<PersonalInfoMatch, 'type'> & { type: string })[];
  /** ③ AI 판정 */
  verdict: 'ok' | 'block' | 'soften' | 'help';
  reason: string;
  categories: string[];
  suggestion?: string; // 말투를 부드럽게 바꾼 조언
  crisis?: boolean; // 위기 상담 안내 필요
  aiChecked: boolean; // AI 검사를 했는지 (AI 서버가 바쁘면 규칙 검사만)
}
