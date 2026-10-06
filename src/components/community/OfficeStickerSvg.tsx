import React from 'react';

interface OfficeStickerSvgProps {
  type: string;
  size?: number | string;
  className?: string;
}

export const OfficeStickerSvg: React.FC<OfficeStickerSvgProps> = ({
  type,
  size = 40,
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  switch (type) {
    // 1. 칼퇴기원 (Run home / 6:00 PM)
    case 'run-home':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#2E75A3" />
          <circle cx="32" cy="32" r="23" fill="#2B729E" />
          {/* Running shoes / Exit runner */}
          <path d="M22 42 L28 32 L34 36 L44 26 M34 36 L30 46" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="38" cy="20" r="4" fill="#FFFFFF" />
          {/* 6:00 badge */}
          <rect x="18" y="45" width="28" height="11" rx="3" fill="#112334" />
          <text x="32" y="53" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">칼퇴기원</text>
        </svg>
      );

    // 2. 커피수혈 (Iced Americano)
    case 'coffee-drip':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <path d="M20 18 L24 52 C24 55 27 57 32 57 C37 57 40 55 40 52 L44 18 Z" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" fill="#FFFFFF" />
          {/* Cup body */}
          <path d="M21 19 L25 51 C25 54 28 56 32 56 C36 56 39 54 39 51 L43 19 Z" fill="#E8F4FA" stroke="#A9C7D8" strokeWidth="1.5" />
          {/* Coffee liquid */}
          <path d="M22 26 L25 50 C25 52 28 54 32 54 C36 54 39 52 39 50 L42 26 Z" fill="#4B3322" />
          {/* Ice cubes */}
          <rect x="26" y="30" width="6" height="6" rx="1" fill="#FFFFFF" opacity="0.45" />
          <rect x="32" y="36" width="6" height="6" rx="1" fill="#FFFFFF" opacity="0.45" />
          {/* Straw */}
          <path d="M36 6 L32 24" stroke="#2B729E" strokeWidth="3" strokeLinecap="round" />
          {/* Cup Lid */}
          <ellipse cx="32" cy="18" rx="13" ry="3.5" fill="#FFFFFF" stroke="#A9C7D8" strokeWidth="1.5" />
          {/* Badge */}
          <rect x="18" y="44" width="28" height="11" rx="3" fill="#2B729E" />
          <text x="32" y="52" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">커피수혈</text>
        </svg>
      );

    // 3. 멘붕/살려줘 (Melting Face / SOS)
    case 'melting-mind':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="28" r="20" stroke="#FFFFFF" strokeWidth="5" fill="#FFDC73" />
          <path d="M12 28 C12 39 20 46 24 49 C26 53 28 55 31 53 C34 50 36 55 40 52 C44 49 52 39 52 28 C52 17 43 8 32 8 C21 8 12 17 12 28 Z" fill="#FFDC73" />
          {/* Dizzy X eyes */}
          <path d="M22 22 L28 28 M28 22 L22 28" stroke="#3D2905" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M36 22 L42 28 M42 22 L36 28" stroke="#3D2905" strokeWidth="2.5" strokeLinecap="round" />
          {/* Wavy mouth */}
          <path d="M24 37 Q28 42 32 37 T40 37" stroke="#3D2905" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Sweat drop */}
          <path d="M46 16 C46 16 50 20 50 22 C50 24 48 25 46 25 C44 25 42 24 42 22 C42 20 46 16 46 16 Z" fill="#2B729E" />
          <rect x="18" y="47" width="28" height="11" rx="3" fill="#D94B38" />
          <text x="32" y="55" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">멘붕/SOS</text>
        </svg>
      );

    // 4. 질문있습니다 (Raised Hand)
    case 'question-hand':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <rect x="10" y="8" width="44" height="48" rx="8" stroke="#FFFFFF" strokeWidth="5" fill="#FFFFFF" />
          <rect x="12" y="10" width="40" height="44" rx="6" fill="#EBF4FA" stroke="#BED5E6" strokeWidth="1.5" />
          {/* Hand icon */}
          <path d="M24 36 V24 C24 22 27 22 27 24 V34 M27 24 V20 C27 18 30 18 30 20 V34 M30 20 V22 C30 20 33 20 33 22 V34 M33 23 C33 21 36 21 36 23 V36 C36 42 32 46 27 46 C23 46 20 42 20 38 L22 34"
            stroke="#2B729E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#FFFFFF" />
          {/* Question mark bubble */}
          <circle cx="44" cy="18" r="8" fill="#2B729E" />
          <text x="44" y="22" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">?</text>
          <text x="32" y="51" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#112334" fontFamily="sans-serif">질문있습니다</text>
        </svg>
      );

    // 5. 동아일보 팩트체크 (News Fact Check)
    case 'donga-fact':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <rect x="10" y="10" width="44" height="44" rx="4" stroke="#FFFFFF" strokeWidth="5" fill="#FFFFFF" />
          <rect x="12" y="12" width="40" height="40" rx="3" fill="#FAF8F5" stroke="#112334" strokeWidth="1.8" />
          {/* Newspaper Masthead */}
          <rect x="16" y="16" width="32" height="6" fill="#112334" />
          <text x="32" y="21" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#FFFFFF" fontFamily="serif">東亞日報 FACT</text>
          {/* Newspaper lines */}
          <line x1="16" y1="26" x2="34" y2="26" stroke="#48535F" strokeWidth="1.5" />
          <line x1="16" y1="30" x2="34" y2="30" stroke="#7E8A98" strokeWidth="1.2" />
          <line x1="16" y1="34" x2="34" y2="34" stroke="#7E8A98" strokeWidth="1.2" />
          {/* Green Check Seal */}
          <circle cx="42" cy="34" r="8" fill="#2E854B" />
          <path d="M38 34 L41 37 L47 31" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Banner bottom */}
          <rect x="14" y="42" width="36" height="8" rx="2" fill="#2B729E" />
          <text x="32" y="48" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">공식 가이드 검증</text>
        </svg>
      );

    // 6. 공감 100% (100% Empathy Stamp)
    case 'empathy-100':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#D94B38" />
          <circle cx="32" cy="32" r="23" fill="#D94B38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
          <text x="32" y="32" textAnchor="middle" fontSize="13" fontWeight="900" fill="#FFFFFF" fontFamily="sans-serif">100%</text>
          <text x="32" y="44" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#FFDC73" fontFamily="sans-serif">무한공감</text>
        </svg>
      );

    // 7. 이건 메모각 (Pushpin Bookmark)
    case 'memo-pin':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="25" stroke="#FFFFFF" strokeWidth="5" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="23" fill="#FFF8E0" stroke="#E2CD90" strokeWidth="1.5" />
          {/* Pushpin */}
          <path d="M26 18 L38 18 L36 28 L42 34 L33 34 L32 46 L31 34 L22 34 L28 28 Z" fill="#D94B38" />
          <circle cx="32" cy="18" r="4" fill="#B02C1B" />
          <rect x="18" y="45" width="28" height="10" rx="2" fill="#112334" />
          <text x="32" y="52.5" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">이건 메모각</text>
        </svg>
      );

    // 8. 선배의 팁 (Senior Tip / Thumbs Up)
    case 'senior-tip':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <rect x="10" y="10" width="44" height="44" rx="8" stroke="#FFFFFF" strokeWidth="5" fill="#FFFFFF" />
          <rect x="12" y="12" width="40" height="40" rx="6" fill="#112334" />
          {/* Lightbulb */}
          <path d="M32 18 C27 18 24 22 24 26 C24 29 26 31 28 33 L28 36 L36 36 L36 33 C38 31 40 29 40 26 C40 22 37 18 32 18 Z" fill="#FFDC73" />
          <rect x="29" y="37" width="6" height="2" rx="0.5" fill="#CBD5E1" />
          <text x="32" y="47" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">선배의 꿀팁</text>
        </svg>
      );

// 9. 고생했어요(토닥토닥)
    case 'pat-pat':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#F4EAE0" />
          <circle cx="32" cy="32" r="23" fill="#E8D7C5" />
          <circle cx="26" cy="27" r="2" fill="#5A3E26" />
          <circle cx="38" cy="27" r="2" fill="#5A3E26" />
          <path d="M29 32 Q32 35 35 32" stroke="#5A3E26" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M38 16 C34 16 30 18 27 21 C29 20 32 19 36 19 L42 20" stroke="#7A5C43" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 20 C44 18 46 16 48 18 C50 16 52 18 52 20 C52 23 48 26 48 26 C48 26 44 23 44 20 Z" fill="#E85D75" />
          <rect x="15" y="45" width="34" height="11" rx="3" fill="#7A5C43" />
          <text x="32" y="53" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">토닥토닥</text>
        </svg>
      );

    // 10. 잘하고있어!
    case 'doing-great':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#207A58" />
          <circle cx="32" cy="32" r="23" fill="#29936C" />
          <path d="M26 38 V30 C26 27 29 27 30 25 L32 19 C33 17 36 17 36 20 V27 H43 C45 27 46 29 45 31 L42 41 C41 43 39 44 37 44 H26" fill="#FFFFFF" stroke="#14543C" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="22" y="30" width="5" height="14" rx="2" fill="#FFDC73" stroke="#14543C" strokeWidth="1" />
          <path d="M46 16 L47 20 L51 21 L47 22 L46 26 L45 22 L41 21 L45 20 Z" fill="#FFDC73" />
          <rect x="15" y="46" width="34" height="11" rx="3" fill="#14543C" />
          <text x="32" y="54" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">잘하고있어!</text>
        </svg>
      );

    // 11. 할 수 있어!
    case 'you-can-do-it':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#F08A35" />
          <circle cx="32" cy="32" r="23" fill="#E07A2B" />
          <rect x="24" y="24" width="16" height="16" rx="4" fill="#FFFFFF" stroke="#873F05" strokeWidth="1.5" />
          <path d="M24 28 H36 M24 32 H36 M24 36 H34" stroke="#873F05" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="38" cy="30" r="3" fill="#FFFFFF" stroke="#873F05" strokeWidth="1.5" />
          <path d="M18 20 L22 25 L19 26 L24 32" stroke="#FFDC73" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M46 20 L42 25 L45 26 L40 32" stroke="#FFDC73" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="45" width="36" height="11" rx="3" fill="#873F05" />
          <text x="32" y="53" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">할 수 있어!</text>
        </svg>
      );

    // 12. 궁금해요
    case 'curious':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <rect x="10" y="8" width="44" height="48" rx="8" stroke="#FFFFFF" strokeWidth="5" fill="#FFFFFF" />
          <rect x="12" y="10" width="40" height="44" rx="6" fill="#F0F6FA" stroke="#BFD7EA" strokeWidth="1.5" />
          <circle cx="28" cy="25" r="10" stroke="#3F6188" strokeWidth="3" fill="#D8E8F5" />
          <path d="M35 32 L44 41" stroke="#3F6188" strokeWidth="4" strokeLinecap="round" />
          <circle cx="28" cy="25" r="4" fill="#1B3552" />
          <circle cx="26" cy="23" r="1.5" fill="#FFFFFF" />
          <text x="44" y="20" fontSize="12" fontWeight="bold" fill="#F08A35" fontFamily="sans-serif">?</text>
          <rect x="16" y="44" width="32" height="11" rx="3" fill="#3F6188" />
          <text x="32" y="52" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">궁금해요</text>
        </svg>
      );

    // 13. 응원합니다
    case 'cheer-up':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#E85D75" />
          <circle cx="32" cy="32" r="23" fill="#D6456E" />
          <path d="M22 25 L34 20 V38 L22 33 Z" fill="#FFFFFF" stroke="#8A173A" strokeWidth="1.5" />
          <ellipse cx="34" cy="29" rx="3" ry="9" fill="#FFDC73" stroke="#8A173A" strokeWidth="1.5" />
          <path d="M22 29 H18 V33 H22" fill="#FFFFFF" stroke="#8A173A" strokeWidth="1.5" />
          <path d="M22 33 L20 40 H23 L24 33" fill="#FFDC73" stroke="#8A173A" strokeWidth="1.5" />
          <path d="M42 22 C42 20 44 19 45 20 C46 19 48 20 48 22 C48 25 45 27 45 27 C45 27 42 25 42 22 Z" fill="#FFFFFF" />
          <path d="M44 32 C44 30 46 29 47 30 C48 29 50 30 50 32 C50 35 47 37 47 37 C47 37 44 35 44 32 Z" fill="#FFDC73" />
          <rect x="14" y="46" width="36" height="11" rx="3" fill="#8A173A" />
          <text x="32" y="54" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">응원합니다</text>
        </svg>
      );

    // 14. 비타민C(기운내요)
    case 'vitamin-c':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#FFAF38" />
          <circle cx="32" cy="32" r="23" fill="#F29A2E" />
          <path d="M20 28 A12 12 0 0 0 44 28 Z" fill="#FFF275" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M32 28 L23 24 M32 28 L28 20 M32 28 L36 20 M32 28 L41 24" stroke="#FFAF38" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="22" y="34" width="10" height="7" rx="3" fill="#FF4D4D" stroke="#FFFFFF" strokeWidth="1" />
          <rect x="32" y="34" width="10" height="7" rx="3" fill="#FFE156" stroke="#FFFFFF" strokeWidth="1" />
          <text x="32" y="40" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#5E3000" fontFamily="sans-serif">VIT-C</text>
          <rect x="13" y="47" width="38" height="11" rx="3" fill="#C96808" />
          <text x="32" y="55" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">비타민C(기운내요)</text>
        </svg>
      );

    // 15. 반짝별(성장)
    case 'sparkle-star':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#F7B731" />
          <circle cx="32" cy="32" r="23" fill="#E19D15" />
          <polygon points="32,15 36,25 47,25 38,32 41,43 32,36 23,43 26,32 17,25 28,25" fill="#FFF9D2" stroke="#875300" strokeWidth="1.5" />
          <circle cx="32" cy="28" r="2" fill="#875300" />
          <path d="M46 16 L48 20 L52 22 L48 24 L46 28 L44 24 L40 22 L44 20 Z" fill="#FFFFFF" />
          <rect x="15" y="46" width="34" height="11" rx="3" fill="#875300" />
          <text x="32" y="54" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">반짝성장</text>
        </svg>
      );

    // 16. 행운가득
    case 'heart-clover':
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none" className={`drop-shadow-[0_2px_4px_rgba(17,35,52,0.22)] ${className}`}>
          <circle cx="32" cy="32" r="26" stroke="#FFFFFF" strokeWidth="5" fill="#3AA85E" />
          <circle cx="32" cy="32" r="23" fill="#2E8B4C" />
          <g transform="translate(32, 28) scale(0.85)">
            <circle cx="-7" cy="-7" r="7" fill="#8EE5A8" stroke="#165129" strokeWidth="1.2" />
            <circle cx="7" cy="-7" r="7" fill="#8EE5A8" stroke="#165129" strokeWidth="1.2" />
            <circle cx="-7" cy="7" r="7" fill="#8EE5A8" stroke="#165129" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="7" fill="#8EE5A8" stroke="#165129" strokeWidth="1.2" />
            <path d="M0 8 Q4 18 10 20" stroke="#165129" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="0" cy="0" r="2.5" fill="#FFDC73" />
          </g>
          <rect x="15" y="46" width="34" height="11" rx="3" fill="#165129" />
          <text x="32" y="54" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">행운가득</text>
        </svg>
      );


    default:
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" fill="#2B729E" stroke="#FFFFFF" strokeWidth="4" />
          <text x="32" y="36" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#FFFFFF">생존</text>
        </svg>
      );
  }
};
