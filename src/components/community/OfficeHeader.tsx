import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { sound } from '../../utils/audio';

interface OfficeHeaderProps {
  onSearch: (keyword: string) => void;
  activeChapterNumber: string;
}

export const OfficeHeader: React.FC<OfficeHeaderProps> = ({
  onSearch,
  activeChapterNumber,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playTapeSnipSound();
    onSearch(searchValue.trim());
  };

  return (
    <header className="w-full bg-[#EAE6DF] border-b border-[#D8D2C6] px-6 sm:px-12 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left: 젠지 표류기 Brand Wordmark (Exact match to team screenshot) */}
        <div className="flex items-center gap-3">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              sound.playPageFlipSound();
            }}
            className="group flex items-baseline gap-2"
          >
            <span className="font-ui font-black text-xl sm:text-2xl tracking-tight text-[#112334] group-hover:text-[#2B729E] transition-colors">
              젠지 표류기
            </span>
            <span className="hidden md:inline font-ui text-xs text-[#7A746B] font-medium">
              신입사원 오피스 가이드
            </span>
          </a>
        </div>

        {/* Right: Search Bar & Button (Exact match to team screenshot) */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-0 w-full max-w-xs sm:max-w-sm">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full px-4 py-1.5 rounded-l-full bg-[#F4F1EC] border border-r-0 border-[#D2CCC2] text-xs text-[#112334] placeholder:text-[#9A9387] focus:outline-none focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-1.5 rounded-r-full bg-[#112334] hover:bg-[#203548] text-white text-xs font-semibold tracking-wide transition-colors whitespace-nowrap"
          >
            검색
          </button>
        </form>
      </div>
    </header>
  );
};
