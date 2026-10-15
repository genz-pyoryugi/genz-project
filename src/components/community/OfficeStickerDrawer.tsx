import React, { useState, useMemo } from 'react';
import { OFFICE_STICKER_LIBRARY } from '@/data/officeData';
import { OfficeStickerCategory, OfficeStickerDef } from '@/types/community';
import { OfficeStickerSvg } from './OfficeStickerSvg';
import { Sparkles, X, Check, Search } from 'lucide-react';
import { sound } from '@/utils/audio';

interface OfficeStickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeStickerId: string | null;
  onSelectSticker: (stickerId: string) => void;
  onCancelPeel: () => void;
}

export const OfficeStickerDrawer: React.FC<OfficeStickerDrawerProps> = ({
  isOpen,
  onClose,
  activeStickerId,
  onSelectSticker,
  onCancelPeel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<OfficeStickerCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { key: OfficeStickerCategory; label: string; icon: string }[] = [
    { key: 'all', label: '전체', icon: '🗂️' },
    { key: 'character', label: '캐릭터', icon: '🐻' },
    { key: 'memo', label: '메모지', icon: '📝' },
    { key: 'deco', label: '데코', icon: '✨' },
  ];

  const categoryCounts = useMemo(() => {
    return {
      all: OFFICE_STICKER_LIBRARY.length,
      character: OFFICE_STICKER_LIBRARY.filter((s) => s.category === 'character').length,
      memo: OFFICE_STICKER_LIBRARY.filter((s) => s.category === 'memo').length,
      deco: OFFICE_STICKER_LIBRARY.filter((s) => s.category === 'deco').length,
    };
  }, []);

  const filteredStickers = useMemo(() => {
    return OFFICE_STICKER_LIBRARY.filter((s) => {
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        s.tag.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen && !activeStickerId) return null;

  return (
    <>
      {/* Floating Sticking Banner when active sticker is held */}
      {activeStickerId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] animate-bounce duration-1000">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#112334] text-white rounded-full shadow-2xl border border-[#2B729E] font-ui text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[#FFDC73]">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              스티커를 떼어냈습니다!
            </span>
            <span className="text-[#D8D2C6]">원하는 포스트잇 위를 클릭하여 붙이세요.</span>
            <button
              onClick={() => {
                sound.playTapeSnipSound();
                onCancelPeel();
              }}
              className="ml-1 px-2.5 py-0.5 rounded-full bg-[#203548] hover:bg-[#2B435A] text-white text-[11px] font-medium transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Main Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[55] max-w-3xl mx-auto px-4 pb-4 animate-in slide-in-from-bottom duration-200">
          <div id="tutorial-target-sticker-drawer" className="bg-[#FAF8F5] rounded-t-2xl rounded-b-xl shadow-2xl border-2 border-[#D2CCC2] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#EAE6DF] border-b border-[#D2CCC2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗂️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-ui font-bold text-sm text-[#112334]">
                      오피스 공감 스티커 보관함
                    </h4>
                    <span className="px-2 py-0.5 bg-[#2B729E] text-white text-[10px] font-bold rounded-full font-ui">
                      총 {OFFICE_STICKER_LIBRARY.length}종
                    </span>
                  </div>
                  <p className="text-[11px] font-ui text-[#736D64]">
                    동기들의 포스트잇에 칼퇴 응원과 공감 스티커를 직접 붙여보세요!
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-full text-[#645F56] hover:bg-[#DDD7CC] transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Tabs & Quick Search */}
            <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#E5DFD4] flex flex-wrap items-center justify-between gap-2">
              {/* Category buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => {
                  const isCatActive = selectedCategory === cat.key;
                  const count = categoryCounts[cat.key];
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-1 rounded-full text-xs font-ui transition-all flex items-center gap-1.5 ${
                        isCatActive
                          ? 'bg-[#112334] text-white font-semibold shadow-xs'
                          : 'bg-[#EDE8E0] text-[#555048] hover:bg-[#E0DAD0] font-medium'
                      }`}
                    >
                      <span className="text-xs">{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isCatActive ? 'bg-white/20 text-white' : 'bg-black/8 text-[#666056]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="스티커 검색..."
                  className="pl-7 pr-3 py-1 text-xs rounded-full bg-[#EDE8E0] border border-transparent focus:border-[#2B729E] focus:bg-white text-[#112334] placeholder:text-[#888175] outline-none transition-colors w-28 sm:w-36 font-ui"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-black/40 hover:text-black"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Stickers Grid */}
            <div className="p-4 sm:p-5 max-h-72 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredStickers.map((sticker: OfficeStickerDef) => {
                const isSelected = activeStickerId === sticker.id;
                return (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      sound.playPeelSound();
                      onSelectSticker(sticker.id);
                    }}
                    className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                      isSelected
                        ? 'bg-[#E5EEF5] border-[#2B729E] ring-2 ring-[#2B729E] shadow-sm scale-105'
                        : 'bg-white border-[#DCD5C8] hover:border-[#2B729E] hover:bg-[#F7FAFD] hover:shadow-xs'
                    }`}
                  >
                    <div className="relative transform transition-transform group-hover:scale-110">
                      <OfficeStickerSvg type={sticker.iconType} size={46} />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2B729E] text-white rounded-full flex items-center justify-center text-[9px]">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="text-center w-full">
                      <p className="font-ui font-bold text-xs text-[#112334] truncate">
                        {sticker.name}
                      </p>
                      <p className="font-ui text-[10px] text-[#736D64] truncate">
                        {sticker.tag}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredStickers.length === 0 && (
                <div className="col-span-2 sm:col-span-4 py-8 text-center text-xs font-ui text-[#736D64]">
                  조건에 맞는 스티커가 없습니다.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-[#EFECE5] text-[11px] font-ui text-[#736D64] flex items-center justify-between border-t border-[#DCD5C8]">
              <span>스티커를 클릭하면 떼어내어 즉시 '붙이기 모드'로 전환됩니다.</span>
              <button
                onClick={onClose}
                className="text-xs font-bold text-[#2B729E] hover:underline"
              >
                서랍 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};