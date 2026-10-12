import React, { useState, useEffect, useMemo } from 'react';
import { ChapterId, PostItPost, TapeComment, PlacedSticker } from '@/types/community';
import { CHAPTER_LIST, INITIAL_POSTIT_POSTS } from '@/data/officeData';
import { PostItNote } from './PostItNote';
import { OfficeStickerDrawer } from './OfficeStickerDrawer';
import { TapeCommentModal } from './TapeCommentModal';
import { PostItWriteModal } from './PostItWriteModal';
import { PostItInspectModal } from './PostItInspectModal';
import { VisibleRadioWidget } from './VisibleRadioWidget';
import { 
  Plus, 
  Sparkles, 
  X, 
  ArrowLeft, 
  MessageSquare, 
  Heart, 
  Flame, 
  CheckCircle2, 
  Filter,
  Compass,
  BookmarkCheck
} from 'lucide-react';
import { sound } from '@/utils/audio';

const LOCAL_STORAGE_KEY = 'genz_office_postits_v7';

export interface CommunityViewProps {
  initialChapterId?: ChapterId;
  onNavigateHome?: () => void;
  className?: string;
}

// 젠지 신입사원 관심사별 토픽 필터 (7대 신규 목차 완벽 동기화: '📌 전체 고민' + 7개 챕터 한 줄 일렬 정렬)
const TOPIC_FILTERS: { id: string; label: string; chapterId?: ChapterId; icon?: string }[] = [
  { id: 'all', label: '전체 고민', icon: '📌' },
  { id: '01', label: '조직 이해&적용', chapterId: '01' },
  { id: '02', label: '업무 절차&기준', chapterId: '02' },
  { id: '03', label: '질문&소통', chapterId: '03' },
  { id: '04', label: '협업&동료 존중', chapterId: '04' },
  { id: '05', label: '직장 내 관계&예절', chapterId: '05' },
  { id: '06', label: '근무&재택 수칙', chapterId: '06' },
  { id: '07', label: '공용 공간 & 비품 관리', chapterId: '07' },
];

export const CommunityView: React.FC<CommunityViewProps> = ({
  initialChapterId,
  onNavigateHome,
  className = '',
}) => {
  // Selected topic filter ('all' or chapterId '01'~'07')
  const [selectedTopic, setSelectedTopic] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const chap = params.get('chapter');
        if (chap && CHAPTER_LIST.some((c) => c.id === chap)) {
          return chap;
        }
      } catch {}
    }
    return initialChapterId || 'all';
  });

  const [posts, setPosts] = useState<PostItPost[]>(() => {
    try {
      // Clean up older stale keys if present
      localStorage.removeItem('genz_office_postits');
      localStorage.removeItem('genz_office_postits_v1');
      localStorage.removeItem('genz_office_postits_v2');
      localStorage.removeItem('genz_office_postits_v3');
      localStorage.removeItem('genz_office_postits_v4');
      localStorage.removeItem('genz_office_postits_v5');
      localStorage.removeItem('genz_office_postits_v6');

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: PostItPost[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always ensure all initial posts exist in the set
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

  // Backup effect on mount: guarantee all INITIAL_POSTIT_POSTS are included
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

  // Directly derive inspectPost from live posts array for instant UI updates
  const inspectPost = inspectPostId
    ? posts.find((p) => p.id === inspectPostId) || null
    : null;

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
    } catch {}
  }, [posts]);

  // Handle initial chapter update if prop changes
  useEffect(() => {
    if (initialChapterId) {
      setSelectedTopic(initialChapterId);
    }
  }, [initialChapterId]);

  // Real-time Community Metrics
  const totalComments = useMemo(() => {
    return posts.reduce((acc, p) => acc + p.comments.length, 0);
  }, [posts]);

  const totalStickers = useMemo(() => {
    return posts.reduce((acc, p) => acc + p.stickers.length, 0);
  }, [posts]);

  // Sticker Placement
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
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, stickers: [...p.stickers, newSticker] } : p))
    );
  };

  // Sticker Removal (Peeling)
  const handleRemoveSticker = (postId: string, placedStickerId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, stickers: p.stickers.filter((s) => s.id !== placedStickerId) }
          : p
      )
    );
  };

  // Sticker Move / Reposition
  const handleMoveSticker = (postId: string, placedStickerId: string, newX: number, newY: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              stickers: p.stickers.map((s) =>
                s.id === placedStickerId ? { ...s, x: newX, y: newY } : s
              ),
            }
          : p
      )
    );
  };

  // Add Tape Advice Comment
  const handleAddComment = (
    postId: string,
    commentData: Omit<TapeComment, 'id' | 'createdAt' | 'likes'>
  ) => {
    const newComment: TapeComment = {
      ...commentData,
      id: `cmt-${Date.now()}`,
      createdAt: '방금 전',
      likes: 1,
    };
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: [newComment, ...p.comments] } : p))
    );
  };

  // Remove Tape Advice Comment
  const handleRemoveComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      )
    );
  };

  // Create new Post-it
  const handleCreatePostIt = (
    newPostData: Omit<PostItPost, 'id' | 'createdAt' | 'stickers' | 'comments'>
  ) => {
    const newPost: PostItPost = {
      ...newPostData,
      id: `post-${Date.now()}`,
      createdAt: '방금 전',
      stickers: [],
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  // Filtering by selected topic & sub filter mode
  const displayedPosts = useMemo(() => {
    let result = posts;

    // Topic filter
    if (selectedTopic !== 'all') {
      result = result.filter((p) => p.chapterId === selectedTopic);
    }

    // Sub-filter mode
    if (filterMode === 'hasAdvice') {
      result = result.filter((p) => p.comments.length > 0);
    } else if (filterMode === 'popular') {
      result = result.filter((p) => p.stickers.length >= 2 || p.comments.length >= 1);
    }

    // Sort order
    return [...result].sort((a, b) => {
      if (sortOrder === 'adviceCount') {
        return b.comments.length - a.comments.length;
      }
      if (sortOrder === 'stickerCount') {
        return b.stickers.length - a.stickers.length;
      }
      return 0; // Default order
    });
  }, [posts, selectedTopic, filterMode, sortOrder]);

  return (
    <div className={`min-h-screen bg-[#EAE6DF] text-[#112334] font-sans flex flex-col ${className}`}>
      {/* 1. Independent Community Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D8D2C6] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Back to Guide */}
          <div className="flex items-center gap-3">
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#645F56] transition-colors font-ui"
                title="메인 홈 화면으로 돌아가기"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-baseline gap-2">
              <span className="font-ui font-black text-xl sm:text-2xl tracking-tight text-[#112334]">
                젠지 표류기
              </span>
              <span className="text-[#2B729E] font-ui font-extrabold text-sm sm:text-base tracking-tight">
                오피스 커뮤니티
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 font-ui">
            <button
              onClick={() => {
                sound.playPeelSound();
                setIsStickerDrawerOpen((prev) => !prev);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#D5CFC5] bg-white text-[#112334] hover:bg-[#F2EFEB] flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2B729E]" />
              <span className="hidden sm:inline">스티커 보관함</span>
              <span className="sm:hidden">스티커</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2B729E]/10 text-[#2B729E] font-bold">16</span>
            </button>

            <button
              onClick={() => {
                sound.playStickSound();
                setIsWriteModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-full bg-[#112334] hover:bg-[#203548] text-white text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>포스트잇 붙이기</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Standalone Community Hero Banner */}
      <section className="w-full bg-[#F2EFEB] border-b border-[#D8D2C6] px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#D5CFC5] text-[#2B729E] text-xs font-bold font-ui mb-3 shadow-2xs break-keep" style={{ wordBreak: 'keep-all' }}>
              <span className="text-base">📌</span>
              <span>신입사원 익명 포스트잇 & 보이는 라디오 라이브</span>
            </div>
            
            <h1 
              className="font-ui font-black text-2xl sm:text-4xl text-[#112334] tracking-tight leading-snug mb-3 break-keep"
              style={{ wordBreak: 'keep-all' }}
            >
              혼자 끙끙 앓지 말고, 포스트잇에 솔직하게 털어놓으세요!
            </h1>
            
            <p 
              className="font-ui text-xs sm:text-sm text-[#666056] leading-relaxed break-keep max-w-2xl"
              style={{ wordBreak: 'keep-all' }}
            >
              사소해서 사수에게 묻기 머뭇거려졌던 오피스 질문들. 익명으로 포스트잇을 남기면 동기와 선배들이 마스킹 테이프 조언과 응원 스티커를 착! 붙여드립니다. 특별히 공감과 응원이 모인 사연은 실시간 ‘보이는 라디오’ 스튜디오에서 생생한 음성과 조언으로 함께 나누실 수 있습니다.
            </p>
          </div>

          {/* Live Metrics Desk Counter */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/70 border border-[#D5CFC5] rounded-xl p-3 sm:p-4 shadow-xs self-start md:self-auto font-ui shrink-0">
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175] font-medium break-keep" style={{ wordBreak: 'keep-all' }}>등록된 고민</div>
              <div className="text-lg sm:text-xl font-black text-[#112334] mt-0.5">{posts.length}개</div>
            </div>
            <div className="w-px h-8 bg-[#D8D2C6]" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175] font-medium break-keep" style={{ wordBreak: 'keep-all' }}>테이프 조언</div>
              <div className="text-lg sm:text-xl font-black text-[#2B729E] mt-0.5">{totalComments}개</div>
            </div>
            <div className="w-px h-8 bg-[#D8D2C6]" />
            <div className="text-center px-2 sm:px-3">
              <div className="text-xs text-[#888175] font-medium break-keep" style={{ wordBreak: 'keep-all' }}>공감 스티커</div>
              <div className="text-lg sm:text-xl font-black text-[#D94B38] mt-0.5">{totalStickers}개</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 📻 [보이는 라디오 슬롯] 조장이 추후 컨텐츠/코드를 자유롭게 교체할 수 있는 위치 확보 */}
      <div className="w-full pt-6 pb-2">
        <VisibleRadioWidget />
      </div>



      {/* 3. Topic Category Navigation Tabs - 이모티콘 없이 모든 탭이 일렬로 한 줄에 정렬 */}
      <nav className="w-full bg-[#FAF8F5] border-b border-[#D8D2C6] px-3 sm:px-6 lg:px-8 py-3 sticky top-[57px] z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto overflow-x-auto no-scrollbar sm:overflow-visible">
          <div className="grid grid-cols-8 gap-1 sm:gap-1.5 lg:gap-2 font-ui min-w-[640px] sm:min-w-0">
            {TOPIC_FILTERS.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              const topicCount = topic.id === 'all' 
                ? posts.length 
                : posts.filter((p) => p.chapterId === topic.id).length;

              return (
                <button
                  key={topic.id}
                  onClick={() => {
                    sound.playPageFlipSound();
                    setSelectedTopic(topic.id);
                  }}
                  className={`w-full py-2 px-1 sm:px-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap border ${
                    isSelected
                      ? 'bg-[#112334] text-white border-[#112334] shadow-xs'
                      : 'bg-[#EDE8E0] text-[#443E36] border-[#DFD8CC] hover:bg-[#E0DAD0] hover:text-[#112334]'
                  }`}
                  style={{ wordBreak: 'keep-all', whiteSpace: 'nowrap' }}
                  title={`${topic.label} (${topicCount})`}
                >
                  {topic.icon && (
                    <span className="text-xs shrink-0">{topic.icon}</span>
                  )}
                  <span className="font-semibold tracking-tight whitespace-nowrap">
                    {topic.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/8 text-[#666056]'
                  }`}>
                    {topicCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 4. Filter & Sort Bar */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-8 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-ui">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-white text-[#112334] shadow-2xs font-bold border border-[#D5CFC5]'
                : 'text-[#666056] hover:text-[#112334]'
            }`}
          >
            전체 ({displayedPosts.length})
          </button>
          <button
            onClick={() => setFilterMode('hasAdvice')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterMode === 'hasAdvice'
                ? 'bg-white text-[#112334] shadow-2xs font-bold border border-[#D5CFC5]'
                : 'text-[#666056] hover:text-[#112334]'
            }`}
          >
            선배 조언 있는 글
          </button>
          <button
            onClick={() => setFilterMode('popular')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterMode === 'popular'
                ? 'bg-white text-[#112334] shadow-2xs font-bold border border-[#D5CFC5]'
                : 'text-[#666056] hover:text-[#112334]'
            }`}
          >
            인기 공감 글 🔥
          </button>
        </div>

        {/* Sorting Dropdown/Buttons */}
        <div className="flex items-center gap-2 text-[#736D64]">
          <span className="text-[11px]">정렬:</span>
          <button
            onClick={() => setSortOrder('latest')}
            className={`hover:text-[#112334] ${sortOrder === 'latest' ? 'font-bold text-[#112334] underline underline-offset-4' : ''}`}
          >
            최신순
          </button>
          <span>·</span>
          <button
            onClick={() => setSortOrder('adviceCount')}
            className={`hover:text-[#112334] ${sortOrder === 'adviceCount' ? 'font-bold text-[#112334] underline underline-offset-4' : ''}`}
          >
            조언 많은순
          </button>
          <span>·</span>
          <button
            onClick={() => setSortOrder('stickerCount')}
            className={`hover:text-[#112334] ${sortOrder === 'stickerCount' ? 'font-bold text-[#112334] underline underline-offset-4' : ''}`}
          >
            스티커 많은순
          </button>
        </div>
      </section>

      {/* 5. Main Post-it Board Grid */}
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
                onRemoveSticker={handleRemoveSticker}
                onMoveSticker={handleMoveSticker}
                activeStickerId={activeStickerId}
                onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center rounded-2xl border-2 border-dashed border-[#D2CCC2] bg-[#FAF8F5]/60 my-6">
            <span className="text-4xl block mb-2">📌</span>
            <h3 className="font-bold text-base text-[#112334] font-ui">
              이 주제에는 아직 등록된 고민이 없습니다.
            </h3>
            <p className="text-xs text-[#736D64] mt-1 font-ui">
              첫 번째 고민 포스트잇을 직접 붙여보세요!
            </p>
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-full bg-[#112334] text-white text-xs font-semibold shadow-xs"
            >
              + 포스트잇 붙이기
            </button>
          </div>
        )}
      </main>

      {/* 6. Dedicated Community Footer */}
      <footer className="w-full bg-[#E4DFC] border-t border-[#D5CFC5] py-8 px-4 sm:px-8 text-center text-xs font-ui text-[#7A746B]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#112334]">젠지 표류기 커뮤니티</span>
            <span>·</span>
            <span>오늘도 사무실에서 고군분투하는 모든 신입사원들을 응원합니다.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>🌱 익명 보장</span>
            <span>💬 따뜻한 피드백 문화</span>
            <span>📎 실시간 테이프 조언</span>
          </div>
        </div>
      </footer>

      {/* Floating Sticker Mode Active Banner */}
      {activeStickerId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] animate-bounce duration-1000">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#112334] text-white rounded-full shadow-2xl border border-[#2B729E] font-ui text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[#FFDC73]">
              <Sparkles className="w-3.5 h-3.5" />
              스티커 붙이기 모드 진행 중!
            </span>
            <span className="text-[#D8D2C6]">포스트잇 위를 클릭하여 붙이세요.</span>
            <button
              onClick={() => {
                sound.playTapeSnipSound();
                setActiveStickerId(null);
              }}
              className="ml-2 px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
            >
              <X className="w-3 h-3" />
              모드 종료
            </button>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
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
        onRemoveComment={handleRemoveComment}
        onStickSticker={handleStickSticker}
        onRemoveSticker={handleRemoveSticker}
        onMoveSticker={handleMoveSticker}
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
