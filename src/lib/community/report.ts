// 고민상담소 신고 — 검사를 통과한 글·조언이라도 문제가 되면 사용자가 신고해서 가린다
// - 내가 신고한 글·조언은 내 화면에서 바로 가려진다 (되돌리기 가능)
// - 신고가 REPORT_HIDE_THRESHOLD 건 이상 쌓이면 모두에게 가려진다 (여러 사용자의 신고가 모이는 서버 DB 연동 시 동작)
// - 가려진 글·조언은 보이는 라디오 사연·대본에서도 빠진다

export const REPORT_HIDE_THRESHOLD = 3;

export const REPORT_REASONS = ['개인정보 노출', '욕설·비하', '광고·도배', '기타'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Reportable {
  reportCount?: number;
  reportedByMe?: boolean;
  reportReasons?: string[];
}

/** 가려야 하는지 (내가 신고했거나 신고가 기준 이상) */
export function isHidden(item: Reportable): boolean {
  return Boolean(item.reportedByMe) || (item.reportCount ?? 0) >= REPORT_HIDE_THRESHOLD;
}

/** 신고 반영 */
export function withReport<T extends Reportable>(item: T, reason: ReportReason): T {
  if (item.reportedByMe) return item; // 한 사람은 한 번만
  return {
    ...item,
    reportedByMe: true,
    reportCount: (item.reportCount ?? 0) + 1,
    reportReasons: [...(item.reportReasons ?? []), reason],
  };
}

/** 내 신고 취소 (가린 것 되돌리기) */
export function withoutMyReport<T extends Reportable>(item: T): T {
  if (!item.reportedByMe) return item;
  const reasons = [...(item.reportReasons ?? [])];
  reasons.pop();
  return { ...item, reportedByMe: false, reportCount: Math.max(0, (item.reportCount ?? 1) - 1), reportReasons: reasons };
}
