'use client';

import React, { useState, useRef } from 'react';
import { PostItPost, PlacedSticker } from '@/types/community';
import { OfficeStickerSvg } from './OfficeStickerSvg';
import { OFFICE_STICKER_LIBRARY } from '@/data/officeData';
import { MessageSquare, Plus, Sparkles, Building2, Move, Trash2, X, Radio } from 'lucide-react';
import { sound } from '@/utils/audio';

interface PostItNoteProps {
  post: PostItPost;
  onOpenInspect: (post: PostItPost) => void;
  onAddComment: (post: PostItPost) => void;
  onStickSticker: (postId: string, stickerId: string, x: number, y: number) => void;
  onRemoveSticker?: (postId: string, placedStickerId: string) => void;
  onMoveSticker?: (postId: string, placedStickerId: string, newX: number, newY: number) => void;
  activeStickerId: string | null;
  onOpenStickerDrawer: () => void;
  onOpenRadio?: (post: PostItPost) => void; // 인기 사연일 때만 전달됨 → 보이는 라디오로 듣기 버튼 표시
}

export const PostItNote: React.FC<PostItNoteProps> = ({
  post,
  onOpenInspect,
  onAddComment,
  onStickSticker,
  onRemoveSticker,
  onMoveSticker,
  activeStickerId,
  onOpenStickerDrawer,
  onOpenRadio,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggedSticker, setDraggedSticker] = useState<{ id: string; x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Background color mapping for realistic 3M sticky notes
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

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeStickerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(8, Math.min(88, clickX));
      const clampedY = Math.max(12, Math.min(85, clickY));

      sound.playStickSound();
      onStickSticker(post.id, activeStickerId, clampedX, clampedY);
      e.stopPropagation();
    } else if (selectedStickerId && onMoveSticker) {
      // If a sticker was clicked/selected, clicking another spot moves it there!
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(8, Math.min(88, clickX));
      const clampedY = Math.max(12, Math.min(85, clickY));

      sound.playStickSound();
      onMoveSticker(post.id, selectedStickerId, clampedX, clampedY);
      setSelectedStickerId(null);
      e.stopPropagation();
    } else {
      // Normal card click -> Open inspect
      onOpenInspect(post);
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

  return (
    <div
      className="relative transition-all duration-200 group"
      style={{
        transform: `rotate(${post.rotation}deg)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCursorPos(null);
      }}
    >
      {/* Top Fastener: Scotch tape or Silver clip */}
      {post.fastener === 'tape-clear' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-20 h-5 scotch-tape -rotate-1" />
      )}
      {post.fastener === 'tape-craft' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-24 h-5 craft-tape rotate-1" />
      )}
      {post.fastener === 'clip-silver' && (
        <div className="absolute -top-4 left-6 z-20">
          <svg width="20" height="38" viewBox="0 0 20 38" fill="none" className="drop-shadow-xs">
            <path
              d="M6 14 V28 C6 31 14 31 14 28 V10 C14 5 6 5 6 10 V25 C6 27 11 27 11 25 V14"
              stroke="#A6B0B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M6 14 V28 C6 31 14 31 14 28 V10 C14 5 6 5 6 10 V25 C6 27 11 27 11 25 V14"
              stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
            />
          </svg>
        </div>
      )}

      {/* Main 3M Sticky Post-it Body */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onMouseMove={handleMouseMove}
        className={`postit-base rounded-xs p-5 sm:p-6 border transition-all cursor-pointer ${getColorStyles()} ${
          isHovered ? 'shadow-postit-hover scale-[1.01]' : 'shadow-postit'
        } ${activeStickerId ? 'ring-2 ring-[#2B729E] ring-offset-2' : ''} ${
          selectedStickerId ? 'ring-1 ring-[#2B729E]/60' : ''
        }`}
        style={{ minHeight: '300px' }}
      >
        {/* Real-time Sticking Preview */}
        {activeStickerId && cursorPos && (
          <div
            className="absolute pointer-events-none z-40"
            style={{
              left: `${cursorPos.x}%`,
              top: `${cursorPos.y}%`,
              transform: 'translate(-50%, -50%) rotate(4deg) scale(1.1)',
            }}
          >
            <OfficeStickerSvg type={activeStickerObj?.iconType || 'coffee-drip'} size={44} />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#112334] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-xs">
              여기에 붙이기!
            </span>
          </div>
        )}

{/* Post-it Header: Category tag & Author */}
        <div className="flex items-start justify-between gap-2 text-xs mb-3 pb-2 border-b border-black/8 font-ui">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-semibold text-[11px] text-[#2B729E] tracking-tight break-keep leading-tight">
              #{post.categoryTag}
            </span>
            <span className="text-[10px] text-black/50 whitespace-nowrap font-normal">
              {post.createdAt}
              {post.isMine && (
                <span className="ml-1.5 px-1.5 py-px rounded-full bg-[#112334] text-white text-[9px] font-bold align-middle">
                  ✍️ 내 글
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-black/70 font-medium whitespace-nowrap shrink-0 pt-0.5">
            <Building2 className="w-3 h-3 text-black/40 shrink-0" />
            <span className="whitespace-nowrap">{post.author.companyType || '신입'}</span>
            <span className="text-[#2B729E] font-semibold whitespace-nowrap">[{post.author.role}]</span>
          </div>
        </div>

        {/* Story Title */}
        <h3 className="font-ui font-bold text-base sm:text-lg text-[#112334] leading-snug mb-2.5 break-keep">
          {post.title}
        </h3>

        {/* Story Body with Handwritten Rhythm & Highlight */}
        <div className="font-dakkuda text-lg text-black/85 leading-relaxed mb-5 break-keep">
          {post.highlightedText ? (
            <p className="break-keep">
              {post.content.split(post.highlightedText).map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <mark
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInspect(post);
                      }}
                      className="bg-[#2B729E]/20 px-1 py-0.5 rounded text-[#112334] font-bold underline decoration-[#2B729E] decoration-wavy decoration-1 cursor-pointer transition-colors hover:bg-[#2B729E]/35 break-keep"
                      title="클릭하여 선배/동기 덧글 보기"
                    >
                      {post.highlightedText}
                    </mark>
                  )}
                </React.Fragment>
              ))}
            </p>
          ) : (
            <p className="break-keep">{post.content}</p>
          )}
        </div>

        {/* 인기 사연: 보이는 라디오로 듣기 */}
        {onOpenRadio && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sound.playPageFlipSound();
              onOpenRadio(post);
            }}
            className="w-full -mt-2 mb-1 px-3 py-2 rounded-lg bg-[#102B46] hover:bg-[#1b3b5c] text-white font-ui text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="공감과 조언을 많이 받은 인기 사연이에요. DJ 하루 & 새봄의 보이는 라디오로 들어보세요"
          >
            <Radio className="w-3.5 h-3.5 text-[#E4572E] shrink-0" />
            <span className="whitespace-nowrap">인기 사연 · 라디오로 듣기</span>
          </button>
        )}

        {/* Masking Tape Comments (Attached beneath or overlapping post-it) */}
        {post.comments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-black/8 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-ui text-black/60 mb-1">
              <span className="flex items-center gap-1 font-semibold text-[#112334]">
                <MessageSquare className="w-3 h-3 text-[#2B729E]" />
                테이프 조언 ({post.comments.length})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInspect(post);
                }}
                className="text-[#2B729E] hover:underline"
              >
                전체보기
              </button>
            </div>

            {/* Display up to 2 tape comments */}
            {post.comments.slice(0, 2).map((cmt, idx) => {
              const tapeStyle =
                cmt.tapeStyle === 'blue'
                  ? 'bg-[#E5EEF5] border-[#9ABED8] text-[#132B40]'
                  : cmt.tapeStyle === 'craft'
                  ? 'bg-[#EFE2D2] border-[#C8B296] text-[#422C19]'
                  : cmt.tapeStyle === 'yellow'
                  ? 'bg-[#FFF9D6] border-[#DFD07D] text-[#3D3008]'
                  : 'bg-white/85 border-[#CBD4DC] text-[#1A2632]';

              return (
                <div
                  key={cmt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenInspect(post);
                  }}
                  className={`p-2 px-3 text-xs font-handwriting rounded-xs shadow-2xs border-t border-b scotch-tape cursor-pointer transition-transform hover:scale-[1.01] ${tapeStyle}`}
                  style={{
                    transform: `rotate(${idx % 2 === 0 ? -0.8 : 0.6}deg)`,
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-ui opacity-75 mb-0.5 whitespace-nowrap">
                    <span className="font-semibold text-[#2B729E] whitespace-nowrap">[{cmt.authorRole}] {cmt.author}</span>
                    <span className="whitespace-nowrap">{cmt.createdAt}</span>
                  </div>
                  {cmt.targetSentence && (
                    <p className="text-[10px] font-ui text-[#58534C] italic mb-0.5 border-l-2 border-current pl-1.5 line-clamp-1 break-keep">
                      인용: "{cmt.targetSentence}"
                    </p>
                  )}
                  <p className="text-sm font-dakkuda leading-snug line-clamp-2 break-keep">
                    "{cmt.content}"
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions & Sticker Summary */}
        <div className="mt-4 pt-2.5 flex items-center justify-between gap-2 text-xs text-black/70">
          {/* Placed Stickers Count */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
              {post.stickers.slice(0, 3).map((stk) => {
                const sDef = OFFICE_STICKER_LIBRARY.find((s) => s.id === stk.stickerId);
                return (
                  <div
                    key={stk.id}
                    className="w-5 h-5 rounded-full bg-white border border-[#D5CDBC] flex items-center justify-center shadow-xs shrink-0"
                    title={`${stk.author}의 ${sDef?.name}`}
                  >
                    <OfficeStickerSvg type={sDef?.iconType || 'coffee-drip'} size={14} />
                  </div>
                );
              })}
            </div>
            <span className="font-ui text-[11px] font-semibold text-[#112334] whitespace-nowrap shrink-0">
              스티커 {post.stickers.length}개
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onAddComment(post)}
              className="px-2 py-1 text-[11px] font-ui font-medium rounded bg-black/5 hover:bg-black/10 text-[#112334] transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              title="마스킹 테이프로 조언/댓글 달기"
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">테이프 조언</span>
            </button>
            <button
              onClick={() => {
                sound.playPeelSound();
                onOpenStickerDrawer();
              }}
              className="px-2.5 py-1 text-[11px] font-ui font-semibold rounded bg-[#2B729E] hover:bg-[#205B80] text-white transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0"
              title="스티커 서랍 열기"
            >
              <Sparkles className="w-3 h-3 text-[#FFDC73] shrink-0" />
              <span className="whitespace-nowrap">스티커</span>
            </button>
          </div>
        </div>

        {/* Placed Stickers on the Post-it Note */}
        {post.stickers.map((stk: PlacedSticker) => {
          const stickerDef = OFFICE_STICKER_LIBRARY.find((s) => s.id === stk.stickerId);
          const isSelected = selectedStickerId === stk.id;
          const isDragging = draggedSticker?.id === stk.id;
          const displayX = isDragging ? draggedSticker.x : stk.x;
          const displayY = isDragging ? draggedSticker.y : stk.y;

          return (
            <div
              key={stk.id}
              className={`absolute z-25 group/sticker cursor-grab active:cursor-grabbing transition-transform select-none ${
                isSelected ? 'ring-2 ring-[#2B729E] ring-offset-2 rounded-full scale-120' : 'hover:scale-115'
              }`}
              style={{
                left: `${displayX}%`,
                top: `${displayY}%`,
                transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale})`,
              }}
              onPointerDown={(e) => {
                // If clicking toolbar or any button inside it, do not start drag or capture pointer
                if ((e.target as HTMLElement).closest('[data-toolbar]')) {
                  e.stopPropagation();
                  return;
                }
                e.stopPropagation();
                setSelectedStickerId(stk.id);
                sound.playStickSound();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {}
                setDraggedSticker({ id: stk.id, x: stk.x, y: stk.y });
              }}
              onPointerMove={(e) => {
                if (draggedSticker?.id === stk.id && cardRef.current) {
                  const rect = cardRef.current.getBoundingClientRect();
                  const newX = Math.round(Math.max(8, Math.min(88, ((e.clientX - rect.left) / rect.width) * 100)) * 10) / 10;
                  const newY = Math.round(Math.max(12, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100)) * 10) / 10;
                  setDraggedSticker({ id: stk.id, x: newX, y: newY });
                }
              }}
              onPointerUp={(e) => {
                if (draggedSticker?.id === stk.id) {
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {}
                  if (onMoveSticker && (draggedSticker.x !== stk.x || draggedSticker.y !== stk.y)) {
                    sound.playStickSound();
                    onMoveSticker(post.id, stk.id, draggedSticker.x, draggedSticker.y);
                  }
                  setDraggedSticker(null);
                }
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-toolbar]')) {
                  e.stopPropagation();
                  return;
                }
                e.stopPropagation();
                setSelectedStickerId(stk.id);
              }}
              title={`${stk.author} (${stk.authorRole}): ${stickerDef?.name} (클릭하여 떼기 or 드래그로 이동)`}
            >
              <OfficeStickerSvg type={stickerDef?.iconType || 'coffee-drip'} size={40} />
              
              {/* Selected Action Toolbar: Appears directly on click and stays visible! */}
              {isSelected ? (
                <div
                  data-toolbar="true"
                  className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-[#112334] text-white text-[11px] font-ui px-2.5 py-1 rounded-full shadow-2xl border border-[#2B729E] whitespace-nowrap animate-in fade-in zoom-in-95 cursor-default"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[#FFDC73] text-[10px] font-bold flex items-center gap-1">
                    <Move className="w-3 h-3 text-[#FFDC73]" /> 드래그 이동
                  </span>
                  <span className="text-white/20">|</span>
                  {onRemoveSticker && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        sound.playPeelSound();
                        setSelectedStickerId(null);
                        onRemoveSticker(post.id, stk.id);
                      }}
                      className="px-2.5 py-0.5 rounded bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      title="스티커 떼기"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> 떼기
                    </button>
                  )}
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedStickerId(null);
                    }}
                    className="p-0.5 text-white/50 hover:text-white rounded-full transition-colors ml-0.5 cursor-pointer"
                    title="선택 해제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                /* Simple Hover Hint */
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/sticker:flex items-center gap-1.5 z-40 bg-[#112334] text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap font-ui pointer-events-none">
                  <span className="font-semibold text-[#FFDC73]">[{stk.authorRole}] {stk.author}</span>
                  <span>· {stickerDef?.name}</span>
                  <span className="text-white/50">(클릭시 떼기/이동)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
