'use client';

// 내 보관함: 이 브라우저에서 내가 쓴 포스트잇 목록 — 바로 보기 · 삭제 (삭제는 한 번 더 확인)
import React, { useEffect, useState } from 'react';
import { Archive, Trash2, X, MessageSquare, Sparkles } from 'lucide-react';
import { PostItPost } from '../../types/community';
import { CHAPTER_LIST } from '../../data/officeData';

/** 내가 쓴 포스트잇인지: 새로 쓴 글에는 isMine 이 붙고, 예전에 쓴 글은 id 가 'post-<13자리 시각>' 이다 (기본 예시 글은 제외) */
export const isMyPost = (p: PostItPost) => p.isMine === true || /^post-\d{13}$/.test(p.id);

const writtenAt = (p: PostItPost) => {
  const t = Number(p.id.replace(/^post-/, ''));
  if (!Number.isFinite(t) || t < 1e12) return p.createdAt;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(t));
};

export const MyPostsModal: React.FC<{
  isOpen: boolean;
  posts: PostItPost[];
  onClose: () => void;
  onOpenPost: (post: PostItPost) => void;
  onDelete: (postId: string) => void;
}> = ({ isOpen, posts, onClose, onOpenPost, onDelete }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const mine = posts.filter(isMyPost);
  const chapterName = (id: string) => CHAPTER_LIST.find((c) => c.id === id)?.title ?? '';

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="my-posts-title"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#F6F4EC] shadow-2xl overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#E5DFD4]">
          <div>
            <h2 id="my-posts-title" className="flex items-center gap-2 text-lg font-extrabold text-[#112334]">
              <Archive className="w-5 h-5 text-[#2B729E]" /> 내 보관함 <span className="text-sm font-bold text-[#2B729E]">{mine.length}</span>
            </h2>
            <p className="mt-1 text-xs text-[#5E6F7C]">내가 쓴 포스트잇을 모아 봤어요. 이 브라우저에만 저장돼요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="내 보관함 닫기" className="p-1.5 rounded-full hover:bg-black/5 text-[#112334]">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {mine.length === 0 ? (
            <div className="py-14 text-center text-sm text-[#5E6F7C]">
              <p className="font-bold text-[#112334] mb-1">아직 쓴 포스트잇이 없어요</p>
              <p>[포스트잇 쓰기]로 고민을 남기면 여기에 모여요.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {mine.map((p) => (
                <li key={p.id} className="rounded-xl bg-white border border-[#E5DFD4] p-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#5E6F7C]">
                    <span className="min-w-0 truncate"><b className="text-[#2B729E]">#{p.categoryTag}</b> · {p.chapterId}. {chapterName(p.chapterId)}</span>
                    <span className="shrink-0">{writtenAt(p)}</span>
                  </div>
                  <p className="mt-1.5 font-extrabold text-[15px] text-[#112334] leading-snug break-keep">{p.title}</p>
                  <p className="mt-1 text-xs text-[#5E6F7C] line-clamp-2 break-keep">{p.content}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-3 text-[11px] text-[#5E6F7C]">
                      <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> 스티커 {p.stickers.length}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 조언 {p.comments.length}</span>
                    </span>
                    {confirmId === p.id ? (
                      <span className="flex items-center gap-1.5 text-xs" role="alert">
                        <span className="font-bold text-[#B23A1E]">정말 삭제할까요? 되돌릴 수 없어요.</span>
                        <button type="button" onClick={() => { onDelete(p.id); setConfirmId(null); }}
                          className="px-3 py-1.5 rounded-lg bg-[#C2410C] hover:bg-[#9A330A] text-white font-bold">삭제</button>
                        <button type="button" onClick={() => setConfirmId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#D5CFC5] bg-white text-[#112334] font-bold">취소</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <button type="button" onClick={() => onOpenPost(p)}
                          className="px-3 py-1.5 rounded-lg bg-[#102B46] hover:bg-[#1b3b5c] text-white font-bold">보기</button>
                        <button type="button" onClick={() => setConfirmId(p.id)} aria-label={`${p.title} 삭제`}
                          className="px-2.5 py-1.5 rounded-lg border border-[#D5CFC5] bg-white text-[#B23A1E] hover:bg-[#FCE9E3] font-bold flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
