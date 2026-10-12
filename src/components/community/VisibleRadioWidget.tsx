//  수정 후 (맨 위에 'use client' 추가 및 @/ 경로 적용)
'use client';

import React, { useState } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Sparkles, 
  Headphones, 
  Mic2
} from 'lucide-react';
import { sound } from '@/utils/audio';

export interface VisibleRadioWidgetProps {
  episodeTitle?: string;
  djName?: string;
  streamUrl?: string;
  isLive?: boolean;
  className?: string;
}

export const VisibleRadioWidget: React.FC<VisibleRadioWidgetProps> = ({
  episodeTitle = 'EP.01 젠지 신입사원 사연 온에어 (라이브 스트리밍)',
  djName = '사내 DJ & 게스트',
  streamUrl,
  isLive = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(128);

  const togglePlay = () => {
    sound.playTapeSnipSound();
    setIsPlaying(!isPlaying);
  };

  return (
    <section className={`w-full max-w-6xl mx-auto px-4 sm:px-8 transition-all duration-300 ${className}`}>
      <div className="bg-[#112334] text-white rounded-2xl shadow-xl border border-[#203548] overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#0C1B2A] border-b border-[#1E3348] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E84545]/20 border border-[#E84545]/50 text-[#FF6B6B] text-[11px] font-bold font-ui">
              <span className="w-2 h-2 rounded-full bg-[#E84545] animate-pulse" />
              <span>LIVE ON-AIR</span>
            </div>

            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#FFDC73]" />
              <h3 className="font-ui font-bold text-sm sm:text-base text-white tracking-tight">
                젠지 온에어 · 보이는 라디오
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 font-ui text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-[#9CB3C9] text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{listenerCount}명 청취 중</span>
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-2.5 py-1 rounded-md bg-[#1B3147] hover:bg-[#25425E] text-white/90 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <span>{isOpen ? '라디오 접기' : '라디오 펼치기'}</span>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Studio Content */}
        {isOpen && (
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* 조장 연결용 비디오/오디오 슬롯 영역 */}
            <div className="w-full lg:w-3/5 bg-[#0A1622] rounded-xl border border-[#203952] p-4 sm:p-5 relative overflow-hidden group">
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#2B729E]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#FFDC73]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#172E44] to-[#2B729E] flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                  <Mic2 className={`w-10 h-10 text-[#FFDC73] transition-transform ${isPlaying ? 'scale-110 animate-bounce' : ''}`} />
                  {isPlaying && (
                    <div className="absolute bottom-2 inset-x-3 flex items-end justify-center gap-1 h-4">
                      <span className="w-1 bg-[#FFDC73] h-3 animate-pulse" />
                      <span className="w-1 bg-white h-4 animate-bounce" />
                      <span className="w-1 bg-[#2B729E] h-2 animate-pulse" />
                      <span className="w-1 bg-[#FFDC73] h-4 animate-bounce" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-[11px] font-bold text-[#FFDC73] uppercase tracking-wider font-ui flex items-center gap-1">
                      <Headphones className="w-3 h-3" /> 보이는 라디오 영역
                    </span>
                    <span className="text-white/40 text-xs">·</span>
                    <span className="text-xs text-[#9BB1C7] font-ui">{djName}</span>
                  </div>

                  <h4 className="font-ui font-extrabold text-base sm:text-lg text-white mb-1.5 leading-snug">
                    {episodeTitle}
                  </h4>

                  <p className="text-xs text-[#829DB5] font-ui leading-relaxed">
                    프론트엔드 조장 전용 컨텐츠 영역입니다. 실시간 방송 스트리밍, 영상 임베드 또는 오디오 플레이어 코드를 이 위치에 자유롭게 연결하여 사용하실 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#718DA7] font-mono">
                <span>&lt;VisibleRadioSlot /&gt; 조장 코드 삽입 위치 확보 완료</span>
                <span className="text-[#FFDC73] font-sans text-[11px]">컨텐츠 자유 연동 가능</span>
              </div>
            </div>

            {/* Right: Audio Controls */}
            <div className="w-full lg:w-2/5 flex flex-col justify-between self-stretch gap-4">
              <div className="bg-[#14293D] p-4 rounded-xl border border-[#243F5B] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-[#2B729E] hover:bg-[#388BBD] active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform"
                    title={isPlaying ? '일시정지' : '재생'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div>
                    <span className="text-[10px] font-bold text-[#9AB3C9] uppercase block font-ui">
                      {isPlaying ? '재생 중' : '재생 대기'}
                    </span>
                    <span className="text-xs font-bold text-white font-ui">
                      오디오 스트림 플레이어
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg bg-[#0E1F30] hover:bg-[#1A334E] text-[#9AB3C9] hover:text-white transition-colors"
                  title={isMuted ? '음소거 해제' : '음소거'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-[#0D1D2C] p-3.5 rounded-xl border border-[#1F374E] text-xs font-ui">
                <span className="font-bold text-[#FFDC73] block mb-1.5 text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 프론트엔드 담당 조장 가이드
                </span>
                <p className="text-[11px] text-[#A5BDD3] leading-relaxed">
                  본 컴포넌트는 UI 골격과 위치가 확보되어 있습니다. 조장님께서 준비하신 라디오 방송 소스나 플레이어 라이브러리를 자유롭게 배치하시면 됩니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};