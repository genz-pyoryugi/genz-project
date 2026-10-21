'use client';

// [🚩 신고] 버튼 — 누르면 신고 사유를 고르는 작은 메뉴가 열린다

import React, { useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { REPORT_REASONS, ReportReason } from '@/lib/community/report';

interface ReportButtonProps {
  onReport: (reason: ReportReason) => void;
  label?: string;
  className?: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({ onReport, label = '신고', className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#8A7F72] hover:text-[#B4232F] hover:bg-[#B4232F]/10 transition-colors cursor-pointer ${className}`}
        title="문제가 있는 내용 신고하기"
        aria-expanded={open}
      >
        <Flag className="w-3 h-3" />
        {label}
      </button>
      {open && (
        <span className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg bg-white border border-[#E5DFD4] shadow-lg py-1 font-ui">
          <span className="block px-3 pt-1 pb-1.5 text-[10px] font-bold text-[#857F76]">신고 사유를 골라 주세요</span>
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setOpen(false);
                onReport(r);
              }}
              className="block w-full text-left px-3 py-1.5 text-xs text-[#112334] hover:bg-[#FDECEE] hover:text-[#B4232F]"
            >
              {r}
            </button>
          ))}
        </span>
      )}
    </span>
  );
};
