import React, { useState } from 'react';
import { PostItPost, ChapterId, PostItColor, FastenerType } from '../../types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { X, PenTool } from 'lucide-react';
import { sound } from '../../utils/audio';
import { ModerationResult } from '@/types/moderation';
import { LIMITS } from '@/lib/community/validation';
import { ModerationNotice, applyMasks, localCheck, requestModeration } from './ModerationNotice';

interface PostItWriteModalProps {
  currentChapterId: ChapterId;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPost: Omit<PostItPost, 'id' | 'createdAt' | 'stickers' | 'comments'>) => void;
}

/** 주제(챕터)별 추천 태그 */
const chapterKeywords = (id: ChapterId): string[] =>
  CHAPTER_LIST.find((c) => c.id === id)?.recommendedKeywords ?? [];

/** 모든 주제의 추천 태그 — 이 중 하나면 "추천 태그를 쓰는 중", 아니면 사용자가 직접 입력한 태그 */
const ALL_KEYWORDS = new Set(CHAPTER_LIST.flatMap((c) => c.recommendedKeywords));

export const PostItWriteModal: React.FC<PostItWriteModalProps> = ({
  currentChapterId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [chapterId, setChapterId] = useState<ChapterId>(currentChapterId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  // 태그는 고른 주제의 첫 번째 추천 키워드로 시작하고, 주제를 바꾸면 함께 바뀐다
  const [categoryTag, setCategoryTag] = useState(() => chapterKeywords(currentChapterId)[0] ?? '');
  const [authorNickname, setAuthorNickname] = useState('신입사원A');
  const [role, setRole] = useState<'신입' | '인턴' | '1년차' | '취준생'>('신입');
  const [companyType, setCompanyType] = useState('IT스타트업');
  const [color, setColor] = useState<PostItColor>('yellow');
  const [fastener, setFastener] = useState<FastenerType>('tape-clear');
  const [highlightedText, setHighlightedText] = useState('');
  // 등록 전 검사 (형식 · 개인정보 · AI 표현 검사)
  const [checking, setChecking] = useState(false);
  const [modResult, setModResult] = useState<ModerationResult | null>(null);

  if (!isOpen) return null;

  /** 검사를 통과한(또는 사용자가 안내를 확인한) 내용으로 실제 등록 */
  const submitPost = (values: { title: string; content: string; highlightedText: string }) => {
    sound.playStickSound();
    const randomRot = Math.round((Math.random() * 2.8 - 1.4) * 10) / 10;

    onSubmit({
      chapterId,
      title: values.title.trim(),
      content: values.content.trim(),
      categoryTag: categoryTag.trim() || '직장생활 고민',
      author: {
        nickname: authorNickname.trim() || '익명의 신입',
        role,
        companyType,
      },
      color,
      fastener,
      rotation: randomRot,
      highlightedText: values.highlightedText.trim() || undefined,
    });

    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;

    // ① 형식 검사는 브라우저에서 바로
    const local = localCheck('post', { title, content, nickname: authorNickname });
    if (local) return setModResult(local);

    // ② 개인정보 · ③ AI 표현 검사는 서버에서 (최종 기준)
    setChecking(true);
    const result = await requestModeration({ kind: 'post', title, content, nickname: authorNickname });
    setChecking(false);

    if (result.ok) submitPost({ title, content, highlightedText });
    else setModResult(result);
  };

  /** 내용을 고치면 이전 검사 결과는 지운다 */
  const edited = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    if (modResult) setModResult(null);
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
                  // 추천 태그를 쓰고 있었거나 비어 있으면 새 주제의 추천 태그로 바꾼다 (직접 입력한 태그는 그대로)
                  if (!categoryTag.trim() || ALL_KEYWORDS.has(categoryTag.trim())) {
                    setCategoryTag(chapterKeywords(next)[0] ?? '');
                  }
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
                  onChange={(e) => setCategoryTag(e.target.value)}
                  placeholder="예: 첫인사"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                  maxLength={10}
                />
              </div>
            </div>

            {/* 고른 주제의 추천 태그: 눌러서 바로 선택 */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-1">
              <span className="text-[11px] font-ui text-[#736D64] mr-0.5">추천 태그</span>
              {chapterKeywords(chapterId).map((kw) => (
                <button
                  type="button"
                  key={kw}
                  onClick={() => setCategoryTag(kw)}
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-ui transition-colors ${
                    categoryTag.trim() === kw
                      ? 'bg-[#2B729E] border-[#2B729E] text-white font-bold'
                      : 'bg-white border-[#D5CFC5] text-[#2B729E] hover:border-[#2B729E]'
                  }`}
                >
                  #{kw}
                </button>
              ))}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                포스트잇 제목 (한 줄 질문이나 상황)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => edited(setTitle)(e.target.value)}
                placeholder="예: 출근 첫날 점심시간... 혼밥해도 되나요?"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-sm text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                maxLength={LIMITS.title.max}
                required
              />
              <p className="text-right text-[11px] font-ui text-[#857F76] mt-1">
                {title.trim().length}/{LIMITS.title.max}자 · {LIMITS.title.min}자 이상
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                상황 설명 및 고민 내용
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => edited(setContent)(e.target.value)}
                placeholder="실제 회사에서 겪은 당황스러운 순간이나, 혼자 끙끙 앓았던 질문을 편하게 적어주세요..."
                className="w-full p-3 rounded-lg bg-white border border-[#D5CFC5] text-base font-dakkuda text-[#112334] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                maxLength={LIMITS.content.max}
                required
              />
              <p className="flex justify-between text-[11px] font-ui text-[#857F76] mt-1">
                <span>🔒 등록 전에 개인정보(전화번호·실명·회사명 등)와 표현을 검사해요.</span>
                <span>
                  {content.trim().length}/{LIMITS.content.max}자 · {LIMITS.content.min}자 이상
                </span>
              </p>
            </div>

            {/* Highlight quote */}
            <div>
              <label className="block text-xs font-ui font-medium text-[#736D64] mb-1">
                형광펜 칠할 핵심 문장 (선택)
              </label>
              <input
                type="text"
                value={highlightedText}
                onChange={(e) => edited(setHighlightedText)(e.target.value)}
                placeholder="본문 중 다른 동기들이 집중해서 봐주길 바라는 문장"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
              />
            </div>

            {/* 등록 전 검사 결과 */}
            <ModerationNotice
              checking={checking}
              result={modResult}
              onMaskAndSubmit={() =>
                modResult &&
                submitPost({
                  title: applyMasks(title, modResult),
                  content: applyMasks(content, modResult),
                  highlightedText: applyMasks(highlightedText, modResult),
                })
              }
              onSubmitAnyway={() => submitPost({ title, content, highlightedText })}
            />

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
                disabled={checking}
                className="px-5 py-2 text-xs font-ui font-bold text-white bg-[#112334] hover:bg-[#203548] disabled:opacity-60 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5" />
                {checking ? '검사 중…' : '포스트잇 붙이기'}
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
