import React, { useState } from 'react';
import { PostItPost, ChapterId, PostItColor, FastenerType } from '../../types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { X, PenTool } from 'lucide-react';
import { sound } from '../../utils/audio';
import { findBlocked, MODERATION_MESSAGE } from '@/lib/moderation';

// 챕터별 태그와 그 태그를 고르는 낱말: 첫 번째가 기본값. 제목 · 내용에 낱말이 가장 많이 들어간 태그를 자동으로 고른다
// (기존 고민상담소 포스트잇들의 태그와 같은 말투, 사용자가 태그를 직접 고치면 자동 선택은 멈춤)
const CHAPTER_TAG_RULES: Record<string, [string, string[]][]> = {
  '01': [
    ['조직 첫인사 & 적응', ['첫인사', '인사', '자기소개', '첫 출근', '첫출근', '입사', '적응', '호칭', '반존대', '존댓말', '반말']],
    ['역할 파악 & 조직 이해', ['역할', '업무 범위', '조직도', '부서', '담당', '내 일', '직무', '사수']],
    ['회사 문화 & 분위기 파악', ['문화', '분위기', '눈치', '복장', '수평', '점심', '퇴근', '회식', '규칙']],
  ],
  '02': [
    ['업무 처리 & 기준', ['기준', '절차', '승인', '규정', '원칙', '결재']],
    ['마감 관리 & 처리 원칙', ['마감', '기한', '데드라인', '늦', '지연', '일정']],
    ['업무 보고 & 중간 점검', ['보고', '중간', '점검', '진행 상황', '피드백', '검토']],
    ['업무 우선순위 & 처리 원칙', ['우선순위', '먼저', '동시에', '여러 업무', '급한', '바쁜']],
  ],
  '03': [
    ['질문 & 소통', ['질문', '물어', '여쭤', '모르는', '확인']],
    ['연락 채널 & 소통 에티켓', ['메신저', '카톡', '슬랙', '채팅', '연락', '답장', '읽씹', '읽음']],
    ['이메일 확인 & 참조(CC)', ['메일', '이메일', '참조', 'cc', '회신', '첨부']],
    ['전화 응대 (콜포비아)', ['전화', '통화', '콜포비아', '받기']],
  ],
  '04': [
    ['협업 & 동료 존중', ['협업', '동료', '존중', '신입', '같이', '함께', '팀원', '반존대', '존댓말']],
    ['부서 협력 & 리소스 요청', ['다른 부서', '타 부서', '요청', '리소스', '자료', '데이터', '부탁']],
    ['회의 매너 & 상호 배려', ['회의', '의견', '반대', '아이디어', '발표', '토론', '피드백']],
  ],
  '05': [
    ['직장 관계 & 예절', ['예절', '관계', '선배', '상사', '매너', '인사']],
    ['대화 태도 & 엘리베이터 예절', ['엘리베이터', '대화', '스몰토크', '말투', '어색']],
    ['경조사 예절 & 관계 원칙', ['경조사', '결혼', '조의', '부조', '축의', '장례']],
    ['퇴근 후 관계 & 관계 원칙', ['퇴근 후', '회식', '주말', '사적인', '개인 연락', '술자리']],
  ],
  '06': [
    ['근무 & 재택 수칙', ['근무', '수칙', '출근', '근태']],
    ['근무 시간 & 지각 보고', ['지각', '늦잠', '출근 시간', '근무 시간', '조퇴', '야근']],
    ['재택근무 수칙 & 업무 태도', ['재택', '원격', '화상', '집에서', '온라인']],
    ['휴가 신청 & 연차 수칙', ['휴가', '연차', '반차', '병가', '쉬는 날']],
  ],
  '07': [
    ['공용 공간 & 비품 관리', ['공용', '공간', '비품', '정리']],
    ['회의실 정리 & 공용 비품 관리', ['회의실', '어댑터', '프로젝터', '빔', '예약', '모니터']],
    ['탕비실 사용 & 공간 정리', ['탕비실', '커피', '간식', '냉장고', '컵', '설거지', '전자레인지']],
    ['회사 비품 & 자산 보호', ['노트북', '자산', '분실', '고장', '파손', '장비', '프린터', '복사']],
  ],
};
const CHAPTER_TAGS: Record<string, string[]> = Object.fromEntries(
  Object.entries(CHAPTER_TAG_RULES).map(([id, rules]) => [id, rules.map(([tag]) => tag)]));
// 제목 + 내용으로 태그 고르기 (낱말이 하나도 안 맞으면 챕터 기본 태그)
function suggestTag(chapterId: string, text: string): string {
  const rules = CHAPTER_TAG_RULES[chapterId];
  if (!rules) return '직장생활 고민';
  const t = text.toLowerCase();
  let best = rules[0][0], bestScore = 0;
  for (const [tag, words] of rules) {
    const score = words.reduce((n, w) => n + (t.includes(w.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) { best = tag; bestScore = score; }
  }
  return best;
}

interface PostItWriteModalProps {
  currentChapterId: ChapterId;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPost: Omit<PostItPost, 'id' | 'createdAt' | 'stickers' | 'comments'>) => void;
}

export const PostItWriteModal: React.FC<PostItWriteModalProps> = ({
  currentChapterId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [chapterId, setChapterId] = useState<ChapterId>(currentChapterId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // 태그: 고른 챕터에 맞는 기본 태그로 시작하고, 챕터를 바꾸면 같이 바뀐다 (사용자가 직접 고친 태그는 그대로)
  const [categoryTag, setCategoryTag] = useState(CHAPTER_TAGS[currentChapterId]?.[0] ?? '직장생활 고민');
  const [tagEdited, setTagEdited] = useState(false);
  const [authorNickname, setAuthorNickname] = useState('신입사원A');
  const [role, setRole] = useState<'신입' | '인턴' | '1년차' | '취준생'>('신입');
  const [companyType, setCompanyType] = useState('IT스타트업');
  const [color, setColor] = useState<PostItColor>('yellow');
  const [fastener, setFastener] = useState<FastenerType>('tape-clear');
  const [highlightedText, setHighlightedText] = useState('');
  const [blockedError, setBlockedError] = useState(''); // 욕설 · 비하 · 혐오 · 위협 표현 안내

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    // 욕설 · 비하 · 혐오 · 위협 표현이 있으면 붙이지 않고 안내 (src/lib/moderation.ts)
    if (findBlocked(title, content, highlightedText, categoryTag, authorNickname)) { setBlockedError(MODERATION_MESSAGE); requestAnimationFrame(() => document.querySelector('[data-moderation-alert]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); return; }
    setBlockedError('');

    sound.playStickSound();

    const randomRot = Math.round((Math.random() * 2.8 - 1.4) * 10) / 10;

    onSubmit({
      chapterId,
      title: title.trim(),
      content: content.trim(),
      categoryTag: categoryTag.trim() || '직장생활 고민',
      author: {
        nickname: authorNickname.trim() || '익명의 신입',
        role,
        companyType,
      },
      color,
      fastener,
      rotation: randomRot,
      highlightedText: highlightedText.trim() || undefined,
    });

    onClose();
  };

  const colorOptions: { id: PostItColor; label: string; bgClass: string; borderClass: string }[] = [
    { id: 'yellow', label: '클래식 옐로우', bgClass: 'bg-[#FFF6BA]', borderClass: 'border-[#EFE295]' },
    { id: 'blue', label: '오피스 블루', bgClass: 'bg-[#DCF0FA]', borderClass: 'border-[#BCDCEC]' },
    { id: 'mint', label: '소프트 민트', bgClass: 'bg-[#DDF4EA]', borderClass: 'border-[#BDE4D2]' },
    { id: 'peach', label: '코지 피치', bgClass: 'bg-[#FEE7DC]', borderClass: 'border-[#F2CBB8]' },
    { id: 'ivory', label: '클린 아이보리', bgClass: 'bg-[#FDFBF7]', borderClass: 'border-[#E5DFD4]' },
  ];

  const fastenerOptions: { id: FastenerType; label: string }[] = [
    { id: 'tape-clear', label: '반투명 매직테이프' },
    { id: 'tape-craft', label: '크라프트 테이프' },
    { id: 'clip-silver', label: '실버 페이퍼클립' },
    { id: 'none', label: '기본 접착면' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-2xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#D5CFC5] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#EAE6DF] border-b border-[#D5CFC5] flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-ui font-bold text-base text-[#112334]">
              생존 매뉴얼 페이지에 포스트잇 붙이기
            </h3>
            <p className="text-xs font-ui text-[#736D64] mt-0.5">
              사소하지만 물어보기 막막했던 직장생활 경험담이나 질문을 책 위에 메모해두세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#DCD7CD] text-[#58534C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left form, Right live preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="p-6 md:col-span-7 space-y-4 border-b md:border-b-0 md:border-r border-[#E5DFD4]">
            {/* Chapter Selection */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                해당하는 직장생활 챕터
              </label>
              <select
                value={chapterId}
                onChange={(e) => {
                  const next = e.target.value as ChapterId;
                  setChapterId(next);
                  if (!tagEdited) setCategoryTag(suggestTag(next, `${title} ${content}`));
                }}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs font-medium text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
              >
                {CHAPTER_LIST.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.number}. {chap.title} ({chap.subtitle})
                  </option>
                ))}
              </select>
            </div>

            {/* Post-it Color Picker */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1.5">
                포스트잇 색상 선택
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      sound.playStickSound();
                      setColor(c.id);
                    }}
                    className={`py-2 px-1 rounded-lg border text-center transition-all ${c.bgClass} ${c.borderClass} ${
                      color === c.id
                        ? 'ring-2 ring-[#2B729E] font-bold shadow-xs scale-105'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px] font-ui text-[#112334] block truncate">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fastener Choice */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                고정 테이프 / 클립
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fastenerOptions.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setFastener(f.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-ui text-left transition-all ${
                      fastener === f.id
                        ? 'bg-[#E5EEF4] border-[#2B729E] text-[#112334] font-bold'
                        : 'bg-white border-[#D5CFC5] text-[#58534C]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag & Role */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                  소속/직무
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                >
                  <option value="IT스타트업">IT스타트업</option>
                  <option value="대기업">대기업</option>
                  <option value="중견기업">중견기업</option>
                  <option value="공공기관">공공기관</option>
                  <option value="외국계">외국계</option>
                  <option value="취준생">취준생</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                  연차/역할
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as '신입' | '인턴' | '1년차' | '취준생')}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                >
                  <option value="신입">신입</option>
                  <option value="인턴">인턴</option>
                  <option value="1년차">1년차</option>
                  <option value="취준생">취준생</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                  태그
                </label>
                <input
                  type="text"
                  value={categoryTag}
                  onChange={(e) => { setCategoryTag(e.target.value); setTagEdited(e.target.value.trim() !== ''); }}
                  placeholder="예: 첫인사"
                  list="postit-tag-options"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                  maxLength={20}
                />
                {/* 이 챕터의 추천 태그 (입력창을 누르면 목록으로 보임) */}
                <datalist id="postit-tag-options">
                  {(CHAPTER_TAGS[chapterId] ?? []).map((tag) => <option key={tag} value={tag} />)}
                </datalist>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                포스트잇 제목 (한 줄 질문이나 상황)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (!tagEdited) setCategoryTag(suggestTag(chapterId, `${e.target.value} ${content}`)); }}
                placeholder="예: 출근 첫날 점심시간... 혼밥해도 되나요?"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-sm text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                maxLength={45}
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                상황 설명 및 고민 내용
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => { setContent(e.target.value); if (!tagEdited) setCategoryTag(suggestTag(chapterId, `${title} ${e.target.value}`)); }}
                placeholder="실제 회사에서 겪은 당황스러운 순간이나, 혼자 끙끙 앓았던 질문을 편하게 적어주세요..."
                className="w-full p-3 rounded-lg bg-white border border-[#D5CFC5] text-base font-dakkuda text-[#112334] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                maxLength={250}
                required
              />
            </div>

            {/* Highlight quote */}
            <div>
              <label className="block text-xs font-ui font-medium text-[#736D64] mb-1">
                형광펜 칠할 핵심 문장 (선택)
              </label>
              <input
                type="text"
                value={highlightedText}
                onChange={(e) => setHighlightedText(e.target.value)}
                placeholder="본문 중 다른 동기들이 집중해서 봐주길 바라는 문장"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
              />
            </div>

            {/* 욕설 · 비하 · 혐오 · 위협 표현 안내 */}
            {blockedError && <p role="alert" data-moderation-alert className="px-3 py-2 rounded-lg bg-[#FCE9E3] text-[#9A330A] text-xs font-bold break-keep">{blockedError}</p>}
            {/* Submit */}
            <div className="pt-2 flex justify-end gap-2 border-t border-[#E5DFD4]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-ui text-[#58534C] hover:bg-[#EAE5DC] rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-ui font-bold text-white bg-[#112334] hover:bg-[#203548] rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5" />
                포스트잇 붙이기
              </button>
            </div>
          </form>

          {/* Live Preview Side */}
          <div className="p-6 md:col-span-5 bg-[#EAE6DF] flex flex-col items-center justify-center">
            <span className="text-[11px] font-ui font-bold text-[#736D64] mb-3 uppercase tracking-wider">
              실시간 포스트잇 미리보기
            </span>

            {/* Simulated Live Post-it */}
            <div className="w-full max-w-xs transition-transform transform hover:scale-[1.02]">
              {fastener === 'tape-clear' && (
                <div className="w-20 h-4 scotch-tape mx-auto -mb-2 z-20 relative -rotate-1" />
              )}
              {fastener === 'tape-craft' && (
                <div className="w-24 h-4 craft-tape mx-auto -mb-2 z-20 relative rotate-1" />
              )}

              <div
                className={`postit-base p-5 rounded-xs shadow-postit border ${
                  color === 'blue'
                    ? 'bg-[#DCF0FA] border-[#BCDCEC]'
                    : color === 'mint'
                    ? 'bg-[#DDF4EA] border-[#BDE4D2]'
                    : color === 'peach'
                    ? 'bg-[#FEE7DC] border-[#F2CBB8]'
                    : color === 'ivory'
                    ? 'bg-[#FDFBF7] border-[#E5DFD4]'
                    : 'bg-[#FFF6BA] border-[#EFE295]'
                }`}
                style={{ minHeight: '240px' }}
              >
                <div className="flex items-center justify-between text-[10px] font-ui text-black/60 mb-2 pb-1 border-b border-black/8">
                  <span className="font-bold text-[#2B729E]">#{categoryTag || '직장생활'}</span>
                  <span>[{role}] {companyType}</span>
                </div>

                <h4 className="font-ui font-bold text-sm text-[#112334] mb-2 leading-snug">
                  {title || '제목이 여기에 표시됩니다'}
                </h4>

                <div className="font-dakkuda text-base text-black/80 leading-relaxed line-clamp-5">
                  {content || '사무실에서 겪은 당황스러웠던 질문과 경험담이 아날로그 포스트잇 메모로 부착됩니다.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
