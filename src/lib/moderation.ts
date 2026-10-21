// 입력 유효성 검사: 욕설 · 비하 · 혐오 · 위협 · 성적 표현을 막는다 (고민상담소 · SOS · AI 팀장 시뮬레이션 공통)
// 같은 목록이 정적 화면용 public/web/js/moderation.js 에도 있다 — 둘을 함께 고칠 것 (tests/moderation.test.cjs 가 일치 여부를 확인)
//  - 특수문자 · 숫자로 끊어 쓴 경우(시1발, 시.발)도 잡는다. 띄어쓰기는 그대로 둔다 (다시 발표 → '다시발표' 오탐 방지)
//  - ALLOW: 욕설과 글자가 겹치는 정상 낱말은 먼저 지운다 (시발점, 새끼손가락 …)

export const BLOCKED_WORDS = [
  // 욕설
  '씨발', '시발', '씨팔', '시팔', '씨바', '시바알', '쌍년', '썅', '씹새', '씹년', '씹창', '씹할', '좆', '좃같', '존나', '졸라',
  '병신', '븅신', '빙신', '개새끼', '개새', '개색', '개세끼', '새끼야', '새끼들', '지랄', '염병', '닥쳐', '엿먹', '미친놈', '미친년',
  '미친새', '또라이', '찐따', '니애미', '느금', '니미럴', '애미없', '호로새', '후레자식', '개같은', '개소리', '꺼지라고', '등신',
  'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅈㄴ', 'ㅅㄲ', 'ㅈㄹ', 'ㄱㅅㄲ', 'ㅄ',
  'fuck', 'shit', 'bitch', 'asshole', 'motherfucker', 'dick',
  // 비하 · 혐오 · 차별
  '틀딱', '급식충', '맘충', '한남충', '김치녀', '된장녀', '짱깨', '쪽바리', '흑형', '애자', '장애새끼', '정신병자', '벌레새끼',
  // 위협
  '죽여버', '죽일거', '죽여줄', '패버린', '패버릴', '때려죽', '칼로찔', '칼로 찔',
  // 성적 표현
  '섹스', '야동', '성기', '강간', '자위',
];
export const ALLOW_WORDS = ['시발점', '시발역', '새끼손가락', '새끼발가락', '시바견', '자위대', '자위권', '애자일', '등신대'];

export const MODERATION_MESSAGE = '욕설 · 비하 · 혐오 · 위협 표현은 쓸 수 없어요. 표현을 바꿔서 다시 써 주세요.';

// 비교용으로 바꾼 글: 소문자, 숫자 · 특수문자 제거(띄어쓰기는 유지), 허용 낱말 제거
function normalize(text: string): string {
  let t = text.toLowerCase().replace(/[^\p{L}\s]/gu, '');
  for (const w of ALLOW_WORDS) t = t.split(w).join(' ');
  return t;
}

/** 막힌 표현이 있으면 그 낱말, 없으면 null */
export function findBlocked(...texts: (string | null | undefined)[]): string | null {
  const t = normalize(texts.filter(Boolean).join(' '));
  return BLOCKED_WORDS.find(w => t.includes(w.toLowerCase().replace(/[^\p{L}\s]/gu, ''))) ?? null;
}

export const isClean = (...texts: (string | null | undefined)[]) => findBlocked(...texts) === null;
