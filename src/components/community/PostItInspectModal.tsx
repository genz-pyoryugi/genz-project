'use client';

import React, { useState, useRef } from 'react';
import { PostItPost, PlacedSticker } from '@/types/community';
import { OfficeStickerSvg } from './OfficeStickerSvg';
import { OFFICE_STICKER_LIBRARY } from '@/data/officeData';
import { X, Sparkles, Plus, Building2, Clock, ThumbsUp, Move, Trash2, Radio } from 'lucide-react';
import { sound } from '@/utils/audio';
import { ReportButton } from './ReportButton';
import { isHidden, ReportReason } from '@/lib/community/report';

interface PostItInspectModalProps {
  post: PostItPost | null;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (post: PostItPost) => void;
  onRemoveComment?: (postId: string, commentId: string) => void;
  onStickSticker: (postId: string, stickerId: string, x: number, y: number) => void;
  onRemoveSticker?: (postId: string, placedStickerId: string) => void;
  onMoveSticker?: (postId: string, placedStickerId: string, newX: number, newY: number) => void;
  activeStickerId: string | null;
  onOpenStickerDrawer: () => void;
  isMacStyle?: boolean;
  onOpenRadio?: (post: PostItPost) => void; // 이 고민과 테이프 조언으로 보이는 라디오 방송 듣기
  // 신고: 글은 신고하면 내 화면에서 가려지고(상세창도 닫힘), 조언은 그 자리에 "가려진 조언"으로 표시
  onReportPost?: (postId: string, reason: ReportReason) => void;
  onReportComment?: (postId: string, commentId: string, reason: ReportReason) => void;
  onUndoReportComment?: (postId: string, commentId: string) => void;
  onUndoReportPost?: (postId: string) => void;
}

export const PostItInspectModal: React.FC<PostItInspectModalProps> = ({
  post,
  isOpen,
  onClose,
  onAddComment,
  onRemoveComment,
  onStickSticker,
  onRemoveSticker,
  onMoveSticker,
  activeStickerId,
  onOpenStickerDrawer,
  onOpenRadio,
  onReportPost,
  onReportComment,
  onUndoReportComment,
  onUndoReportPost,
}) => {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggedSticker, setDraggedSticker] = useState<{ id: string; x: number; y: number } | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

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
    } else if (selectedStickerId && onMoveSticker) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(8, Math.min(88, clickX));
      const clampedY = Math.max(10, Math.min(88, clickY));

      sound.playStickSound();
      onMoveSticker(post.id, selectedStickerId, clampedX, clampedY);
      setSelectedStickerId(null);
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
          ref={paperRef}
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
              {onReportPost && !post.isMine && !isHidden(post) && (
                <ReportButton className="ml-1" onReport={(reason) => onReportPost(post.id, reason)} />
              )}
            </div>
          </div>

          {/* 신고로 가린 글 안내 (가린 글 보기에서 연 경우) */}
          {isHidden(post) && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg border border-dashed border-[#B4232F]/40 bg-[#FDECEE] text-xs font-ui text-[#7A1F2B] flex items-center justify-between gap-2">
              <span>🚩 {post.reportedByMe ? '내가 신고해서 가린 글이에요.' : '신고가 쌓여 가려진 글이에요.'}</span>
              {post.reportedByMe && onUndoReportPost && (
                <button
                  type="button"
                  onClick={() => onUndoReportPost(post.id)}
                  className="text-[11px] font-bold text-[#2B729E] hover:underline"
                >
                  신고 취소
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <h2 className="font-ui font-extrabold text-xl sm:text-2xl text-[#112334] mb-3 leading-snug break-keep">
            {post.title}
          </h2>

          {/* Story Body */}
          <div className="font-dakkuda text-xl sm:text-2xl text-black/90 leading-relaxed mb-6 break-keep">
            {post.highlightedText ? (
              <p className="break-keep">
                {post.content.split(post.highlightedText).map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <mark className="bg-[#2B729E]/25 px-1.5 py-0.5 rounded text-[#112334] font-bold underline decoration-[#2B729E] decoration-wavy decoration-2 break-keep">
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

          {/* 보이는 라디오로 듣기 */}
          {onOpenRadio && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sound.playPageFlipSound();
                onOpenRadio(post);
              }}
              className="w-full mb-2 px-4 py-3 rounded-xl bg-[#102B46] hover:bg-[#1b3b5c] text-white font-ui text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#E4572E]" />
              이 사연, 보이는 라디오로 듣기
              <span className="text-[11px] font-medium text-[#A9C4CF]">· DJ 하루 &amp; 새봄</span>
            </button>
          )}

          {/* Tape Comments Section */}
          <div id="tutorial-target-tape-comments" className="mt-8 pt-5 border-t border-black/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-ui font-bold text-xs text-[#112334] flex items-center gap-1.5">
                <span>📎 부착된 테이프 조언</span>
                <span className="text-[#2B729E]">({post.comments.filter((c) => !isHidden(c)).length}개)</span>
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

                if (isHidden(cmt)) {
                  return (
                    <div
                      key={cmt.id}
                      className="px-3.5 py-2.5 rounded-lg border border-dashed border-black/15 bg-black/[0.03] text-xs font-ui text-[#857F76] flex items-center justify-between gap-2"
                    >
                      <span>🚩 신고로 가려진 조언이에요.</span>
                      {cmt.reportedByMe && onUndoReportComment && (
                        <button
                          type="button"
                          onClick={() => onUndoReportComment(post.id, cmt.id)}
                          className="text-[11px] font-bold text-[#2B729E] hover:underline"
                        >
                          신고 취소
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={cmt.id}
                    className={`p-3.5 rounded-xs border-t border-b scotch-tape shadow-xs ${tapeStyle}`}
                    style={{
                      transform: `rotate(${idx % 2 === 0 ? -0.5 : 0.7}deg)`,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-ui opacity-80 mb-1.5 whitespace-nowrap">
                      <span className="font-bold text-[#2B729E] whitespace-nowrap">
                        [{cmt.authorRole}] {cmt.author}
                      </span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="whitespace-nowrap">{cmt.createdAt}</span>
                        {onReportComment && (
                          <ReportButton onReport={(reason) => onReportComment(post.id, cmt.id, reason)} />
                        )}
                        {onRemoveComment && (
                          <button
                            onClick={() => {
                              sound.playPeelSound();
                              onRemoveComment(post.id, cmt.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                            title="테이프 조언 삭제"
                          >
                            삭제 ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {cmt.targetSentence && (
                      <p className="text-xs font-ui text-[#58534C] italic mb-1.5 border-l-2 border-current pl-2 break-keep">
                        인용: "{cmt.targetSentence}"
                      </p>
                    )}
                    <p className="font-dakkuda text-lg leading-relaxed break-keep">
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
                      {onRemoveSticker && (
                        <button
                          onClick={() => {
                            sound.playPeelSound();
                            onRemoveSticker(post.id, stk.id);
                          }}
                          className="ml-1 text-red-500 hover:text-red-700 hover:bg-red-100 p-0.5 rounded text-[10px]"
                          title="스티커 떼기"
                        >
                          ✕
                        </button>
                      )}
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
            const isSelected = selectedStickerId === stk.id;
            const isDragging = draggedSticker?.id === stk.id;
            const displayX = isDragging ? draggedSticker.x : stk.x;
            const displayY = isDragging ? draggedSticker.y : stk.y;

            return (
              <div
                key={stk.id}
                className={`absolute z-25 group/sticker cursor-grab active:cursor-grabbing transition-transform select-none ${
                  isSelected ? 'ring-2 ring-[#2B729E] ring-offset-2 rounded-full scale-135' : 'hover:scale-120'
                }`}
                style={{
                  left: `${displayX}%`,
                  top: `${displayY}%`,
                  transform: `translate(-50%, -50%) rotate(${stk.rotation}deg) scale(${stk.scale * 1.25})`,
                }}
                onPointerDown={(e) => {
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
                  if (draggedSticker?.id === stk.id && paperRef.current) {
                    const rect = paperRef.current.getBoundingClientRect();
                    const newX = Math.round(Math.max(8, Math.min(88, ((e.clientX - rect.left) / rect.width) * 100)) * 10) / 10;
                    const newY = Math.round(Math.max(10, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100)) * 10) / 10;
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
                <OfficeStickerSvg type={stickerDef?.iconType || 'coffee-drip'} size={48} />
                
                {/* Selected Action Toolbar: Stays visible until closed! */}
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/sticker:block z-40 bg-[#112334] text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap font-ui pointer-events-none">
                    <span className="font-semibold text-[#FFDC73]">[{stk.authorRole}] {stk.author}</span>
                    <span> · {stickerDef?.name}</span>
                    <span className="text-white/50 text-[10px] ml-1">(클릭시 떼기/이동)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
