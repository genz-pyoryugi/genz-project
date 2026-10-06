import React from 'react';
import { ChapterId } from '../../types/community';
import { CHAPTER_LIST } from '@/data/officeData';
import { X, BookOpen } from 'lucide-react';
import { sound } from '../../utils/audio';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChapter: (chapterId: ChapterId) => void;
  currentChapterId: ChapterId;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  onSelectChapter,
  currentChapterId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] w-full max-w-xl rounded-2xl shadow-2xl border border-[#D5CFC5] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#EAE6DF] border-b border-[#D5CFC5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2B729E]" />
            <h3 className="font-ui font-bold text-sm text-[#112334]">
              젠지 표류기 · 직장생활 7대 히어로 목차
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#DCD7CD] text-[#58534C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chapters Grid */}
        <div className="p-6 space-y-2 max-h-[70vh] overflow-y-auto">
          {CHAPTER_LIST.map((chap) => {
            const isCurrent = chap.id === currentChapterId;
            return (
              <button
                key={chap.id}
                onClick={() => {
                  sound.playPageFlipSound();
                  onSelectChapter(chap.id);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#E5EEF5] border-[#2B729E] ring-1 ring-[#2B729E] text-[#112334]'
                    : 'bg-white border-[#E0D8CC] hover:bg-[#F7F4EE] hover:border-[#2B729E]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-ui font-black text-sm text-[#2B729E]">
                      {chap.number}
                    </span>
                    <span className="font-ui font-bold text-sm text-[#112334]">
                      {chap.title}
                    </span>
                    <span className="text-xs text-[#736D64] font-ui">
                      · {chap.subtitle}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A746A] line-clamp-1">
                    {chap.description}
                  </p>
                </div>

                {isCurrent && (
                  <span className="text-[11px] font-bold text-[#2B729E] bg-white px-2 py-0.5 rounded shadow-2xs">
                    현재 페이지
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
