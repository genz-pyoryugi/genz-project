import React, { useState } from 'react';
import { ChapterInfo, ChapterId } from '../../types/community';
// ✅ 수정 후 (Next.js 절대 경로 @ 사용):
import { CHAPTER_LIST } from '@/data/officeData';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { sound } from '../../utils/audio';

interface ChapterHeaderProps {
  currentChapter: ChapterInfo;
  onSelectChapter: (chapterId: ChapterId) => void;
  activeSubTab: string;
  onSelectSubTab: (tab: string) => void;
  totalPostItCount: number;
}

export const ChapterHeader: React.FC<ChapterHeaderProps> = ({
  currentChapter,
  onSelectChapter,
  activeSubTab,
  onSelectSubTab,
  totalPostItCount,
}) => {
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);

  const subTabs = [
    { id: 'cardnews', label: '카드뉴스' },
    { id: 'shortform', label: '숏폼' },
    { id: 'quiz', label: '퀴즈' },
    { id: 'checklist', label: '체크리스트' },
    { id: 'radio', label: '보이는 라디오' },
    { id: 'community', label: `커뮤니티 (${totalPostItCount})`, highlight: true },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto pt-8 pb-4 px-4 sm:px-6">
      {/* Chapter Number & Title Area (Exact visual layout from screenshot) */}
      <div className="relative flex flex-col items-start mb-6">
        {/* Chapter Switcher Dropdown */}
        <div className="relative mb-1">
          <button
            onClick={() => setIsChapterMenuOpen(!isChapterMenuOpen)}
            className="flex items-baseline gap-3 text-left group"
          >
            {/* Signature Light Steel Blue Chapter Number (Color extracted from uploaded 01 image) */}
            <span className="font-ui font-extrabold text-5xl sm:text-6xl text-[#2B729E] tracking-tight leading-none group-hover:opacity-85 transition-opacity">
              {currentChapter.number}
            </span>
            <div className="flex items-center gap-1.5">
              <h1 className="font-ui font-bold text-2xl sm:text-3xl text-[#112334] tracking-tight">
                {currentChapter.title}
              </h1>
              <ChevronDown className="w-5 h-5 text-[#857F76] group-hover:text-[#112334] transition-colors" />
            </div>
          </button>

          {/* Subtitle */}
          <p className="font-ui text-xs sm:text-sm text-[#736D64] mt-1 ml-0.5">
            {currentChapter.subtitle}
          </p>

          {/* Chapter Dropdown Menu */}
          {isChapterMenuOpen && (
            <div className="absolute top-full left-0 mt-2 z-40 w-80 bg-[#FAF8F5] rounded-xl shadow-xl border border-[#D5CFC5] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8C8478] border-b border-[#E8E2D8]">
                직장생활 7대 히어로 상황 선택
              </div>
              {CHAPTER_LIST.map((chap) => (
                <button
                  key={chap.id}
                  onClick={() => {
                    sound.playPageFlipSound();
                    onSelectChapter(chap.id);
                    setIsChapterMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    currentChapter.id === chap.id
                      ? 'bg-[#E5EEF4] text-[#112334] font-bold'
                      : 'text-[#58534C] hover:bg-[#EFECE5]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2B729E]">{chap.number}</span>
                    <span>{chap.title}</span>
                  </div>
                  <span className="text-[10px] text-[#8C8478]">{chap.subtitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hairline Divider (Matching screenshot) */}
      <div className="w-full h-px bg-[#D6D0C5] mb-6" />

      {/* Sub Tabs Bar (Matching screenshot pill button styles) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playPageFlipSound();
                onSelectSubTab(tab.id);
              }}
              className={`px-4 sm:px-5 py-1.5 text-xs font-ui rounded-full transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#112334] text-white font-medium shadow-xs'
                  : 'bg-transparent border border-[#CCC6BC] text-[#555048] hover:border-[#112334] hover:text-[#112334]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
