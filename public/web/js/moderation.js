// 입력 유효성 검사 (정적 화면용: SOS 채팅 · AI 팀장 시뮬레이션) — 욕설 · 비하 · 혐오 · 위협 · 성적 표현을 막는다
// src/lib/moderation.ts 와 같은 목록 · 같은 규칙. 둘을 함께 고칠 것 (tests/moderation.test.cjs 가 일치 여부를 확인)
// 서버(/api/sos · /api/simulation)도 같은 검사를 한 번 더 하므로, 여기는 바로 알려 주기 위한 1차 검사다.
(function (root) {
  const BLOCKED_WORDS = [
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
  const ALLOW_WORDS = ['시발점', '시발역', '새끼손가락', '새끼발가락', '시바견', '자위대', '자위권', '애자일', '등신대'];
  const MODERATION_MESSAGE = '욕설 · 비하 · 혐오 · 위협 표현은 쓸 수 없어요. 표현을 바꿔서 다시 써 주세요.';
  const clean = (s) => s.toLowerCase().replace(/[^\p{L}\s]/gu, '');
  function normalize(text) {
    let t = clean(text);
    for (const w of ALLOW_WORDS) t = t.split(w).join(' ');
    return t;
  }
  function findBlocked(...texts) {
    const t = normalize(texts.filter(Boolean).join(' '));
    return BLOCKED_WORDS.find((w) => t.includes(clean(w))) ?? null;
  }
  const api = { BLOCKED_WORDS, ALLOW_WORDS, MODERATION_MESSAGE, findBlocked, isClean: (...t) => findBlocked(...t) === null };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GenzModeration = api;
})(typeof window !== 'undefined' ? window : globalThis);
