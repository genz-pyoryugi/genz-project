'use client';

// 보이는 라디오 (오피스 라디오)
// 디자인: radio-server/static/radio_preview.html (팀원 작업)을 React로 옮김
// 포스트잇 고민 + 테이프 조언 → /api/radio/generate 로 대본·음성 생성 → 대사 단위로 DJ 강조·말풍선·자막을 음성에 맞춰 보여준다.

import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Radio, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { PostItPost } from '@/types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { RadioEpisode, RadioSegment, RadioSpeaker } from '@/types/radio';
import { RadioPlayer, lineIndexAt } from './radioPlayer';

interface VisibleRadioModalProps {
  post: PostItPost;
  onClose: () => void;
  // modal: 고민상담소 위에 뜨는 창 / page: 단독 페이지 (메인 화면 이어폰 → 사무실 팝업 안에 바로 라디오 화면)
  variant?: 'modal' | 'page';
  stories?: PostItPost[]; // 있으면 닫기 버튼 왼쪽에 사연 선택 토글을 보여 준다
  onSelectStory?: (post: PostItPost) => void;
  autoPlay?: boolean; // 토글로 사연을 바꿨을 때 바로 재생
  // [고민상담소로 바로가기]: 고민상담소 안에서 연 경우 그 포스트잇 상세창을 바로 연다. 없으면 고민상담소 페이지로 이동
  onGoToPost?: (post: PostItPost) => void;
}

/** 라디오 아래에 붙는 실제 사연 카드 (고민상담소의 포스트잇 모습 그대로) */
const StoryPostCard: React.FC<{ post: PostItPost; isPage: boolean; onGoToPost?: (post: PostItPost) => void }> = ({
  post,
  onGoToPost,
}) => {
  const href = `/community?chapter=${post.chapterId}&post=${encodeURIComponent(post.id)}`;
  const parts = post.highlightedText ? post.content.split(post.highlightedText) : [post.content];

  return (
    <article className="relative flex flex-col md:flex-1 md:min-h-0 mx-1 sm:mx-2 mt-2 px-5 sm:px-6 pt-6 pb-4 bg-[#FFF6BA] border border-[#EFE295] text-[#342A0D] rounded-sm shadow-[0_10px_24px_rgba(0,0,0,.12)] -rotate-[0.6deg]">
      {/* 위쪽 마스킹테이프 */}
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/70 border border-black/5 shadow-xs rotate-[1.5deg]"
      />
      <div className="shrink-0 flex items-start justify-between gap-3 text-[11px] mb-2">
        <div className="min-w-0">
          <p className="font-bold text-[#7A5B12]">📘 실제 사연 · 고민상담소</p>
          <p className="font-semibold text-[#2B729E] truncate">#{post.categoryTag}</p>
        </div>
        <div className="shrink-0 text-right text-black/55">
          <p className="font-semibold">
            {post.author.companyType ?? '회사'} <span className="text-[#2B729E]">[{post.author.role}]</span>
          </p>
          <p>{post.createdAt}</p>
        </div>
      </div>

      <h4 className="shrink-0 font-extrabold text-[15px] sm:text-base text-[#112334] leading-snug break-keep mb-2 line-clamp-2">{post.title}</h4>
      {/* 본문: 남는 높이만큼만 보여 주고 넘치면 아래를 흐리게 (버튼은 항상 보이도록) */}
      <div className="relative min-h-0 md:flex-1 overflow-hidden">
      <p className="font-dakkuda text-lg text-black/85 leading-relaxed break-keep line-clamp-3 md:line-clamp-none">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <mark className="bg-[#2B729E]/20 px-1 rounded text-[#112334] underline decoration-[#2B729E] decoration-wavy decoration-1">
                {post.highlightedText}
              </mark>
            )}
          </React.Fragment>
        ))}
      </p>
        <span aria-hidden="true" className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#FFF6BA] to-transparent" />
      </div>

      <div className="shrink-0 mt-3 pt-3 border-t border-black/10 flex items-center justify-between gap-3">
        <p className="text-[11px] text-black/55 truncate">
          {post.author.nickname} · 테이프 조언 {post.comments.length}개
        </p>
        {onGoToPost ? (
          <button
            type="button"
            onClick={() => onGoToPost(post)}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-[#102B46] hover:bg-[#1b3b5c] text-white text-xs font-bold transition-colors"
          >
            고민상담소로 바로가기 →
          </button>
        ) : (
          <a
            href={href}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-[#102B46] hover:bg-[#1b3b5c] text-white text-xs font-bold transition-colors"
          >
            고민상담소로 바로가기 →
          </a>
        )}
      </div>
    </article>
  );
};

/** 토글에 보이는 짧은 이름: "01 · 조직 이해&적용" */
const storyLabel = (p: PostItPost) => {
  const chapter = CHAPTER_LIST.find((c) => c.id === p.chapterId);
  return chapter ? `${chapter.number} · ${chapter.title}` : p.title;
};

const HOSTS: Record<RadioSpeaker, { name: string; role: string; img: string; bg: string }> = {
  senior: { name: '하루', role: '선배 DJ', img: '/radio/dj-cat.png', bg: '#e0f7ff' },
  junior: { name: '새봄', role: '신입 DJ', img: '/radio/dj-dog.png', bg: '#fff8e9' },
};

// DJ 입 모양: 0 = 다문 입(원본), 1 = 살짝 벌림, 2 = 크게 벌림
// (open 그림은 원본에 입 부분만 합성한 것이라 입 외의 얼굴은 원본과 완전히 같다)
const MOUTH_FRAMES: Record<RadioSpeaker, string[]> = {
  senior: ['/radio/dj-cat.png', '/radio/dj-cat-open.png', '/radio/dj-cat-open-wide.png'],
  junior: ['/radio/dj-dog.png', '/radio/dj-dog-open.png', '/radio/dj-dog-open-wide.png'],
};

const SEGMENT_LABEL: Record<RadioSegment, string> = {
  opening: '오프닝',
  story: '청취자 사연',
  talk: '토크',
  tip: '선배 꿀팁',
  practice: '따라 말해보기',
  closing: '클로징',
};

const LOADING_MESSAGES = [
  '📮 사연 접수 중…',
  '✍️ 작가가 두 DJ의 대본을 쓰고 있어요…',
  '🎙️ 하루 DJ가 목소리를 가다듬는 중…',
  '🎧 새봄 DJ가 녹음 부스에 들어갔어요…',
  '📻 대사 한 줄씩 녹음하고 있어요… (1분 정도 걸려요)',
];

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

export const VisibleRadioModal: React.FC<VisibleRadioModalProps> = ({
  post,
  onClose,
  variant = 'modal',
  stories,
  onSelectStory,
  autoPlay = false,
  onGoToPost,
}) => {
  const isPage = variant === 'page';
  const [episode, setEpisode] = useState<RadioEpisode | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTick, setLoadingTick] = useState(0);
  const [requestId, setRequestId] = useState(0);
  const [regenerate, setRegenerate] = useState(false);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [readyFor, setReadyFor] = useState<string | null>(null); // 음성을 다 받은 방송 id
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [mouthLevel, setMouthLevel] = useState<0 | 1 | 2>(0); // 말하는 DJ의 입 모양

  const playerRef = useRef<RadioPlayer | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // ---- 방송 만들기 (열릴 때 / 다시 만들기) ----
  useEffect(() => {
    const controller = new AbortController();
    const ticker = setInterval(() => setLoadingTick((t) => t + 1), 2500);

    fetch('/api/radio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post, regenerate }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.error || '라디오를 만들지 못했어요.'), { code: data.code });
        setEpisode(data as RadioEpisode);
        setError(null);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError({ message: e.message, code: e.code });
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        clearInterval(ticker);
      });

    return () => {
      controller.abort();
      clearInterval(ticker);
    };
  }, [post, regenerate, requestId]);

  // ---- 재생 엔진 (방송이 준비되면 생성, 닫히거나 바뀌면 정리) ----
  useEffect(() => {
    if (!episode) return;
    const player = new RadioPlayer(episode, {
      onTime: setTime,
      onPlayingChange: setPlaying,
      onFinish: () => setFinished(true),
      onReady: () => setReadyFor(episode.id),
      onError: setAudioLoadError,
    });
    playerRef.current = player;
    // 토글로 다른 사연을 고른 경우 음성이 준비되는 대로 바로 재생 (브라우저가 막으면 재생 버튼을 누르면 됨)
    if (autoPlay) player.ready.then(() => player.play());
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [episode, autoPlay]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying) return player.pause();
    setFinished(false);
    player.play();
  };

  const seek = (t: number) => {
    setFinished(false);
    playerRef.current?.seek(t);
  };

  const jumpToLine = (i: number) => {
    setFinished(false);
    playerRef.current?.jumpToLine(i);
  };

  // 재생 중에는 목소리 크기를 계속 재서 말하는 DJ의 입 모양을 고른다
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let peak = 0.05; // 방송마다 음량이 달라서, 최근 최대 음량 대비 비율로 판단
    let shown: 0 | 1 | 2 = 0;
    let lastChange = 0;
    const loop = (now: number) => {
      const level = playerRef.current?.getLevel() ?? 0;
      peak = Math.max(level, peak * 0.995, 0.02);
      const ratio = level / peak;
      const next: 0 | 1 | 2 = ratio < 0.2 ? 0 : ratio < 0.55 ? 1 : 2;
      // 너무 빨리 바뀌면 떨려 보여서 최소 70ms는 유지
      if (next !== shown && now - lastChange > 70) {
        shown = next;
        lastChange = now;
        setMouthLevel(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentIdx = episode ? lineIndexAt(episode.lines, time) : 0;
  const current = episode?.lines[currentIdx];
  const visibleCount = finished ? (episode?.lines.length ?? 0) : currentIdx + 1;
  const started = playing || time > 0 || finished;
  const mouth = playing ? mouthLevel : 0; // 멈추면 입을 다문다

  // 현재 대사가 채팅 영역에 보이도록 스크롤
  useEffect(() => {
    if (!started) return;
    const row = rowRefs.current[currentIdx];
    const box = chatRef.current;
    if (row && box) box.scrollTo({ top: row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2, behavior: 'smooth' });
  }, [currentIdx, started]);

  const restart = () => {
    playerRef.current?.pause();
    setEpisode(null);
    setError(null);
    setTime(0);
    setFinished(false);
    setLoading(true);
    setLoadingTick(0);
    setRegenerate(true);
    setRequestId((n) => n + 1);
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    setLoadingTick(0);
    setRequestId((n) => n + 1);
  };

  const progress = episode && episode.totalDuration > 0 ? (time / episode.totalDuration) * 100 : 0;

  return (
    <div
      className={
        isPage
          ? 'min-h-screen flex justify-center p-2 sm:p-4 bg-[#F6F4EC]'
          : 'fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150'
      }
      onClick={isPage ? undefined : onClose}
    >
      {/* DJ 이미지의 검은 배경을 화면에서만 투명하게 (원본 PNG는 그대로) */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id="portrait-cutout" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  100 100 100 0 0" />
          </filter>
        </defs>
      </svg>

      <div
        className={`relative w-full max-w-6xl font-ui text-[#102B46] grid gap-4 items-start md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] ${
          isPage ? 'h-fit' : 'my-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== 왼쪽: 스튜디오 + 실제 사연(고민상담소 포스트잇) ===== */}
        <div
          className={`min-w-0 flex flex-col gap-5 ${isPage ? 'md:h-[calc(100svh-2rem)]' : 'md:h-[min(88vh,860px)]'}`}
        >
          {/* ===== 스튜디오 무대 ===== */}
          <section className="shrink-0 rounded-[22px] bg-[#102B46] shadow-md text-[#F6F4EC] px-4 sm:px-6 pt-5 overflow-hidden" aria-live="polite">
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="text-[13px] text-[#A9C4CF] leading-snug min-w-0">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#E4572E]">
                  <span className={`w-2 h-2 rounded-full bg-[#E4572E] ${playing ? 'animate-pulse' : ''}`} />
                  ON AIR · 오피스 라디오
                </span>
                <b className="block text-[#F6F4EC] text-lg sm:text-[19px] tracking-tight break-keep">
                  {episode?.title ?? '사연을 방송으로 만드는 중'}
                </b>
                <span className="block truncate">사연: {post.title}</span>
              </p>
              <div className="shrink-0 flex items-center gap-2">
                {/* 사연 선택 토글: 7대 카테고리 인기 사연 중 하나로 바로 바꿔 듣기 */}
                {stories && stories.length > 1 && onSelectStory && (
                  <label className="relative">
                    <span className="sr-only">다른 사연 듣기</span>
                    <select
                      value={post.id}
                      onChange={(e) => {
                        const next = stories.find((p) => p.id === e.target.value);
                        if (next) onSelectStory(next);
                      }}
                      className="appearance-none max-w-[46vw] sm:max-w-none truncate pl-3.5 pr-8 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-[13px] font-bold cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#56a5ce]"
                      title="다른 사연 듣기"
                    >
                      {stories.map((p) => (
                        <option key={p.id} value={p.id} className="text-[#102B46] bg-white">
                          📻 {storyLabel(p)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
                  </label>
                )}
                {/* 페이지(사무실 팝업 안)에서는 팝업 자체의 닫기 버튼이 있으므로 숨긴다 → 토글이 그 자리(오른쪽 끝)로 */}
                {!isPage && (
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
  
            {/* DJ 패널 */}
            <div
              className="relative px-3 sm:px-9 pt-5 sm:pt-7 [@media(max-height:860px)]:sm:pt-4 pb-4 [@media(max-height:860px)]:pb-3 rounded-[36px] sm:rounded-[60px] border-[6px] sm:border-[9px] border-[#aeb1b3]"
              style={{
                backgroundColor: '#131516',
                backgroundImage:
                  'linear-gradient(135deg,#ffffff12 25%,transparent 25%),linear-gradient(225deg,#ffffff0d 25%,transparent 25%),linear-gradient(45deg,#0009 25%,transparent 25%),linear-gradient(315deg,#0008 25%,#17191b 25%)',
                backgroundSize: '22px 22px',
                boxShadow: 'inset 0 0 0 3px #424648, inset 0 0 35px 18px #0009, 0 0 0 2px #e2e4e5, 0 8px 20px #0003',
              }}
            >
              <div className="grid grid-cols-[1fr_1.1fr_1fr] sm:grid-cols-[1fr_1.35fr_1fr] gap-2.5 sm:gap-4 items-center min-h-[150px] sm:min-h-[220px] [@media(max-height:860px)]:sm:min-h-[160px]">
                {(['senior', 'junior'] as RadioSpeaker[]).map((sp) => {
                  const live = playing && current?.speaker === sp;
                  return (
                    <div key={sp} className={`flex justify-center min-w-0 ${sp === 'junior' ? 'col-start-3' : ''}`}>
                      <div
                        className={`w-full max-w-[190px] [@media(max-height:860px)]:max-w-[140px] aspect-square rounded-full grid place-items-center border-2 sm:border-[3px] transition-all duration-300 ${
                          live ? 'scale-105' : 'opacity-80'
                        }`}
                        style={{
                          background: HOSTS[sp].bg,
                          borderColor: sp === 'senior' ? '#eafaff' : '#fffaf0',
                          boxShadow: live
                            ? sp === 'senior'
                              ? '0 0 0 4px #3caaff88, 0 0 32px #239fff90'
                              : '0 0 0 4px #ffd36f88, 0 0 32px #ffcf5a90'
                            : '0 8px 22px #0006',
                        }}
                      >
                        {/* 입 모양 3장을 겹쳐 두고 목소리 크기에 맞춰 보이는 장만 바꾼다 (미리 불러와 깜빡임 없음) */}
                        <div className="relative w-[92%] h-[92%]">
                          {MOUTH_FRAMES[sp].map((src, frame) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={src}
                              src={src}
                              alt={frame === 0 ? `${HOSTS[sp].role} ${HOSTS[sp].name}` : ''}
                              aria-hidden={frame !== 0}
                              className="absolute inset-0 w-full h-full object-contain"
                              style={{
                                filter: 'url(#portrait-cutout)',
                                opacity: frame === 0 || (live && mouth === frame) ? 1 : 0,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
  
                {/* 가운데: 지금 말하는 대사 */}
                <div className="col-start-2 row-start-1 min-w-0 text-center">
                  {current && started ? (
                    <>
                      <p className="text-[11px] font-bold text-[#BCE3E4] mb-1">
                        {SEGMENT_LABEL[current.segment]} · {HOSTS[current.speaker].name}
                      </p>
                      <p className="text-[13px] sm:text-[15px] leading-relaxed text-white/95 break-keep line-clamp-5">
                        {current.line}
                      </p>
                    </>
                  ) : (
                    <img src="/radio/studio-microphone.svg" alt="" className="mx-auto w-14 sm:w-20 opacity-80" />
                  )}
                </div>
              </div>
            </div>
  
            <div className="grid grid-cols-[1fr_1.1fr_1fr] sm:grid-cols-[1fr_1.35fr_1fr] gap-2.5 sm:gap-4 text-center mt-3 text-base sm:text-xl font-bold tracking-tight">
              <span>
                선배 DJ <span className="text-[#7cc4ff]">하루</span>
              </span>
              <span className="col-start-3">
                신입 DJ <span className="text-[#ffd36f]">새봄</span>
              </span>
            </div>
  
            {/* 플레이어 */}
            <div className="flex items-center gap-3 sm:gap-4 py-5 [@media(max-height:860px)]:py-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!episode || readyFor !== episode.id}
                aria-label={playing ? '일시정지' : '재생'}
                className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#172941] border border-white/15 text-white disabled:opacity-40 hover:bg-[#21395a] transition-colors grid place-items-center"
              >
                {playing ? (
                  <span className="flex gap-1">
                    <span className="w-1 h-4 bg-white rounded-sm" />
                    <span className="w-1 h-4 bg-white rounded-sm" />
                  </span>
                ) : (
                  <span className="ml-1 w-0 h-0 border-y-[8px] border-y-transparent border-l-[13px] border-l-white" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={episode?.totalDuration ?? 1}
                step={0.1}
                value={time}
                disabled={!episode || readyFor !== episode.id}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="방송 위치"
                className="flex-1 min-w-0 h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-default accent-[#56a5ce]"
                style={{ background: `linear-gradient(to right,#56a5ce 0 ${progress}%,#ffffff35 ${progress}% 100%)` }}
              />
              <span className="text-xs text-[#A9C4CF] tabular-nums whitespace-nowrap">
                {fmt(time)} / {fmt(episode?.totalDuration ?? 0)}
              </span>
            </div>
  
            {/* 하단 자막 (lower third) */}
            {current?.caption && started && (
              <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#397C9B] flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <span className="font-bold text-[15px] sm:text-[17px] text-white break-keep">{current.caption}</span>
                {current.basis && (
                  <span className="text-[11px] sm:text-xs text-[#DCEFF2] sm:ml-auto sm:text-right break-keep">
                    근거: {current.basis}
                  </span>
                )}
              </div>
            )}
          </section>
  
          <StoryPostCard post={post} isPage={isPage} onGoToPost={onGoToPost} />
        </div>

        {/* ===== 상태 / DJ 대화 (오른쪽 패널: 패널 높이를 다 쓰고 대화만 따로 스크롤) ===== */}
        <div
          className={`min-w-0 flex flex-col rounded-[22px] bg-[#FBFAF6] border border-[#E5E0D5] shadow-md px-4 sm:px-5 py-4 ${
            isPage ? 'md:sticky md:top-4 md:h-[calc(100svh-2rem)]' : 'md:h-[min(88vh,860px)]'
          }`}
        >
          {loading && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-7 h-7 text-[#397C9B] animate-spin" />
              <p className="font-bold text-sm">{LOADING_MESSAGES[Math.min(loadingTick, LOADING_MESSAGES.length - 1)]}</p>
              <p className="text-xs text-[#5E6F7C] break-keep">
                포스트잇 고민과 테이프 조언 {post.comments.length}개로 두 DJ의 방송을 만들고 있어요. 한 번 만든 방송은 저장돼서 다음엔 바로 들을 수 있어요.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="w-7 h-7 text-[#E4572E]" />
              <p className="font-bold text-sm break-keep">라디오를 만들지 못했어요</p>
              <p className="text-xs text-[#5E6F7C] break-all max-w-lg">{error.message}</p>
              {error.code === 'NO_API_KEY' && (
                <p className="text-xs text-[#5E6F7C] bg-white border border-[#D6E2E5] rounded-lg px-3 py-2 break-keep">
                  <b>.env.local</b>에 <code>GEMINI_API_KEY=발급받은키</code>를 넣고 개발 서버를 다시 켜 주세요.
                </p>
              )}
              <button
                onClick={retry}
                className="mt-1 px-4 py-2 rounded-lg bg-[#102B46] text-white text-xs font-bold hover:bg-[#203548]"
              >
                다시 시도
              </button>
            </div>
          )}

          {episode && !loading && (
            <>
              {episode.safety_flag && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-[#FCE9E3] text-[#7A2A12] text-[13px] break-keep">
                  이 사연에는 괴롭힘·폭언 등 도움이 필요한 내용이 있어, 혼자 참기보다 기록 남기기·인사팀 상담·고용노동부
                  상담(1350) 안내로 방송했어요.
                </div>
              )}
              {(!episode.hasAudio || audioLoadError) && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFF6DA] text-[#6B5208] text-xs break-keep">
                  음성을 만들지 못해 소리 없이 대사 길이에 맞춰 진행해요.
                  {(episode.audioError || audioLoadError) && (
                    <span className="block mt-1 opacity-80 break-all">{episode.audioError || audioLoadError}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#397C9B]" /> DJ 대화
                </h3>
                <button
                  onClick={restart}
                  className="text-xs font-semibold text-[#397C9B] hover:underline flex items-center gap-1"
                  title="같은 사연으로 새 방송 만들기"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 새로 만들기
                </button>
              </div>

              {!started && (
                <p className="text-center text-xs text-[#5E6F7C] py-6">
                  {readyFor === episode.id ? '▶ 재생 버튼을 누르면 방송이 시작돼요.' : '🎧 방송 음성을 불러오는 중…'}
                </p>
              )}

              <div ref={chatRef} className="relative flex flex-col gap-4 max-h-[60vh] md:max-h-none md:flex-1 md:min-h-0 overflow-y-auto pr-1 scroll-smooth">
                {started &&
                  episode.lines.slice(0, visibleCount).map((l, i) => {
                    const isJunior = l.speaker === 'junior';
                    const isCur = i === currentIdx && !finished;
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          rowRefs.current[i] = el;
                        }}
                        onClick={() => jumpToLine(i)}
                        className={`grid items-end gap-2 w-fit max-w-[92%] sm:max-w-[86%] cursor-pointer animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                          isJunior ? 'self-end grid-cols-[minmax(0,1fr)_32px]' : 'grid-cols-[32px_minmax(0,1fr)]'
                        }`}
                      >
                        <div
                          className={`row-start-1 w-8 h-8 rounded-full grid place-items-center overflow-hidden ${
                            isJunior ? 'col-start-2' : 'col-start-1'
                          }`}
                          style={{ background: HOSTS[l.speaker].bg }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={HOSTS[l.speaker].img}
                            alt=""
                            className="w-[92%] h-[92%] object-contain"
                            style={{ filter: 'url(#portrait-cutout)' }}
                          />
                        </div>
                        <div className={`row-start-1 min-w-0 ${isJunior ? 'col-start-1' : 'col-start-2'}`}>
                          <span className={`block mb-1 text-[11px] text-[#5E6F7C] ${isJunior ? 'text-right' : ''}`}>
                            {HOSTS[l.speaker].role} {HOSTS[l.speaker].name} · {SEGMENT_LABEL[l.segment]}
                          </span>
                          {l.segment === 'story' ? (
                            <span
                              className={`block px-5 py-4 bg-[#FFFDF7] text-[#2B2B28] text-[15px] leading-[1.85] rounded-[4px_16px_16px_16px] shadow-[0_6px_18px_rgba(0,0,0,.12)] -rotate-[0.4deg] font-dakkuda text-lg break-keep transition-shadow ${
                                isCur ? 'ring-2 ring-[#397C9B]' : ''
                              }`}
                            >
                              <span className="block font-ui text-[11px] font-bold text-[#8A7A5C] mb-1">📮 청취자 사연</span>
                              {l.line}
                            </span>
                          ) : (
                            <span
                              className={`block px-4 py-3 text-sm leading-[1.7] break-keep border transition-shadow ${
                                isJunior
                                  ? 'bg-[#2d6281] text-white rounded-[16px_16px_3px_16px]'
                                  : 'bg-[#D6E2E5] text-[#102B46] rounded-[16px_16px_16px_3px]'
                              } ${
                                isCur
                                  ? isJunior
                                    ? 'border-[#a7d8ef] shadow-[0_0_0_1px_#a7d8ef]'
                                    : 'border-[#397C9B] shadow-[0_0_0_1px_#397C9B]'
                                  : 'border-transparent'
                              }`}
                            >
                              {l.line}
                            </span>
                          )}
                          {l.basis && (
                            <span className={`block mt-1.5 text-[11px] text-[#5E6F7C] ${isJunior ? 'text-right' : ''}`}>
                              근거: {l.basis}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {finished && episode.sources.length > 0 && (
                <p className="mt-4 text-xs text-[#5E6F7C] break-keep">📎 오늘 소개한 조언: {episode.sources.join(', ')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
