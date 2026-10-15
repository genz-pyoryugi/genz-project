import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChapterId, PostItPost, TapeComment, PlacedSticker } from '@/types/community';
import { CHAPTER_LIST, INITIAL_POSTIT_POSTS } from '@/data/officeData';
import { PostItNote } from './PostItNote';
import { OfficeStickerDrawer } from './OfficeStickerDrawer';
import { TapeCommentModal } from './TapeCommentModal';
import { PostItWriteModal } from './PostItWriteModal';
import { PostItInspectModal } from './PostItInspectModal';
import { CommunityTutorialModal } from './CommunityTutorialModal';
import { VisibleRadioModal } from '@/components/radio/VisibleRadioModal';
import { RadioHubModal } from '@/components/radio/RadioHubModal';
import { getRadioPosts } from '@/lib/radio/popular';
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
  BookmarkCheck,
  Laptop,
  Layers,
  HelpCircle
} from 'lucide-react';
import { sound } from '@/utils/audio';

import { loadSavedPosts, savePosts } from '@/lib/community/storage';

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
  const [selectedTopic, setSelectedTopic] = useState<string>(initialChapterId || 'all');

  // 주소에 ?chapter=01 이 있으면 화면이 뜬 뒤 그 챕터로 (서버에는 주소창 정보가 없어서 첫 화면은 기본값으로 맞춘다)
  useEffect(() => {
    try {
      const chap = new URLSearchParams(window.location.search).get('chapter');
      if (chap && CHAPTER_LIST.some((c) => c.id === chap)) setSelectedTopic(chap);
    } catch {}
  }, []);

  // 첫 화면은 서버와 똑같이 기본 포스트잇으로 그린다 (서버에는 브라우저 저장소가 없어서
  // 여기서 localStorage를 읽으면 서버 HTML과 브라우저 첫 화면이 달라져 hydration 오류가 난다)
  const [posts, setPosts] = useState<PostItPost[]>(INITIAL_POSTIT_POSTS);

  // 화면이 뜬 뒤 브라우저에 저장된 포스트잇(붙인 스티커 위치, 남긴 조언 등)을 불러온다
  useEffect(() => {
    const saved = loadSavedPosts();
    if (saved) setPosts(saved);
  }, []);

  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [inspectPostId, setInspectPostId] = useState<string | null>(null);
  const [radioPost, setRadioPost] = useState<PostItPost | null>(null); // 보이는 라디오로 듣는 사연
  const [isRadioHubOpen, setIsRadioHubOpen] = useState(false); // 보이는 라디오 입구(인기 사연 목록)
  const [commentPost, setCommentPost] = useState<PostItPost | null>(null);
const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); // 👈 추가!

  // 처음 접속 시 자동으로 튜토리얼 팝업을 띄우는 useEffect 👈 추가!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const seen = localStorage.getItem('genz_office_tutorial_seen');
        if (!seen) {
          const timer = setTimeout(() => {
            setTutorialStep(0);
            setIsTutorialOpen(true);
          }, 450);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, []);
  const [filterMode, setFilterMode] = useState<'all' | 'hasAdvice' | 'popular'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'adviceCount' | 'stickerCount'>('latest');


  
  // Directly derive inspectPost from live posts array for instant UI updates
  const inspectPost = inspectPostId
    ? posts.find((p) => p.id === inspectPostId) || null
    : null;

  // Sync with localStorage
  // (첫 실행은 건너뜀: 저장본을 불러오기 전의 기본 포스트잇으로 저장본을 덮어쓰지 않도록)
  const storageSyncReady = useRef(false);
  useEffect(() => {
    if (!storageSyncReady.current) {
      storageSyncReady.current = true;
      return;
    }
    savePosts(posts);
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
  // 보이는 라디오 사연: 7대 카테고리별로 공감 스티커 + 테이프 조언을 가장 많이 받은 포스트잇 1개씩
  const radioPosts = useMemo(() => getRadioPosts(posts), [posts]);
  const radioPostIds = useMemo(() => new Set(radioPosts.map((p) => p.id)), [radioPosts]);
  const openRadio = (p: PostItPost) => {
    setIsRadioHubOpen(false);
    setRadioPost(p);
  };

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
      {/* 좌우 여백을 아래 데스크 창과 똑같이 맞춤: 바깥 여백(px-3 / sm:px-6) + 창 테두리 1px + 창 제목줄 여백(px-4 / sm:px-6)
          → '젠지 표류기'는 '오피스 고민상담소 | 젠지 표류기 데스크'와, '보이는 라디오'는 '고민·조언·스티커'와 같은 세로선에 놓인다 */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#D8D2C6] py-3">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6">
        <div className="px-[17px] sm:px-[25px] flex items-center justify-between gap-4">
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
                오피스 고민상담소
              </span>
            </div>
          </div>

          {/* Quick Header Actions: 보이는 라디오 입구 (인기 사연을 DJ 하루 & 새봄의 방송으로 듣기) */}
          <div className="flex items-center gap-2 font-ui">
            <button
              onClick={() => {
                sound.playPageFlipSound();
                setIsRadioHubOpen(true);
              }}
              className="px-4 py-1.5 rounded-full bg-[#112334] hover:bg-[#203548] text-white text-xs font-bold tracking-wide flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              title="공감과 조언을 가장 많이 받은 인기 사연을 보이는 라디오로 듣기"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E4572E] animate-pulse" />
              <span>📻 보이는 라디오</span>
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Main macOS Window Frame (실제 UI 적용: 맥 데스크 윈도우 & 포스트잇 보드) */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 flex flex-col gap-5 font-ui">
        {/* Main Window Frame */}
        <div className="bg-[#FAF8F5]/90 backdrop-blur-xl border border-white/90 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 overflow-hidden flex flex-col transition-all">
          {/* Window Titlebar */}
          <div className="bg-[#F2EFEB]/95 border-b border-[#E5DFD4] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 select-none">
            {/* 1. 좌측 상단: 트래픽 라이트 버튼 삭제 후 [오피스 고민상담소 | 젠지 표류기 데스크] 배치 */}
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#2B729E]/10 text-[#2B729E] text-xs font-bold shadow-2xs">
                📋
              </span>
              <div className="flex items-center gap-1.5 font-ui">
                <span className="text-sm font-black tracking-tight text-[#112334]">
                  오피스 고민상담소
                </span>
                <span className="text-black/25 font-normal text-xs">|</span>
                <span className="text-xs font-semibold text-[#666056]">
                  젠지 표류기 데스크
                </span>
              </div>
            </div>

            {/* 2. 중앙 창 이름 위치: 튜토리얼 버튼 생성 (4단계 핵심 기능 안내 모달 연동) */}
            <div className="flex items-center justify-center order-3 sm:order-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  sound.playPageFlipSound();
                  setIsTutorialOpen(true);
                }}
                className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#1E3A52] hover:text-[#0F1E2C] border border-[#D5CFC5] hover:border-[#2B729E] shadow-2xs hover:shadow-xs transition-all text-xs font-bold tracking-tight cursor-pointer"
                title="처음 방문하셨나요? 4단계 커뮤니티 이용 가이드 열기"
              >
                <span className="text-amber-500 group-hover:scale-110 transition-transform">💡</span>
                <span>튜토리얼</span>
                <span className="text-[10px] bg-[#2B729E]/10 text-[#2B729E] font-extrabold px-1.5 py-0.2 rounded-full">
                  가이드
                </span>
              </button>
            </div>

            {/* 3. 우측: Quick Counter Pills */}
            <div className="flex items-center gap-2 justify-end text-xs font-medium text-[#666056] order-2 sm:order-3">
              <span className="bg-black/5 px-2.5 py-1 rounded-full text-[11px]">
                고민 <strong>{posts.length}</strong>
              </span>
              <span className="bg-[#2B729E]/10 text-[#2B729E] px-2.5 py-1 rounded-full text-[11px] font-semibold">
                조언 <strong>{totalComments}</strong>
              </span>
              <span className="bg-[#D94B38]/10 text-[#D94B38] px-2.5 py-1 rounded-full text-[11px] font-semibold">
                스티커 <strong>{totalStickers}</strong>
              </span>
            </div>
          </div>

{/* macOS Window Toolbar & Segmented Control */}
            <div className="bg-[#F8F6F2]/80 border-b border-[#E5DFD4] px-3 sm:px-5 py-3 flex flex-col gap-3">
              {/* Row 1: Category Navigation as macOS Segmented Control (가로 스크롤바 완전 숨김 & 1줄 일렬 정렬 & 글자 잘림 없는 자연스러운 분배) */}
<div 
  id="tutorial-target-tabs"  /* 👈 이 id 추가! */        
                className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex items-center p-1 bg-[#E8E3DA]/80 rounded-xl border border-[#D5CFC5]/60 w-full min-w-max lg:min-w-0 gap-0.5 sm:gap-1">
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
                        className={`flex-auto py-1.5 px-1 sm:px-1.5 xl:px-2.5 rounded-lg text-[11px] sm:text-[11.5px] xl:text-xs font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-center ${
                          isSelected
                            ? 'bg-white text-[#112334] font-bold shadow-xs'
                            : 'text-[#645F56] hover:text-[#112334] hover:bg-white/40'
                        }`}
                        title={`${topic.label} (${topicCount})`}
                      >
                        {topic.icon && <span className="text-xs shrink-0">{topic.icon}</span>}
                        <span className="shrink-0 tracking-tight">{topic.label}</span>
                        <span className={`text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          isSelected ? 'bg-black/8 text-[#112334]' : 'bg-black/5 text-[#888175]'
                        }`}>
                          {topicCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* Row 2: Sub-filters & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#112334] text-white font-bold shadow-2xs'
                      : 'bg-white/80 text-[#555048] hover:bg-white border border-[#D8D2C6]'
                  }`}
                >
                  전체 ({displayedPosts.length})
                </button>
                <button
                  onClick={() => setFilterMode('hasAdvice')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'hasAdvice'
                      ? 'bg-[#112334] text-white font-bold shadow-2xs'
                      : 'bg-white/80 text-[#555048] hover:bg-white border border-[#D8D2C6]'
                  }`}
                >
                  선배 조언 있는 글
                </button>
                <button
                  onClick={() => setFilterMode('popular')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'popular'
                      ? 'bg-[#112334] text-white font-bold shadow-2xs'
                      : 'bg-white/80 text-[#555048] hover:bg-white border border-[#D8D2C6]'
                  }`}
                >
                  인기 공감 글 🔥
                </button>
              </div>

              {/* Right Actions: Sticker Drawer & Post-it Write & Sort */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#736D64] mr-2">
                  <span className="text-[11px]">정렬:</span>
                  <button
                    onClick={() => setSortOrder('latest')}
                    className={`hover:text-[#112334] cursor-pointer ${sortOrder === 'latest' ? 'font-bold text-[#112334]' : ''}`}
                  >
                    최신순
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setSortOrder('adviceCount')}
                    className={`hover:text-[#112334] cursor-pointer ${sortOrder === 'adviceCount' ? 'font-bold text-[#112334]' : ''}`}
                  >
                    조언순
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setSortOrder('stickerCount')}
                    className={`hover:text-[#112334] cursor-pointer ${sortOrder === 'stickerCount' ? 'font-bold text-[#112334]' : ''}`}
                  >
                    스티커순
                  </button>
                </div>

                <button
                  id="tutorial-target-stickers" /* 👈 이 id 추가! */
                  onClick={() => {
                    sound.playPeelSound();
                    setIsStickerDrawerOpen((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#D5CFC5] bg-white text-[#112334] hover:bg-[#F2EFEB] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2B729E]" />
                  <span>스티커함</span>
                </button>

                <button
                  id="tutorial-target-write" /* 👈 이 id 추가! */
                  onClick={() => {
                    sound.playStickSound();
                    setIsWriteModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2B729E] hover:bg-[#235F84] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>포스트잇 쓰기</span>
                </button>
              </div>
            </div>
          </div>

{/* The Post-it Canvas Inside the Mac Window (정갈한 그리드와 아날로그의 만남) */}
          <div className="p-6 sm:p-8 bg-[#FAF8F5]/85 min-h-[550px]">
            {displayedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {displayedPosts.map((post, idx) => (
                  <div
                    key={post.id}
                    id={idx === 0 ? "tutorial-target-postit" : undefined}
                    className="rounded-sm"
                  >
                    <PostItNote
                      post={post}
                      onOpenInspect={(p) => setInspectPostId(p.id)}
                      onAddComment={(p) => setCommentPost(p)}
                      onStickSticker={handleStickSticker}
                      onRemoveSticker={handleRemoveSticker}
                      onMoveSticker={handleMoveSticker}
                      activeStickerId={activeStickerId}
                      onOpenStickerDrawer={() => setIsStickerDrawerOpen(true)}
                      onOpenRadio={radioPostIds.has(post.id) ? openRadio : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center rounded-2xl border-2 border-dashed border-[#D2CCC2] bg-white/50 my-6">
                <span className="text-4xl block mb-2">📌</span>
                <h3 className="font-bold text-base text-[#112334]">
                  이 주제에는 아직 등록된 고민이 없습니다.
                </h3>
                <p className="text-xs text-[#736D64] mt-1">
                  첫 번째 고민 포스트잇을 직접 붙여보세요!
                </p>
                <button
                  onClick={() => setIsWriteModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-full bg-[#112334] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  + 포스트잇 붙이기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Dedicated Community Footer */}
      <footer className="w-full bg-[#E4DFC] border-t border-[#D5CFC5] py-8 px-4 sm:px-8 text-center text-xs font-ui text-[#7A746B]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#112334]">젠지 표류기 오피스 상담소</span>
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
              className="ml-2 px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
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
        isMacStyle={true}
        onOpenRadio={inspectPost && radioPostIds.has(inspectPost.id) ? openRadio : undefined}
      />

      {isRadioHubOpen && (
        <RadioHubModal posts={radioPosts} onSelect={openRadio} onClose={() => setIsRadioHubOpen(false)} />
      )}

      {radioPost && (
        <VisibleRadioModal key={radioPost.id} post={radioPost} onClose={() => setRadioPost(null)} />
      )}

      <PostItWriteModal
        currentChapterId={(selectedTopic !== 'all' ? selectedTopic : '01') as ChapterId}
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleCreatePostIt}
      />

<CommunityTutorialModal
  isOpen={isTutorialOpen}
  onClose={() => setIsTutorialOpen(false)}
  currentStepIdx={tutorialStep}
  onStepChange={(step) => {
    // 3단계(포스트잇 상세창)를 벗어나면 열어둔 상세창을 자동으로 닫아 다음 대상이 가려지지 않게 함
    if (step !== 2) setInspectPostId(null);
    if (step !== 3) setIsStickerDrawerOpen(false);
    setTutorialStep(step);
  }}
  onOpenWriteModal={() => setIsWriteModalOpen(true)}
  onOpenInspectModal={() => {
    if (displayedPosts.length > 0) {
      setInspectPostId(displayedPosts[0].id);
    }
  }}
  onOpenStickerDrawer={(open) => setIsStickerDrawerOpen(open !== undefined ? open : true)}
  onSelectTopic={(topicId) => setSelectedTopic(topicId)}
  isInspectOpen={Boolean(inspectPost)}
  isStickerDrawerOpen={isStickerDrawerOpen}
/>
    </div>
  );
};

