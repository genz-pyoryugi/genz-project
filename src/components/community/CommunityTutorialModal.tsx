import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { sound } from '@/utils/audio';

export interface CommunityTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWriteModal?: () => void;
  onOpenInspectModal?: () => void;
  onOpenStickerDrawer?: (open?: boolean) => void;
  onSelectTopic?: (topicId: string) => void;
  currentStepIdx?: number;
  onStepChange?: (step: number) => void;
  isInspectOpen?: boolean; // 상세창이 열리고 닫힐 때 스포트라이트 위치를 다시 측정하기 위해 사용
  isStickerDrawerOpen?: boolean; // 스티커함이 열리고 닫힐 때 스포트라이트 위치를 다시 측정하기 위해 사용
}

interface TourStep {
  step: number;
  targetId: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  actionButtonText?: string;
  actionType?: 'write' | 'tabs' | 'inspect' | 'stickers';
  glowBoxShadow: string;
  ringClass: string;
  preferPlacement?: 'right'; // 지정하면 설명 카드를 타겟 우측에 배치 (공간 부족 시 좌측 → 위/아래 순으로 대체)
  altTargetId?: string; // 이 요소가 화면에 있으면 targetId 대신 비춤 (예: 상세창이 열렸을 때 테이프 조언 영역)
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    targetId: 'tutorial-target-write',
    badge: '1단계 · 고민 나누기',
    title: '포스트잇 쓰기',
    subtitle: '털어놓고 싶은 직장 속 고민을 따뜻한 색상의 포스트잇에 적어보세요.',
    description: '상단 우측의 [+ 포스트잇 쓰기] 버튼을 누르면 익명으로 회사 유형과 직무를 설정하여 자유롭게 고민을 남길 수 있습니다.',
    tip: '💡 팁: 아래 [실제 작성창 열어보기]를 눌러 작성 화면을 미리 체험해보세요!',
    actionButtonText: '📝 실제 작성 화면 열어보기',
    actionType: 'write',
    glowBoxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 35px rgba(251, 191, 36, 0.9)',
    ringClass: 'ring-4 ring-amber-400',
  },
  {
    step: 2,
    targetId: 'tutorial-target-tabs',
    badge: '2단계 · 주제별 탐색',
    title: '고민 탭 & 카테고리',
    subtitle: '내가 겪고 있는 고민과 꼭 맞는 7대 핵심 목차 탭을 선택해 모아보세요.',
    description: '조직 문화 적응부터 업무 절차, 상사/동료 소통, 공용 공간 에티켓까지 7대 실무 카테고리별로 동료들의 이야기를 한눈에 모아볼 수 있습니다.',
    tip: '💡 팁: 실제 탭을 마우스로 클릭하면 해당 주제의 글들만 필터링되어 나타납니다.',
    actionButtonText: '🏢 01 조직 이해&적용 탭 눌러보기',
    actionType: 'tabs',
    glowBoxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 35px rgba(56, 189, 248, 0.9)',
    ringClass: 'ring-4 ring-sky-400',
  },
  {
    step: 3,
    targetId: 'tutorial-target-postit',
    badge: '3단계 · 솔루션 나누기',
    title: '고민 포스트잇 & 마스킹테이프 조언',
    subtitle: '포스트잇을 클릭해 열고, 마스킹테이프로 따뜻한 조언과 위로를 붙여주세요.',
    description: '궁금한 포스트잇을 클릭하면 상세 화면이 열립니다. 하단에 마스킹테이프 댓글을 붙여 현실적인 경험담과 따뜻한 해법을 전해주세요.',
    tip: '💡 팁: 아래 [실제 포스트잇 상세창 열어보기]를 눌러 조언이 달리는 화면을 확인해보세요!',
    actionButtonText: '🔍 실제 포스트잇 상세창 열어보기',
    actionType: 'inspect',
    glowBoxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 35px rgba(52, 211, 153, 0.9)',
    ringClass: 'ring-4 ring-emerald-400',
    preferPlacement: 'right', // 👈 이 줄 추가! (포스트잇 우측에 배치)
    altTargetId: 'tutorial-target-tape-comments', // 상세창이 열리면 테이프 조언 영역을 비춤
  },
  {
    step: 4,
    targetId: 'tutorial-target-stickers',
    badge: '4단계 · 귀여운 공감 표현',
    title: '오피스 공감 스티커',
    subtitle: '퇴근도장, 드립커피, 귀여운 알통 등 굿즈 스티커를 포스트잇에 찰떡 부착해보세요.',
    description: '말 한마디보다 강한 응원! [스티커함]을 열거나 포스트잇 상세창에서 원하는 스티커를 골라 콕 붙여보세요.',
    tip: '💡 팁: 아래 [실제 스티커함 열어보기]를 누르면 귀여운 오피스 굿즈 스티커 보관함이 열립니다!',
    actionButtonText: '✨ 실제 스티커함 열어보기',
    actionType: 'stickers',
    altTargetId: 'tutorial-target-sticker-drawer', // 스티커함이 열리면 보관함 패널을 비춤
    glowBoxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 35px rgba(251, 113, 133, 0.9)',
    ringClass: 'ring-4 ring-rose-400',
  },
];

export const CommunityTutorialModal: React.FC<CommunityTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenWriteModal,
  onOpenInspectModal,
  onOpenStickerDrawer,
  onSelectTopic,
  currentStepIdx = 0,
  onStepChange,
  isInspectOpen = false,
  isStickerDrawerOpen = false,
}) => {
  const [activeStep, setActiveStep] = useState(currentStepIdx);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // 설명 카드의 실제 높이(팁 상자 포함)와 팁 상자 높이 — 카드가 타겟을 가리지 않도록 위치 계산에 사용
  const [fullCardHeight, setFullCardHeight] = useState(320);
  const [tipHeight, setTipHeight] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!isOpen || !card) return;

    let lastTip = 0;
    const observer = new ResizeObserver(() => {
      const tipH = tipRef.current?.offsetHeight ?? 0;
      if (tipH > 0) {
        lastTip = tipH + 14; // gap-3.5
        setTipHeight(lastTip);
      }
      // 팁 상자가 접혀 있어도 펼쳤을 때의 높이를 기준으로 기록
      setFullCardHeight(card.offsetHeight + (tipH > 0 ? 0 : lastTip));
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    setActiveStep(currentStepIdx);
  }, [currentStepIdx]);

  const stepData = TOUR_STEPS[activeStep] || TOUR_STEPS[0];
  const isFirst = activeStep === 0;
  const isLast = activeStep === TOUR_STEPS.length - 1;

  // 단계가 바뀐 직후 잠깐만 스포트라이트가 새 대상으로 미끄러지듯 이동 (평소엔 대상에 딱 붙어서 따라감)
  const [gliding, setGliding] = useState(false);

  // 스포트라이트 홀을 뚫어주기 위해 실제 타겟 요소의 위치 측정
  // useLayoutEffect: 단계가 바뀌면 화면을 그리기 "전에" 새 대상 위치를 재서, 이전 단계 위치가 한 프레임도 비치지 않게 한다
  useLayoutEffect(() => {
    if (!isOpen) return;

    const findTarget = () =>
      (stepData.altTargetId && document.getElementById(stepData.altTargetId)) ||
      document.getElementById(stepData.targetId);

    findTarget()?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // 매 프레임 위치를 재서 바뀐 경우에만 반영 → 부드러운 스크롤, 상세창·스티커함이 열리는 애니메이션에도 그대로 따라붙는다
    let raf = 0;
    let last = '';
    const track = () => {
      const r = findTarget()?.getBoundingClientRect() ?? null;
      const key = r ? `${r.top}|${r.left}|${r.width}|${r.height}` : 'none';
      if (key !== last) {
        last = key;
        setTargetRect(r);
      }
      raf = requestAnimationFrame(track);
    };
    track();

    setGliding(true);
    const glideTimer = setTimeout(() => setGliding(false), 450);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(glideTimer);
    };
  }, [isOpen, activeStep, stepData.targetId, stepData.altTargetId, isInspectOpen, isStickerDrawerOpen]);

  if (!isOpen) return null;

  const goToStep = (idx: number) => {
    sound.playPageFlipSound();
    setActiveStep(idx);
    if (onStepChange) onStepChange(idx);
  };

  const handleNext = () => {
    if (!isLast) {
      goToStep(activeStep + 1);
    } else {
      sound.playStickSound();
      handleClose();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      goToStep(activeStep - 1);
    }
  };

  const handleClose = () => {
    sound.playPageFlipSound();
    if (typeof window !== 'undefined' && neverShowAgain) {
      try {
        localStorage.setItem('genz_office_tutorial_seen', 'true');
      } catch {}
    }
    onClose();
  };

  const handleAction = () => {
    sound.playStickSound();
    if (stepData.actionType === 'write' && onOpenWriteModal) {
      onOpenWriteModal();
    } else if (stepData.actionType === 'tabs' && onSelectTopic) {
      onSelectTopic('01');
    } else if (stepData.actionType === 'inspect' && onOpenInspectModal) {
      onOpenInspectModal();
    } else if (stepData.actionType === 'stickers' && onOpenStickerDrawer) {
      onOpenStickerDrawer(true);
    }
  };

  // 설명 카드가 타겟 요소를 가리지 않도록 위치 자동 계산
  let isCompact = false; // 공간 부족 시 팁 상자를 숨겨 카드 높이를 줄임
  let cardStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 60,
  };

  if (targetRect) {
    const cardWidth = Math.min(420, window.innerWidth - 32);
    const cardHeight = fullCardHeight;
    const gap = 24; // 스포트라이트 테두리와 💡 배지까지 피해서 띄우는 간격
    const fitsRight = targetRect.right + 16 + cardWidth + 16 <= window.innerWidth;
    const fitsLeft = targetRect.left - 16 - cardWidth >= 16;

    let top: number;
    let left: number;

    if (stepData.preferPlacement === 'right' && (fitsRight || fitsLeft)) {
      // 타겟 옆(우측 우선, 안 되면 좌측)에 세로 중앙 정렬
      left = fitsRight ? targetRect.right + 16 : targetRect.left - 16 - cardWidth;
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));
    } else {
      const fitsBelow = targetRect.bottom + gap + cardHeight + 16 <= window.innerHeight;
      const fitsAbove = targetRect.top - gap - cardHeight >= 16;

      if (fitsBelow) {
        top = targetRect.bottom + gap;
      } else if (fitsAbove) {
        top = targetRect.top - gap - cardHeight;
      } else {
        // 위아래 모두 공간이 부족하면 팁 상자를 접어 카드를 줄인 뒤 타겟 위쪽에 배치
        isCompact = true;
        top = Math.max(16, targetRect.top - gap - (cardHeight - tipHeight));
      }

      const targetCenter = targetRect.left + targetRect.width / 2;
      left = targetCenter - cardWidth / 2;
      left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
    }

    cardStyle = {
      ...cardStyle,
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  } else {
    cardStyle = {
      ...cardStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(420px, calc(100vw - 32px))',
    };
  }

  return (
    // pointer-events-none: 튜토리얼 레이어가 클릭을 가로채지 않아 빛이 비추는 실제 화면(스티커함, 상세창 등)을 그대로 사용할 수 있음
    <div className="fixed inset-0 z-50 overflow-hidden font-ui select-none pointer-events-none">
      {/* 1. 배경 블랙 암전 & 해당 버튼만 불이 들어오는 스포트라이트 홀 */}
      {targetRect ? (
        <div
          className={`fixed pointer-events-none rounded-xl ${stepData.ringClass} ${
            // 단계 전환 순간에만 위치가 부드럽게 이동, 그 외엔 스크롤에 지연 없이 딱 붙어서 따라감
            gliding
              ? 'transition-[top,left,width,height,box-shadow] duration-[400ms] ease-out'
              : 'transition-[box-shadow] duration-300'
          }`}
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: stepData.glowBoxShadow,
            zIndex: 45,
          }}
        >
          <div className="absolute -top-3.5 -right-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-[#112334] font-black text-xs shadow-lg animate-bounce">
            💡
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40" />
      )}

      {/* 2. 타겟 버튼 옆에 뜨는 플로팅 설명 카드 */}
      <div
        ref={cardRef}
        style={{ ...cardStyle, transition: gliding ? 'top 400ms ease-out, left 400ms ease-out' : undefined }}
        className="pointer-events-auto bg-[#FAF8F5] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-2 border-[#E5DFD4] p-5 sm:p-6 text-[#112334] flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B729E]/10 text-[#2B729E] text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              <span>{stepData.badge}</span>
            </span>
            <span className="text-[11px] font-extrabold text-[#7A746B] bg-black/5 px-2 py-0.5 rounded-full">
              {activeStep + 1} / {TOUR_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-[#7A746B] hover:text-[#112334] transition-colors cursor-pointer"
            title="튜토리얼 건너뛰기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-black text-[#112334] tracking-tight leading-snug">
            {stepData.title}
          </h3>
          <p className="text-xs sm:text-[13px] text-[#554F44] font-medium leading-relaxed mt-1 break-keep">
            {stepData.description}
          </p>
        </div>

        {/* 실제 화면을 직접 열어볼 수 있는 액션 버튼 */}
        {stepData.actionButtonText && (
          <button
            onClick={handleAction}
            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#F2EFEB] text-[#112334] font-bold text-xs border border-[#D5CFC5] hover:border-[#2B729E] shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>{stepData.actionButtonText}</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#2B729E] group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        <div
          ref={tipRef}
          className={`bg-[#EBF2F7] border border-[#C5DCEB] rounded-lg px-3 py-2 text-[11px] text-[#1C4D6F] font-medium items-center gap-1.5 break-keep ${
            isCompact ? 'hidden' : 'flex'
          }`}
        >
          <span>{stepData.tip}</span>
        </div>

        <div className="pt-2 border-t border-[#E5DFD4] flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-[#7A746B] cursor-pointer">
            <input
              type="checkbox"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="rounded text-[#2B729E] w-3 h-3 cursor-pointer"
            />
            <span>다시 안 보기</span>
          </label>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                isFirst
                  ? 'text-black/20 cursor-not-allowed'
                  : 'text-[#504A41] hover:text-[#112334] hover:bg-black/5 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>이전</span>
            </button>

            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-[#112334] hover:bg-[#203548] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <span>{isLast ? '완료하고 시작하기 🎉' : '다음 단계'}</span>
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};