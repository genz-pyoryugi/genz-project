'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChapterId, PostItPost, TapeComment, PlacedSticker } from '@/types/community';
import { CHAPTER_LIST, INITIAL_POSTIT_POSTS } from '@/data/officeData';
import { PostItNote } from './PostItNote';
import { OfficeStickerDrawer } from './OfficeStickerDrawer';
import { TapeCommentModal } from './TapeCommentModal';
import { PostItWriteModal } from './PostItWriteModal';
import { PostItInspectModal } from './PostItInspectModal';
import { VisibleRadioWidget } from './VisibleRadioWidget';
import { Plus, Sparkles, X, ArrowLeft } from 'lucide-react';
import { sound } from '@/utils/audio';

const LOCAL_STORAGE_KEY = 'genz_office_postits_v3';

export interface CommunityViewProps {
  initialChapterId?: ChapterId;
  onNavigateHome?: () => void;
  className?: string;
}

const TOPIC_FILTERS: { id: string; label: string; icon: string; chapterId?: ChapterId }[] = [
  { id: 'all', label: '전체 고민', icon: '📌' },
  { id: '01', label: '첫 출근 & 호칭', icon: '👋', chapterId: '01' },
  { id: '02', label: '메일 & 메신저', icon: '📧', chapterId: '02' },
  { id: '03', label: '회의 & 전화', icon: '📞', chapterId: '03' },
  { id: '04', label: '탕비실 & 오피스룰', icon: '☕', chapterId: '04' },
  { id: '05', label: '지각 & 첫 연차', icon: '🏖️', chapterId: '05' },
  { id: '06', label: '경조사 & 예절', icon: '💐', chapterId: '06' },
  { id: '07', label: '보고 & 실수대처', icon: '🚨', chapterId: '07' },
];

export const CommunityView: React.FC<CommunityViewProps> = ({
  initialChapterId,
  onNavigateHome,
  className = '',
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(initialChapterId || 'all');

  const [posts, setPosts] = useState<PostItPost[]>(() => {
    try {
      localStorage.removeItem('genz_office_postits');
      localStorage.removeItem('genz_office_postits_v1');
      localStorage.removeItem('genz_office_postits_v2');

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: PostItPost[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const parsedIds = new Set(parsed.map((p) => p.id));
          const missing = INITIAL_POSTIT_POSTS.filter((ip) => !parsedIds.has(ip.id));
          if (missing.length > 0) {
            const combined = [...missing, ...parsed];
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
            return combined;
          }
          return parsed;
        }
      }
    } catch {}
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_POSTIT_POSTS));
    } catch {}
    return INITIAL_POSTIT_POSTS;
  });

  // 초기 포스트잇 강제 보장
  useEffect(() => {
    setPosts((current) => {
      const currentIds = new Set(current.map((p) => p.id));
      const missing = INITIAL_POSTIT_POSTS.filter((ip) => !currentIds.has(ip.id));
      if (missing.length > 0) {
        const merged = [...missing, ...current];
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
      return current;
    });
  }, []);

  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [inspectPostId, setInspectPostId] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<PostItPost | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'hasAdvice' | 'popular'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'adviceCount' | 'stickerCount'>('latest');

  const inspectPost = inspectPostId ? posts.find((p) => p.id === inspectPostId) || null : null;

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
    } catch {}
  }, [posts]);

  useEffect(() => {
    if (initialChapterId) {
      setSelectedTopic(initialChapterId);
    }
  }, [initialChapterId]);

  const totalComments = useMemo(() => posts.reduce((acc, p) => acc + p.comments.length, 0), [posts]);
  const totalStickers = useMemo(() => posts.reduce((acc, p) => acc + p.stickers.length, 0), [posts]);

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

  const handleRemoveSticker = (postId: string, stickerId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, stickers: p.stickers.filter((s) => s.id !== stickerId) } : p))
    );
  };

  const handleMoveSticker = (postId: string, stickerId: string, newX: number, newY: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, stickers: p.stickers.map((s) => (s.id === stickerId ? { ...s, x: newX, y: newY } : s)) }
          : p
      )
    );
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

  const handleRemoveComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p))
    );
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

  const displayedPosts = useMemo(() => {
    let result = posts;
    if (selectedTopic !== 'all') {
      result = result.filter((p) => p.chapterId === selectedTopic);
    }
    if (filterMode === 'hasAdvice') {
      result = result.filter((p) => p.comments.length > 0);
    } else if (filterMode === 'popular') {
      result = result.filter((p) => p.stickers.length >= 2 || p.comments.length >= 1);
    }
    return [...result].sort((a, b) => {
      if (sortOrder === 'adviceCount') return b.comments.length - a.comments.length;
      if (sortOrder === 'stickerCount') return b.stickers.length - a.stickers.length;
      return 0;
    });
  }, [posts, selectedTopic, filterMode, sortOrder]);

  return (
    <div className={`min-h-screen bg-[#EAE6DF] text-[#112334] font-sans flex flex-col ${className}`}>
      {/* 1. 상단 바 */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D8D2C6] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onNavigateHome && (
              <button onClick={onNavigateHome} className="p-1.5 rounded-full hover:bg-black/5 text-[#645F56] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-ui font-black text-xl sm:text-2xl text-[#112334]">젠지 표류기</span>
              <span className="text-[#2B729E] font-ui font-extrabold text-sm sm:text-base">오피스 커뮤니티</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-ui">
            <button
              onClick={() => {
                sound.playPeelSound();
                setIsStickerDrawerOpen((prev) => !prev);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#D5CFC5] bg-white text-[#112334] hover:bg-[#F2EFEB] flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2B729E]" />
              <span>스티커 보관함</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2B729E]/10 text-[#2B729E] font-bold">16</span>
            </button>

            <button
              onClick={() => {
                sound.playStickSound();
                setIsWriteModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-full bg-[#112334] hover:bg-[#203548] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>포스트잇 붙이기</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. 히어로 배너 */}
      <section className="w-full bg-[#F2EFEB] border-b border-[#D8D2C6] px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#D5CFC5] text-[#2B729E] text-xs font-bold font-ui mb-3 shadow-2xs">
              <span>📌</span>
              <span>신입사원 익명 포스트잇 & 선배 테이프 조언 보드</span>
            </div>
            <h1 className="font-ui font-black text-2xl sm:text-4xl text-[#112334] leading-tight mb-2.5">
              혼자 끙끙 앓지 말고,<br className="hidden sm:inline" /> 포스트잇에 솔직하게 털어놓으세요!
            </h1>
            <p className="font-ui text-xs sm:text-sm text-[#666056] leading-relaxed">
              사소해서 사수에게 묻기 머뭇거려졌던 오피스 질문들. 익명으로 포스트잇을 남기면 동기와 선배들이 마스킹 테이프 조언과 응원 스티커를 착! 붙여드립니다.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-white/70 border border-[#D5CFC5] rounded-xl p-3 sm:p-4 shadow-xs font-ui">
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175]">등록된 고민</div>
              <div className="text-lg sm:text-xl font-black text-[#112334] mt-0.5">{posts.length}개</div>
            </div>
            <div className="w-px h-8 bg-[#D8D2C6]" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175]">테이프 조언</div>
              <div className="text-lg sm:text-xl font-black text-[#2B729E] mt-0.5">{totalComments}개</div>
            </div>
            <div className="w-px h-8 bg-[#D8D2C6]" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175]">공감 스티커</div>
              <div className="text-lg sm:text-xl font-black text-[#D94B38] mt-0.5">{totalStickers}개</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 📻 [보이는 라디오 슬롯] 조장 연결 전용 영역 */}
      <div className="w-full pt-6 pb-2">
        <VisibleRadioWidget />
      </div>

      {/* 3. 토픽 네비게이션 */}
      <nav className="w-full bg-[#FAF8F5] border-b border-[#D8D2C6] px-4 sm:px-8 py-3 sticky top-[57px] z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar font-ui">
          {TOPIC_FILTERS.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            const topicCount = topic.id === 'all' ? posts.length : posts.filter((p) => p.chapterId === topic.id).length;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  sound.playPageFlipSound();
                  setSelectedTopic(topic.id);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected ? 'bg-[#112334] text-white shadow-xs' : 'bg-[#EDE8E0] text-[#555048] hover:bg-[#E0DAD0]'
                }`}
              >
                <span>{topic.icon}</span>
                <span>{topic.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-black/8 text-[#666056]'}`}>
                  {topicCount}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 4. 필터 및 정렬 */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-8 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-ui">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-md font-medium ${filterMode === 'all' ? 'bg-white text-[#112334] font-bold border border-[#D5CFC5]' : 'text-[#666056]'}`}
          >
            전체 ({displayedPosts.length})
          </button>
          <button
            onClick={() => setFilterMode('hasAdvice')}
            className={`px-3 py-1 rounded-md font-medium ${filterMode === 'hasAdvice' ? 'bg-white text-[#112334] font-bold border border-[#D5CFC5]' : 'text-[#666056]'}`}
          >
            선배 조언 있는 글
          </button>
          <button
            onClick={() => setFilterMode('popular')}
            className={`px-3 py-1 rounded-md font-medium ${filterMode === 'popular' ? 'bg-white text-[#112334] font-bold border border-[#D5CFC5]' : 'text-[#666056]'}`}
          >
            인기 공감 글 🔥
          </button>
        </div>

        <div className="flex items-center gap-2 text-[#736D64]">
          <button onClick={() => setSortOrder('latest')} className={sortOrder === 'latest' ? 'font-bold text-[#112334] underline' : ''}>
            최신순
          </button>
          <span>·</span>
          <button onClick={() => setSortOrder('adviceCount')} className={sortOrder === 'adviceCount' ? 'font-bold text-[#112334] underline' : ''}>
            조언 많은순
          </button>
          <span>·</span>
          <button onClick={() => setSortOrder('stickerCount')} className={sortOrder === 'stickerCount' ? 'font-bold text-[#112334] underline' : ''}>
            스티커 많은순
          </button>
        </div>
      </section>

      {/* 5. 포스트잇 그리드 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pb-20 pt-2">
        {displayedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
{displayedPosts.map((post) => (
              <PostItNote
                key={post.id}
                post={post}
                onOpenInspect={(p) => setInspectPostId(p.id)}
                onAddComment={(p) => setCommentPost(p)}
                onStickSticker={handleStickSticker}
                activeStickerId={activeStickerId}
                onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center rounded-2xl border-2 border-dashed border-[#D2CCC2] bg-[#FAF8F5]/60 my-6">
            <span className="text-4xl block mb-2">📌</span>
            <h3 className="font-bold text-base text-[#112334] font-ui">이 주제에는 아직 등록된 고민이 없습니다.</h3>
            <button onClick={() => setIsWriteModalOpen(true)} className="mt-4 px-4 py-2 rounded-full bg-[#112334] text-white text-xs font-semibold">
              + 포스트잇 붙이기
            </button>
          </div>
        )}
      </main>

      {/* 스티커 모드 플로팅 바 */}
      {activeStickerId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80]">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#112334] text-white rounded-full shadow-2xl border border-[#2B729E] font-ui text-xs">
            <span className="font-bold text-[#FFDC73]">스티커 붙이기 모드 진행 중!</span>
            <button
              onClick={() => {
                sound.playTapeSnipSound();
                setActiveStickerId(null);
              }}
              className="ml-2 px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" /> 모드 종료
            </button>
          </div>
        </div>
      )}

      {/* 모달들 */}
      <OfficeStickerDrawer
        isOpen={isStickerDrawerOpen}
        onClose={() => setIsStickerDrawerOpen(false)}
        activeStickerId={activeStickerId}
        onSelectSticker={(stkId) => {
          setActiveStickerId(stkId);
          setIsStickerDrawerOpen(false);
        }}
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
        onClose={() => setInspectPostId(null)}
        onAddComment={(p) => setCommentPost(p)}
        onStickSticker={handleStickSticker}
        activeStickerId={activeStickerId}
        onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
      />
    

      <PostItWriteModal
        currentChapterId={(selectedTopic !== 'all' ? selectedTopic : '01') as ChapterId}
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleCreatePostIt}
      />
    </div>
  );
};