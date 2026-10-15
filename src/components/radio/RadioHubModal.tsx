'use client';

// 오피스상담소의 "보이는 라디오" 입구
// 7대 카테고리별 인기 사연(공감 스티커 + 테이프 조언을 가장 많이 받은 포스트잇 1개씩) 중 하나를 골라 방송을 듣는다.

import React, { useEffect } from 'react';
import { X, Play, MessageSquare, Sparkles } from 'lucide-react';
import { PostItPost } from '@/types/community';
import { CHAPTER_LIST } from '@/data/officeData';

interface RadioHubModalProps {
  posts: PostItPost[]; // 챕터 순서대로 정렬된 챕터별 라디오 사연
  onSelect: (post: PostItPost) => void;
  onClose?: () => void; // 없으면 닫기 버튼을 숨긴다 (페이지로 쓸 때)
  // modal: 고민상담소 위에 뜨는 창 / page: 단독 페이지 (메인 화면 이어폰 → 사무실 팝업 안에 열림)
  variant?: 'modal' | 'page';
}

export const RadioHubModal: React.FC<RadioHubModalProps> = ({ posts, onSelect, onClose, variant = 'modal' }) => {
  const isPage = variant === 'page';

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={
        isPage
          ? 'min-h-screen flex justify-center p-3 sm:p-6 bg-[#F6F4EC]'
          : 'fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150'
      }
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-xl rounded-[22px] bg-[#F6F4EC] font-ui text-[#102B46] overflow-hidden ${
          isPage ? 'h-fit shadow-md' : 'my-auto shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-[#102B46] text-[#F6F4EC] px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex -space-x-3 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/radio/dj-cat.png" alt="선배 DJ 하루" className="w-11 h-11 rounded-full bg-[#e0f7ff] border-2 border-[#eafaff] object-contain" style={{ filter: 'url(#portrait-cutout)' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/radio/dj-dog.png" alt="신입 DJ 새봄" className="w-11 h-11 rounded-full bg-[#fff8e9] border-2 border-[#fffaf0] object-contain" style={{ filter: 'url(#portrait-cutout)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#E4572E] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E4572E] animate-pulse" /> ON AIR
                </p>
                <h2 className="text-lg font-extrabold tracking-tight">오피스 라디오</h2>
                <p className="text-xs text-[#A9C4CF] break-keep">
                  7대 카테고리마다 공감과 조언을 가장 많이 받은 사연을 DJ 하루 &amp; 새봄이 읽어 드려요
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 사연 목록 */}
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {posts.length === 0 && (
            <p className="py-8 text-center text-sm text-[#5E6F7C] break-keep">
              아직 라디오로 소개할 사연이 없어요. 포스트잇에 테이프 조언과 공감 스티커가 모이면 방송돼요!
            </p>
          )}

          {posts.map((post) => {
            const chapter = CHAPTER_LIST.find((c) => c.id === post.chapterId);
            return (
              <button
                key={post.id}
                onClick={() => onSelect(post)}
                className="group w-full text-left flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white border border-[#D6E2E5] hover:border-[#397C9B] hover:shadow-md transition-all cursor-pointer"
              >
                <span className="shrink-0 w-9 text-center text-lg font-black text-[#397C9B] tabular-nums">{chapter?.number ?? post.chapterId}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#397C9B] truncate">
                    {chapter?.title ?? ''} · #{post.categoryTag}
                  </p>
                  <p className="text-sm font-bold leading-snug break-keep line-clamp-2">{post.title}</p>
                  <p className="mt-1 flex items-center gap-3 text-[11px] text-[#5E6F7C]">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> 테이프 조언 {post.comments.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 공감 스티커 {post.stickers.length}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 w-10 h-10 rounded-full bg-[#102B46] group-hover:bg-[#1b3b5c] text-white grid place-items-center transition-colors">
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DJ 이미지의 검은 배경을 화면에서만 투명하게 */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="portrait-cutout" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  100 100 100 0 0" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
