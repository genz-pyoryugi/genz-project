import React from 'react';
import { ChapterInfo, ChapterId } from '../../types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { sound } from '../../utils/audio';

interface OfficeFooterProps {
  currentChapter: ChapterInfo;
  onSelectChapter: (chapterId: ChapterId) => void;
  onOpenTableOfContents: () => void;
}

export const OfficeFooter: React.FC<OfficeFooterProps> = ({
  currentChapter,
  onSelectChapter,
  onOpenTableOfContents,
}) => {
  const currentIndex = CHAPTER_LIST.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? CHAPTER_LIST[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTER_LIST.length - 1 ? CHAPTER_LIST[currentIndex + 1] : null;

  return (
    <footer className="w-full max-w-5xl mx-auto mt-16 mb-12 px-4 sm:px-6">
      <div className="w-full h-px bg-[#D6D0C5] mb-6" />

      <div className="flex items-center justify-between font-ui text-xs text-[#555048]">
        {/* Left: Previous Chapter */}
        <div>
          {prevChapter ? (
            <button
              onClick={() => {
                sound.playPageFlipSound();
                onSelectChapter(prevChapter.id);
              }}
              className="hover:text-[#112334] transition-colors flex items-center gap-1"
            >
              <span>← {prevChapter.number} {prevChapter.title}</span>
            </button>
          ) : (
            <span className="opacity-0">placeholder</span>
          )}
        </div>

        {/* Center: 목차 button (Exact match to screenshot) */}
        <button
          onClick={() => {
            sound.playPageFlipSound();
            onOpenTableOfContents();
          }}
          className="px-5 py-1.5 rounded-full border border-[#CCC6BC] text-[#555048] hover:border-[#112334] hover:text-[#112334] transition-colors"
        >
          목차
        </button>

        {/* Right: Next Chapter (Exact match to screenshot: '02 업무 커뮤니케이션 →') */}
        <div>
          {nextChapter ? (
            <button
              onClick={() => {
                sound.playPageFlipSound();
                onSelectChapter(nextChapter.id);
              }}
              className="hover:text-[#112334] transition-colors flex items-center gap-1 font-medium"
            >
              <span>{nextChapter.number} {nextChapter.title} →</span>
            </button>
          ) : (
            <span className="opacity-0">placeholder</span>
          )}
        </div>
      </div>
    </footer>
  );
};
