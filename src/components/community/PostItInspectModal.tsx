import React, { useState } from 'react';
import { PostItPost, PlacedSticker } from '../../types/community';
import { OfficeStickerSvg } from './OfficeStickerSvg.tsx';
import { OFFICE_STICKER_LIBRARY } from '@/data/officeData';
import { X, Sparkles, Plus, Building2, Clock, ThumbsUp } from 'lucide-react';
import { sound } from '../../utils/audio';

interface PostItInspectModalProps {
  post: PostItPost | null;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (post: PostItPost) => void;
  onStickSticker: (postId: string, stickerId: string, x: number, y: number) => void;
  activeStickerId: string | null;
  onOpenStickerDrawer: () => void;
}

export const PostItInspectModal: React.FC<PostItInspectModalProps> = ({
  post,
  isOpen,
  onClose,
  onAddComment,
  onStickSticker,
  activeStickerId,
  onOpenStickerDrawer,
}) => {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  if (!isOpen || !post) return null;

  const handlePaperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeStickerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(8, Math.min(88, clickX));
      const clampedY = Math.max(10, Math.min(88, clickY));

      sound.playStickSound();
      onStickSticker(post.id, activeStickerId, clampedX, clampedY);
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeStickerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
  };

  const activeStickerObj = activeStickerId
    ? OFFICE_STICKER_LIBRARY.find((s) => s.id === activeStickerId)
    : null;

  const getColorStyles = () => {
    switch (post.color) {
      case 'blue':
        return 'bg-[#DCF0FA] border-[#BCDCEC] text-[#132A3E]';
      case 'mint':
        return 'bg-[#DDF4EA] border-[#BDE4D2] text-[#123624]';
      case 'peach':
        return 'bg-[#FEE7DC] border-[#F2CBB8] text-[#3D2014]';
      case 'ivory':
        return 'bg-[#FDFBF7] border-[#E5DFD4] text-[#24211D]';
      case 'yellow':
      default:
        return 'bg-[#FFF6BA] border-[#EFE295] text-[#342A0D]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-2xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#EAE6DF] p-4 sm:p-8 rounded-2xl shadow-2xl border-2 border-[#D5CFC5] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/80 hover:bg-white text-[#112334] transition-colors shadow-xs"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Enlarged Post-it Sheet */}
        <div
          onClick={handlePaperClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorPos(null)}
          className={`postit-base rounded-xs p-6 sm:p-10 shadow-2xl border transition-all ${getColorStyles()} ${
            activeStickerId ? 'cursor-crosshair ring-2 ring-[#2B729E]' : ''
          }`}
          style={{ minHeight: '400px' }}
        >
          {/* Sticking Cursor Preview */}
          {activeStickerId && cursorPos && (
            <div
              className="absolute pointer-events-none z-40"
              style={{
                left: `${cursorPos.x}%`,
                top: `${cursorPos.y}%`,
                transform: 'translate(-50%, -50%) scale(1.15)',
              }}
            >
              <OfficeStickerSvg type={activeStickerObj?.iconType || 'coffee-drip'} size={50} />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#112334] text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-md font-ui">
                클릭하여 붙이기!
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between text-xs mb-4 pb-3 border-b border-black/10">
            <div className="flex items-center gap-2">
              <span className="font-ui font-bold text-xs text-[#2B729E] bg-[#2B729E]/10 px-2 py-0.5 rounded">
                #{post.categoryTag}
              </span>
              <span aria-hidden="true" className="text-black/20">·</span>
              <span className="text-black/60 flex items-center gap-1 font-ui">
                <Clock className="w-3.5 h-3.5" />
                {post.createdAt}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-ui text-xs font-semibold text-black/75">
              <Building2 className="w-3.5 h-3.5 text-black/40" />
              <span>{post.author.companyType}</span>
              <span className="text-[#2B729E]">[{post.author.role}]</span>
              <span>{post.author.nickname}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-ui font-extrabold text-xl sm:text-2xl text-[#112334] mb-3 leading-snug">
            {post.title}
          </h2>

          {/* Story Body */}
          <div className="font-dakkuda text-xl sm:text-2xl text-black/90 leading-relaxed mb-6">
            {post.highlightedText ? (
              <p>
                {post.content.split(post.highlightedText).map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <mark className="bg-[#2B729E]/25 px-1.5 py-0.5 rounded text-[#112334] font-bold underline decoration-[#2B729E] decoration-wavy decoration-2">
                        {post.highlightedText}
                      </mark>
                    )}
                  </React.Fragment>
                ))}
              </p>
            ) : (
              <p>{post.content}</p>
            )}
          </div>

          {/* Tape Comments Section */}
          <div className="mt-8 pt-5 border-t border-black/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-ui font-bold text-xs text-[#112334] flex items-center gap-1.5">
                <span>📎 부착된 테이프 조언</span>
                <span className="text-[#2B729E]">({post.comments.length}개)</span>
              </h4>
              <button
                onClick={() => onAddComment(post)}
                className="text-xs font-ui font-bold text-[#2B729E] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                테이프 조언 추가하기
              </button>
            </div>

            <div className="space-y-3">
              {post.comments.map((cmt, idx) => {
                const tapeStyle =
                  cmt.tapeStyle === 'blue'
                    ? 'bg-[#E5EEF5] border-[#9ABED8] text-[#132B40]'
                    : cmt.tapeStyle === 'craft'
                    ? 'bg-[#EFE2D2] border-[#C8B296] text-[#422C19]'
                    : cmt.tapeStyle === 'yellow'
                    ? 'bg-[#FFF9D6] border-[#DFD07D] text-[#3D3008]'
                    : 'bg-white/90 border-[#CBD4DC] text-[#1A2632]';

                return (
                  <div
                    key={cmt.id}
                    className={`p-3.5 rounded-xs border-t border-b scotch-tape shadow-xs ${tapeStyle}`}
                    style={{
                      transform: `rotate(${idx % 2 === 0 ? -0.5 : 0.7}deg)`,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-ui opacity-80 mb-1">
                      <span className="font-bold text-[#2B729E]">
                        [{cmt.authorRole}] {cmt.author}
                      </span>
                      <span>{cmt.createdAt}</span>
                    </div>
                    {cmt.targetSentence && (
                      <p className="text-xs font-ui text-[#58534C] italic mb-1 border-l-2 border-current pl-2">
                        인용: "{cmt.targetSentence}"
                      </p>
                    )}
                    <p className="font-dakkuda text-lg leading-relaxed">
                      "{cmt.content}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Placed Stickers Breakdown */}
          <div className="mt-8 pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-3 text-xs font-ui">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#112334]">부착된 공감 스티커:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {post.stickers.map((stk) => {
                  const sDef = OFFICE_STICKER_LIBRARY.find((s) => s.id === stk.stickerId);
                  return (
                    <span
                      key={stk.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 border border-[#D5CFC5] rounded-md shadow-2xs text-[11px]"
                    >
                      <OfficeStickerSvg type={sDef?.iconType || 'coffee-drip'} size={16} />
                      <span className="text-[#112334] font-medium">[{stk.authorRole}] {stk.author}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                sound.playPeelSound();
                onOpenStickerDrawer();
              }}
              className="px-3.5 py-1.5 bg-[#2B729E] hover:bg-[#205B80] text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFDC73]" />
              스티커 붙이기 모드
            </button>
          </div>

          {/* Render Physical Stickers on the Enlarged Post-it */}
          {post.stickers.map((stk: PlacedSticker) => {
            const stickerDef = OFFICE_STICKER_LIBRARY.find((s) => s.id === stk.stickerId);
            return (
              <div
                key={stk.id}
                className="absolute z-25 group/sticker cursor-pointer transition-transform hover:scale-130"
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale * 1.25})`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playStickSound();
                }}
              >
                <OfficeStickerSvg type={stickerDef?.iconType || 'coffee-drip'} size={48} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/sticker:block z-40 bg-[#112334] text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap font-ui pointer-events-none">
                  <span className="font-semibold text-[#FFDC73]">[{stk.authorRole}] {stk.author}</span>
                  <span> · {stickerDef?.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
