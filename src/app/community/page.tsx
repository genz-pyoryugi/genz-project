'use client';

import React, { useState, useEffect } from 'react';
import { ChapterId, PostItPost, TapeComment, PlacedSticker } from '@/types/community';
import { CHAPTER_LIST, INITIAL_POSTIT_POSTS, OFFICE_STICKER_LIBRARY } from '@/data/officeData';
import { OfficeHeader } from '@/components/community/OfficeHeader';
import { ChapterHeader } from '@/components/community/ChapterHeader';
import { PostItNote } from '@/components/community/PostItNote';
import { OfficeStickerDrawer } from '@/components/community/OfficeStickerDrawer';
import { TapeCommentModal } from '@/components/community/TapeCommentModal';
import { PostItWriteModal } from '@/components/community/PostItWriteModal';
import { PostItInspectModal } from '@/components/community/PostItInspectModal';
import { OfficeFooter } from '@/components/community/OfficeFooter';
import { TableOfContentsModal } from '@/components/community/TableOfContentsModal';
import { Plus, Sparkles } from 'lucide-react';
import { sound } from '@/utils/audio';

const LOCAL_STORAGE_KEY = 'genz_office_postits_v2';

export default function CommunityPage() {
  const [currentChapterId, setCurrentChapterId] = useState<ChapterId>('01');
  const [activeSubTab, setActiveSubTab] = useState<string>('community');
  const [posts, setPosts] = useState<PostItPost[]>(INITIAL_POSTIT_POSTS);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [inspectPost, setInspectPost] = useState<PostItPost | null>(null);
  const [commentPost, setCommentPost] = useState<PostItPost | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'hasAdvice' | 'popular'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setPosts(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
    } catch {}
  }, [posts]);

  const currentChapter = CHAPTER_LIST.find((c) => c.id === currentChapterId) || CHAPTER_LIST[0];

  const handleStickSticker = (postId: string, stickerId: string, x: number, y: number) => {
    const newSticker: PlacedSticker = {
      id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stickerId,
      x,
      y,
      rotation: Math.round((Math.random() * 24 - 12) * 10) / 10,
      scale: Math.round((0.85 + Math.random() * 0.25) * 100) / 100,
      author: '신입동기',
      authorRole: '신입',
      placedAt: '방금 전',
    };
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, stickers: [...p.stickers, newSticker] } : p)));
  };

  const handleAddComment = (postId: string, commentData: Omit<TapeComment, 'id' | 'createdAt' | 'likes'>) => {
    const newComment: TapeComment = {
      ...commentData,
      id: `cmt-${Date.now()}`,
      createdAt: '방금 전',
      likes: 1,
    };
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [newComment, ...p.comments] } : p)));
  };

  const handleCreatePostIt = (newPostData: Omit<PostItPost, 'id' | 'createdAt' | 'stickers' | 'comments'>) => {
    const newPost: PostItPost = {
      ...newPostData,
      id: `post-${Date.now()}`,
      createdAt: '방금 전',
      stickers: [],
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const chapterPosts = posts.filter((p) => {
    if (searchQuery) {
      return p.title.includes(searchQuery) || p.content.includes(searchQuery) || p.categoryTag.includes(searchQuery);
    }
    return p.chapterId === currentChapterId;
  });

  const displayedPosts = chapterPosts.filter((p) => {
    if (filterMode === 'hasAdvice') return p.comments.length > 0;
    if (filterMode === 'popular') return p.stickers.length >= 2;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#EAE6DF] text-[#112334] font-sans flex flex-col">
      <OfficeHeader activeChapterNumber={currentChapter.number} onSearch={(kw) => setSearchQuery(kw)} />

      <ChapterHeader
        currentChapter={currentChapter}
        onSelectChapter={(chapId) => { setSearchQuery(''); setCurrentChapterId(chapId); }}
        activeSubTab={activeSubTab}
        onSelectSubTab={(tab) => setActiveSubTab(tab)}
        totalPostItCount={chapterPosts.length}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pt-2 pb-3 border-b border-[#D8D2C6]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterMode === 'all' ? 'bg-[#112334] text-white font-semibold' : 'bg-[#FAF8F5] text-[#555048] border border-[#D5CFC5]'
              }`}
            >
              전체 포스트잇 ({chapterPosts.length})
            </button>
            <button
              onClick={() => setFilterMode('hasAdvice')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterMode === 'hasAdvice' ? 'bg-[#112334] text-white font-semibold' : 'bg-[#FAF8F5] text-[#555048] border border-[#D5CFC5]'
              }`}
            >
              선배 조언 있는 글
            </button>
            <button
              onClick={() => setFilterMode('popular')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterMode === 'popular' ? 'bg-[#112334] text-white font-semibold' : 'bg-[#FAF8F5] text-[#555048] border border-[#D5CFC5]'
              }`}
            >
              인기 공감 글
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { sound.playPeelSound(); setIsStickerDrawerOpen((prev) => !prev); }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-[#D5CFC5] bg-[#FAF8F5] text-[#112334] hover:bg-white flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2B729E]" />
              <span>스티커 보관함</span>
            </button>

            <button
              onClick={() => { sound.playStickSound(); setIsWriteModalOpen(true); }}
              className="px-4 py-1.5 rounded-full bg-[#112334] hover:bg-[#203548] text-white text-xs font-semibold tracking-wide flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>포스트잇 붙이기</span>
            </button>
          </div>
        </div>

        {displayedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-2 pb-12">
            {displayedPosts.map((post) => (
              <PostItNote
                key={post.id}
                post={post}
                onOpenInspect={(p) => setInspectPost(p)}
                onAddComment={(p) => setCommentPost(p)}
                onStickSticker={handleStickSticker}
                activeStickerId={activeStickerId}
                onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center rounded-2xl border-2 border-dashed border-[#D2CCC2] bg-[#FAF8F5]/60 my-6">
            <span className="text-3xl block mb-2">📌</span>
            <h3 className="font-bold text-base text-[#112334]">이 페이지에 등록된 포스트잇이 없습니다</h3>
          </div>
        )}
      </main>

      <OfficeFooter
        currentChapter={currentChapter}
        onSelectChapter={(chapId) => { setSearchQuery(''); setCurrentChapterId(chapId); }}
        onOpenTableOfContents={() => setIsTocOpen(true)}
      />

      <OfficeStickerDrawer
        isOpen={isStickerDrawerOpen}
        onClose={() => setIsStickerDrawerOpen(false)}
        activeStickerId={activeStickerId}
        onSelectSticker={(stkId) => { setActiveStickerId(stkId); setIsStickerDrawerOpen(false); }}
        onCancelPeel={() => setActiveStickerId(null)}
      />

      <TapeCommentModal
        post={commentPost}
        isOpen={Boolean(commentPost)}
        onClose={() => setCommentPost(null)}
        onSubmitComment={handleAddComment}
      />

      <PostItInspectModal
        post={inspectPost}
        isOpen={Boolean(inspectPost)}
        onClose={() => setInspectPost(null)}
        onAddComment={(p) => setCommentPost(p)}
        onStickSticker={handleStickSticker}
        activeStickerId={activeStickerId}
        onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
      />

      <PostItWriteModal
        currentChapterId={currentChapterId}
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleCreatePostIt}
      />

      <TableOfContentsModal
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        onSelectChapter={(chapId) => { setSearchQuery(''); setCurrentChapterId(chapId); }}
        currentChapterId={currentChapterId}
      />
    </div>
  );
}