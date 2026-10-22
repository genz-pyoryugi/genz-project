import React, { useState } from 'react';
import { PostItPost, TapeComment } from '../../types/community';
import { X, Send } from 'lucide-react';
import { sound } from '../../utils/audio';
import { ModerationResult } from '@/types/moderation';
import { LIMITS } from '@/lib/community/validation';
import { ModerationNotice, applyMasks, localCheck, requestModeration } from './ModerationNotice';

interface TapeCommentModalProps {
  post: PostItPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitComment: (
    postId: string,
    comment: Omit<TapeComment, 'id' | 'createdAt' | 'likes'>
  ) => void;
}

export const TapeCommentModal: React.FC<TapeCommentModalProps> = ({
  post,
  isOpen,
  onClose,
  onSubmitComment,
}) => {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('3년차선배');
  const [authorRole, setAuthorRole] = useState<TapeComment['authorRole']>('선배');
  const [tapeStyle, setTapeStyle] = useState<TapeComment['tapeStyle']>('scotch');
  const [selectedQuote, setSelectedQuote] = useState('');
  // 등록 전 검사 (형식 · 개인정보 · AI 표현 검사)
  const [checking, setChecking] = useState(false);
  const [modResult, setModResult] = useState<ModerationResult | null>(null);

  if (!isOpen || !post) return null;

  /** 검사를 통과한(또는 사용자가 안내를 확인한) 조언으로 실제 등록 */
  const submitComment = (text: string) => {
    sound.playTapeSnipSound();
    onSubmitComment(post.id, {
      author: authorName.trim() || '익명의 동료',
      authorRole,
      content: text.trim(),
      tapeStyle,
      targetSentence: selectedQuote || undefined,
    });

    setContent('');
    setSelectedQuote('');
    setModResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;

    // ① 형식 검사는 브라우저에서 바로
    const local = localCheck('comment', { content, nickname: authorName });
    if (local) return setModResult(local);

    // ② 개인정보 · ③ AI 표현 검사(욕설·비하, 공격적인 말투)는 서버에서
    setChecking(true);
    const result = await requestModeration({ kind: 'comment', content, nickname: authorName, postTitle: post.title });
    setChecking(false);

    if (result.ok) submitComment(content);
    else setModResult(result);
  };

  const tapeColors: {
    id: TapeComment['tapeStyle'];
    name: string;
    bgClass: string;
    borderClass: string;
    textColor: string;
  }[] = [
    { id: 'scotch', name: '3M 반투명 매직테이프', bgClass: 'bg-white/80', borderClass: 'border-[#CBD4DC]', textColor: 'text-[#1A2632]' },
    { id: 'blue', name: '오피스 블루 테이프', bgClass: 'bg-[#E5EEF5]', borderClass: 'border-[#9ABED8]', textColor: 'text-[#132B40]' },
    { id: 'craft', name: '서류 크라프트 테이프', bgClass: 'bg-[#EFE2D2]', borderClass: 'border-[#C8B296]', textColor: 'text-[#422C19]' },
    { id: 'yellow', name: '포스트잇 옐로우 테이프', bgClass: 'bg-[#FFF9D6]', borderClass: 'border-[#DFD07D]', textColor: 'text-[#3D3008]' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] w-full max-w-lg my-auto rounded-2xl shadow-2xl border border-[#D5CFC5] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#EAE6DF] border-b border-[#D5CFC5] flex items-center justify-between">
          <div>
            <h3 className="font-ui font-bold text-base text-[#112334]">
              테이프 조언 남기기
            </h3>
            <p className="text-[11px] font-ui text-[#736D64] mt-0.5">
              "{post.title}" 포스트잇에 동기와 선배의 현실 조언을 붙여주세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#DCD7CD] text-[#58534C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Author Role & Nickname */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                신분/역할
              </label>
              <select
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value as TapeComment['authorRole'])}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
              >
                <option value="신입">신입 (동기)</option>
                <option value="선배">선배 (사수)</option>
                <option value="팀장">팀장</option>
                <option value="취준생">취준생</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
                닉네임
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="예: 3년차마케터, 퇴근요정"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
                maxLength={15}
                required
              />
            </div>
          </div>

          {/* Tape Style Selector */}
          <div>
            <label className="block text-xs font-ui font-bold text-[#112334] mb-1.5">
              테이프 디자인 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tapeColors.map((tape) => (
                <button
                  type="button"
                  key={tape.id}
                  onClick={() => setTapeStyle(tape.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all scotch-tape ${tape.bgClass} ${tape.borderClass} ${
                    tapeStyle === tape.id
                      ? 'ring-2 ring-[#2B729E] font-bold shadow-xs'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className={`text-xs font-ui ${tape.textColor}`}>
                    {tape.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Quote Target */}
          <div>
            <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
              인용 문장 (선택)
            </label>
            <select
              value={selectedQuote}
              onChange={(e) => setSelectedQuote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#D5CFC5] text-xs text-[#112334] focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
            >
              <option value="">(특정 문장 없이 포스트잇 하단에 부착)</option>
              {post.content.split('. ').map((s, idx) => {
                const sentence = s.trim();
                if (!sentence) return null;
                return (
                  <option key={idx} value={sentence}>
                    {sentence.length > 40 ? sentence.slice(0, 40) + '...' : sentence}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Comment Content */}
          <div>
            <label className="block text-xs font-ui font-bold text-[#112334] mb-1">
              조언 / 답변 내용
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (modResult) setModResult(null); // 고치면 이전 검사 결과는 지운다
              }}
              placeholder="경험에서 우러나온 실전 대처법이나 따뜻한 응원의 말을 적어주세요..."
              className="w-full p-3 rounded-lg bg-white border border-[#D5CFC5] text-base font-dakkuda text-[#112334] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2B729E]"
              maxLength={LIMITS.comment.max}
              required
            />
            <div className="flex justify-between text-[11px] font-ui text-[#857F76] mt-1">
              <span>🔒 등록 전에 개인정보와 표현(욕설·비하·공격적인 말투)을 검사해요.</span>
              <span>
                {content.trim().length}/{LIMITS.comment.max} · {LIMITS.comment.min}자 이상
              </span>
            </div>
          </div>

          {/* 등록 전 검사 결과 */}
          <ModerationNotice
            checking={checking}
            result={modResult}
            onMaskAndSubmit={() => modResult && submitComment(applyMasks(content, modResult))}
            onUseSuggestion={() => {
              if (!modResult?.suggestion) return;
              setContent(modResult.suggestion.slice(0, LIMITS.comment.max));
              setModResult(null); // 바꾼 문장을 확인하고 다시 [테이프 붙이기]를 누르면 다시 검사
            }}
            onSubmitAnyway={() => submitComment(content)}
          />

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[#E8E2D8]">
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
              className="px-4 py-2 text-xs font-ui font-semibold text-white bg-[#112334] hover:bg-[#203548] disabled:opacity-60 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {checking ? '검사 중…' : '테이프 붙이기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
