// 고민상담소 글·조언 유효성 검사 (규칙 기반) — 브라우저(입력 중 바로 안내)와 서버(등록 시 최종 확인)가 함께 쓴다
// ① 기본 입력 검증: 필수 · 길이 · 도배 · 외부 링크
// ② 개인정보 탐지: 전화번호 · 이메일 · 주민등록번호 · 계좌번호 → 자동 가리기 제안
// (실명 · 회사명처럼 형식이 없는 개인정보와 욕설 · 비하 등은 서버의 AI 검사가 맡는다)

export type ContentKind = 'post' | 'comment';

export const LIMITS = {
  title: { min: 5, max: 45 },
  content: { min: 20, max: 250 }, // 고민 내용
  comment: { min: 5, max: 150 }, // 테이프 조언
  nickname: { min: 1, max: 15 },
} as const;

export interface ValidationIssue {
  field: 'title' | 'content' | 'nickname';
  message: string;
}

const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|kr|co\.kr|io|me|ly)\b/i;
const REPEAT = /(.)\1{7,}/; // 같은 글자 8번 이상 연속 (ㅋㅋㅋㅋㅋㅋㅋㅋ, !!!!!!!!)
const ONLY_JAMO_OR_SYMBOL = /^[\sㄱ-ㅎㅏ-ㅣ!?.,~^_\-+*/\\|()[\]{}<>@#$%&=:;'"`]+$/u;

/** 받침에 맞는 조사: josa('제목', '은', '는') → '제목은' */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

function checkText(field: ValidationIssue['field'], label: string, text: string, min: number, max: number): ValidationIssue[] {
  const t = text.trim();
  if (!t) return [{ field, message: `${josa(label, '을', '를')} 입력해 주세요.` }];
  const issues: ValidationIssue[] = [];
  if (t.length < min) issues.push({ field, message: `${josa(label, '은', '는')} ${min}자 이상 적어 주세요. (지금 ${t.length}자)` });
  if (t.length > max) issues.push({ field, message: `${josa(label, '은', '는')} ${max}자까지 쓸 수 있어요.` });
  if (REPEAT.test(t)) issues.push({ field, message: `같은 글자를 너무 많이 반복했어요.` });
  if (ONLY_JAMO_OR_SYMBOL.test(t)) issues.push({ field, message: `${label}에 내용을 적어 주세요. (자음·모음·기호만으로는 등록할 수 없어요)` });
  if (LINK.test(t)) issues.push({ field, message: `광고·스팸 방지를 위해 외부 링크는 넣을 수 없어요.` });
  return issues;
}

/** ① 기본 입력 검증 */
export function validateBasics(
  kind: ContentKind,
  fields: { title?: string; content: string; nickname?: string }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (kind === 'post') {
    issues.push(...checkText('title', '제목', fields.title ?? '', LIMITS.title.min, LIMITS.title.max));
    issues.push(...checkText('content', '고민 내용', fields.content, LIMITS.content.min, LIMITS.content.max));
  } else {
    issues.push(...checkText('content', '조언', fields.content, LIMITS.comment.min, LIMITS.comment.max));
  }
  if (fields.nickname !== undefined && fields.nickname.trim().length > LIMITS.nickname.max) {
    issues.push({ field: 'nickname', message: `닉네임은 ${LIMITS.nickname.max}자까지 쓸 수 있어요.` });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// ② 개인정보 탐지 · 가리기
// ---------------------------------------------------------------------------

export type PersonalInfoType = '주민등록번호' | '전화번호' | '이메일' | '계좌번호';

export interface PersonalInfoMatch {
  type: PersonalInfoType;
  text: string; // 찾은 원문
  masked: string; // 가린 결과
}

// 순서 중요: 주민등록번호를 계좌번호보다, 전화번호를 계좌번호보다 먼저 찾는다
const PII_RULES: { type: PersonalInfoType; re: RegExp; mask: (m: string) => string; valid?: (m: string) => boolean }[] = [
  {
    type: '주민등록번호',
    re: /\b\d{6}\s?-\s?[1-4]\d{6}\b/g,
    mask: (m) => m.replace(/(\d{6}\s?-\s?[1-4])\d{6}/, '$1******'),
  },
  {
    type: '전화번호',
    re: /(?<!\d)(01[016789]|0\d{1,2})[\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/g,
    mask: (m) => m.replace(/\d{3,4}([\s.-]?\d{4})$/, (_x, last) => '****' + last),
  },
  {
    type: '이메일',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    mask: (m) => m.replace(/^([A-Za-z0-9])[^@]*/, '$1***'),
  },
  {
    type: '계좌번호',
    re: /(?<!\d)\d{2,6}-\d{2,6}-\d{2,8}(-\d{1,3})?(?!\d)/g,
    mask: (m) => m.replace(/\d(?=[\d-]{4})/g, '*'),
    // 숫자 10자리 이상이고 날짜(2024-10-15)가 아닐 때만 계좌번호로 본다
    valid: (m) => m.replace(/\D/g, '').length >= 10 && !/^(19|20)\d{2}-\d{1,2}-\d{1,2}$/.test(m),
  },
];

/** 글에서 형식이 정해진 개인정보를 찾는다 */
export function detectPersonalInfo(text: string): PersonalInfoMatch[] {
  const found: PersonalInfoMatch[] = [];
  let rest = text;
  for (const rule of PII_RULES) {
    for (const m of rest.matchAll(rule.re)) {
      if (rule.valid && !rule.valid(m[0])) continue;
      found.push({ type: rule.type, text: m[0], masked: rule.mask(m[0]) });
    }
    // 이미 찾은 부분은 다음 규칙에서 다시 찾지 않도록 지운다
    rest = rest.replace(rule.re, (m) => (rule.valid && !rule.valid(m) ? m : ' '));
  }
  return found;
}

/** 찾은 개인정보를 가린 글 */
export function maskPersonalInfo(text: string, extra: { text: string; masked: string }[] = []): string {
  let out = text;
  for (const m of [...detectPersonalInfo(text), ...extra]) out = out.split(m.text).join(m.masked);
  return out;
}
