import React from 'react';

interface OfficeStickerSvgProps {
  type: string;
  size?: number | string;
  className?: string;
}

export const OfficeStickerSvg: React.FC<OfficeStickerSvgProps> = ({
  type,
  size = 42,
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  switch (type) {
    // 1. 칼퇴기원 (두손 모아 기도하는 손모양 🙏)
    case 'run-home':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White die-cut outline border */}
          <path
            d="M32 6 C24 14 17 22 17 38 C17 50 23 57 32 58 C41 57 47 50 47 38 C47 22 40 14 32 6 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Golden glow circle behind */}
          <circle cx="32" cy="34" r="22" fill="#FEF3C7" opacity="0.65" />
          <path d="M32 8 V14 M16 22 L21 25 M48 22 L43 25" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          {/* Left sleeve (Pastel sky blue) */}
          <path d="M19 54 L25 42 L31 43 L29 55 Z" fill="#60A5FA" stroke="#1E40AF" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="23" y="41" width="8" height="3" rx="1.5" fill="#FFFFFF" />
          {/* Right sleeve (Pastel lavender) */}
          <path d="M45 54 L39 42 L33 43 L35 55 Z" fill="#818CF8" stroke="#3730A3" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="33" y="41" width="8" height="3" rx="1.5" fill="#FFFFFF" />
          {/* Left Hand & fingers pressed together */}
          <path
            d="M31.5 12 C30.5 12 28.5 16 28 20 C27.5 24 26 27 25 32 C24.5 35 25 41 29 42 C31 42 31.8 38 31.8 33 Z"
            fill="#FFE0B2"
            stroke="#EA580C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Right Hand & fingers pressed together */}
          <path
            d="M32.5 12 C33.5 12 35.5 16 36 20 C36.5 24 38 27 39 32 C39.5 35 39 41 35 42 C33 42 32.2 38 32.2 33 Z"
            fill="#FFCC80"
            stroke="#EA580C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Prayer seam center line */}
          <line x1="32" y1="12" x2="32" y2="42" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" />
          {/* Finger folds/details */}
          <path d="M29.5 17 Q31 18 31.8 19" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M34.5 17 Q33 18 32.2 19" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M28.5 23 Q30.5 24 31.8 25" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M35.5 23 Q33.5 24 32.2 25" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
          {/* Left thumb */}
          <path d="M27 33 C25.5 32 23.5 34 25.5 37 C27 39 28.5 39 29.5 38" fill="#FFE0B2" stroke="#EA580C" strokeWidth="1.3" />
          {/* Right thumb */}
          <path d="M37 33 C38.5 32 40.5 34 38.5 37 C37 39 35.5 39 34.5 38" fill="#FFCC80" stroke="#EA580C" strokeWidth="1.3" />
          {/* Sparkles of sincere prayer */}
          <polygon points="32,2 33,5 36,6 33,7 32,10 31,7 28,6 31,5" fill="#F59E0B" />
          <polygon points="17,32 17.7,34 20,34.5 17.7,35 17,37 16.3,35 14,34.5 16.3,34" fill="#FBBF24" />
          <polygon points="47,32 47.7,34 50,34.5 47.7,35 47,37 46.3,35 44,34.5 46.3,34" fill="#FBBF24" />
        </svg>
      );

    // 2. 커피수혈 (Ice Americano 뚱캔/테이크아웃컵)
    case 'coffee-drip':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* Outer white die-cut sticker silhouette */}
          <rect x="14" y="10" width="36" height="50" rx="10" fill="#FFFFFF" />
          <path d="M40 4 L33 18" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
          {/* Green / Mint straw */}
          <path d="M40 4 L33 18" stroke="#55D8C1" strokeWidth="4" strokeLinecap="round" />
          {/* Cup body (Warm cream) */}
          <rect x="17" y="13" width="30" height="44" rx="8" fill="#FFFBEB" stroke="#E2D9C8" strokeWidth="1.2" />
          {/* Coffee liquid level */}
          <path d="M17 24 Q32 26 47 24 V49 C47 54 43 57 39 57 H25 C21 57 17 54 17 49 Z" fill="#6F4E37" />
          {/* Ice cubes floating */}
          <rect x="22" y="28" width="8" height="8" rx="2" fill="#FFFFFF" fillOpacity="0.5" transform="rotate(8 22 28)" />
          <rect x="34" y="32" width="8" height="8" rx="2" fill="#FFFFFF" fillOpacity="0.5" transform="rotate(-12 34 32)" />
          {/* Cute face on the cup */}
          <circle cx="27" cy="44" r="1.8" fill="#FFFFFF" />
          <circle cx="37" cy="44" r="1.8" fill="#FFFFFF" />
          <path d="M30 47 Q32 49 34 47" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <ellipse cx="23" cy="45" rx="2" ry="1.2" fill="#FFAAA6" opacity="0.8" />
          <ellipse cx="41" cy="45" rx="2" ry="1.2" fill="#FFAAA6" opacity="0.8" />
          {/* Floating mini heart */}
          <path d="M44 14 C44 12 46 11 47.5 12 C49 11 51 12 51 14 C51 17 47.5 19 47.5 19 C47.5 19 44 17 44 14 Z" fill="#FF6B6B" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      );

    // 3. 멘붕/SOS (Melting Chick / 삐약이 멘붕)
    case 'melting-mind':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <ellipse cx="32" cy="33" rx="25" ry="24" fill="#FFFFFF" />
          {/* Yellow Chick Head / Melting bottom puddle */}
          <path
            d="M12 33 C12 17 21 12 32 12 C43 12 52 17 52 33 C52 46 48 51 44 52 C39 53 37 48 34 52 C31 55 27 50 24 53 C19 55 16 51 14 47 C12 43 12 38 12 33 Z"
            fill="#FFE162"
          />
          {/* Dizzy spiral / X eyes */}
          <path d="M21 28 L27 34 M27 28 L21 34" stroke="#372912" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M37 28 L43 34 M43 28 L37 34" stroke="#372912" strokeWidth="2.6" strokeLinecap="round" />
          {/* Cute beak open in shock */}
          <ellipse cx="32" cy="36" rx="4.5" ry="3.2" fill="#FF9234" />
          <ellipse cx="32" cy="37" rx="2.5" ry="1.5" fill="#913B00" />
          {/* Sweat drop splashing */}
          <path d="M48 20 C48 20 54 25 54 28 C54 30 52 32 49 32 C47 32 45 30 45 28 C45 25 48 20 48 20 Z" fill="#4D96FF" stroke="#FFFFFF" strokeWidth="1" />
          {/* Distress dizzy swirl above */}
          <path d="M28 10 Q32 6 36 10 Q40 14 43 10" stroke="#FF577F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 4. 질문있습니다 (곰돌이 얼굴 정면, 그 옆에 물음표 1개 깔끔히 크게 🐻❓)
    case 'question-hand':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut outline */}
          <path
            d="M8 32 C8 16 19 12 28 12 C34 12 40 15 42 19 C48 10 59 12 60 22 C61 32 54 39 48 40 C46 51 38 56 26 56 C14 56 8 48 8 32 Z"
            fill="#FFFFFF"
          />
          {/* Bear round ears */}
          <circle cx="16" cy="22" r="7.5" fill="#B07D48" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="16" cy="22" r="4.2" fill="#FCEAD4" />
          <circle cx="36" cy="22" r="7.5" fill="#B07D48" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="36" cy="22" r="4.2" fill="#FCEAD4" />
          {/* Bear Front Head (정면 곰돌이) */}
          <circle cx="26" cy="35" r="17" fill="#B07D48" />
          {/* Muzzle (주둥이) */}
          <ellipse cx="26" cy="39" rx="7" ry="5.5" fill="#FCEAD4" />
          <ellipse cx="26" cy="37" rx="2.5" ry="1.8" fill="#42250F" />
          <path d="M26 38.8 V41.2" stroke="#42250F" strokeWidth="1.4" strokeLinecap="round" />
          {/* Shiny black eyes */}
          <circle cx="20.5" cy="33.5" r="2.2" fill="#2C1810" />
          <circle cx="19.7" cy="32.7" r="0.8" fill="#FFFFFF" />
          <circle cx="31.5" cy="33.5" r="2.2" fill="#2C1810" />
          <circle cx="30.7" cy="32.7" r="0.8" fill="#FFFFFF" />
          {/* Rosy cheeks */}
          <ellipse cx="16.5" cy="38" rx="2.8" ry="1.8" fill="#FF8FAB" opacity="0.85" />
          <ellipse cx="35.5" cy="38" rx="2.8" ry="1.8" fill="#FF8FAB" opacity="0.85" />
          {/* Big clean question mark right next to the bear (옆에 물음표 1개 깔끔히 크게) */}
          <g transform="translate(43, 14)">
            {/* Outline backing for readability */}
            <path
              d="M3 6.5 C3 2.5 6.5 0 10.5 0 C14.5 0 17.5 2.8 17.5 6.8 C17.5 10 15 12.2 12.5 14 C11 15 10.5 16.5 10.5 18.5 V19.5"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10.5" cy="25" r="4" fill="#FFFFFF" />
            {/* Crisp question mark stroke in vibrant blue */}
            <path
              d="M3 6.5 C3 2.5 6.5 0 10.5 0 C14.5 0 17.5 2.8 17.5 6.8 C17.5 10 15 12.2 12.5 14 C11 15 10.5 16.5 10.5 18.5 V19.5"
              stroke="#2563EB"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10.5" cy="25" r="2.2" fill="#2563EB" />
          </g>
        </svg>
      );

    // 5. 동아일보 팩트 (도장 / Stamp 💮)
    case 'donga-fact':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border die-cut */}
          <rect x="6" y="6" width="52" height="52" rx="14" fill="#FFFFFF" />
          {/* Stamp Outer Border (Square-round red stamp seal) */}
          <rect
            x="9"
            y="9"
            width="46"
            height="46"
            rx="11"
            fill="#FFF1F2"
            stroke="#DC2626"
            strokeWidth="3.2"
          />
          {/* Inner double border */}
          <rect
            x="14"
            y="14"
            width="36"
            height="36"
            rx="7"
            stroke="#DC2626"
            strokeWidth="1.4"
            strokeDasharray="4 2"
            fill="none"
          />
          {/* Central Verified Seal Motif: Korean traditional stamp style star & checkmark */}
          <circle cx="32" cy="32" r="13" fill="#DC2626" />
          <circle cx="32" cy="32" r="10.5" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
          {/* Official checkmark / seal emblem inside stamp */}
          <path
            d="M26 32 L30.5 36.5 L38 27.5"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Little decorative stamp stars at corners */}
          <polygon points="19,19 20,21 22,21.3 20.5,22.7 21,25 19,23.8 17,25 17.5,22.7 16,21.3 18,21" fill="#DC2626" />
          <polygon points="45,19 46,21 48,21.3 46.5,22.7 47,25 45,23.8 43,25 43.5,22.7 42,21.3 44,21" fill="#DC2626" />
          <polygon points="19,45 20,43 22,42.7 20.5,41.3 21,39 19,40.2 17,39 17.5,41.3 16,42.7 18,43" fill="#DC2626" />
          <polygon points="45,45 46,43 48,42.7 46.5,41.3 47,39 45,40.2 43,39 43.5,41.3 42,42.7 44,43" fill="#DC2626" />
        </svg>
      );

    // 6. 공감 100% (구멍 안 뚫린 통통한 빨강하트 ❤️)
    case 'empathy-100':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* Outer white die-cut sticker edge */}
          <path
            d="M32 59 C13 46 7 33 7 21 C7 11 15 5 24 5 C29.5 5 31.5 8 32 10.5 C32.5 8 34.5 5 40 5 C49 5 57 11 57 21 C57 33 51 46 32 59 Z"
            fill="#FFFFFF"
          />
          {/* Plump Solid Red Heart (구멍 안 뚫린 꽉 찬 통통한 빨강하트) */}
          <path
            d="M32 55 C16 43 10 31 10 20.5 C10 12 16.5 8 24 8 C29 8 31 11 32 13.5 C33 11 35 8 40 8 C47.5 8 54 12 54 20.5 C54 31 48 43 32 55 Z"
            fill="#EF4444"
          />
          {/* Subtle glossy sheen arc on top-left for 3D plumpness (no hole, solid heart) */}
          <path
            d="M18 14 C14 17 13 21 13 25"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <circle cx="16" cy="14" r="1.5" fill="#FFFFFF" opacity="0.7" />
        </svg>
      );

    // 7. 이건 메모각 (Cute Pushpin Memo Note 📌)
    case 'memo-pin':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <rect x="11" y="9" width="42" height="48" rx="8" fill="#FFFFFF" />
          {/* Pastel yellow memo card */}
          <rect x="14" y="12" width="36" height="42" rx="6" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.5" />
          {/* Note lines */}
          <line x1="20" y1="26" x2="44" y2="26" stroke="#E2D9C8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="33" x2="44" y2="33" stroke="#E2D9C8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="40" x2="36" y2="40" stroke="#E2D9C8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="42" r="3" fill="#F97316" />
          {/* Cute red round pushpin at the top */}
          <circle cx="32" cy="14" r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.8" />
          <ellipse cx="30" cy="12" rx="1.8" ry="1.2" fill="#FFFFFF" />
        </svg>
      );

    // 8. 선배의 꿀팁 (Bright Lightbulb Chick / 반짝 전구 💡)
    case 'senior-tip':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White die-cut border */}
          <ellipse cx="32" cy="30" rx="22" ry="22" fill="#FFFFFF" />
          <rect x="23" y="38" width="18" height="18" rx="6" fill="#FFFFFF" />
          {/* Golden bright bulb */}
          <circle cx="32" cy="27" r="17" fill="#FCD34D" />
          {/* Sparkles around bulb */}
          <path d="M11 27 H6 M58 27 H53 M32 6 V1 M17 12 L12 7 M47 12 L52 7" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
          {/* Cute face in lightbulb */}
          <circle cx="27" cy="26" r="2.2" fill="#78350F" />
          <circle cx="37" cy="26" r="2.2" fill="#78350F" />
          <path d="M30 30 Q32 33 34 30" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <ellipse cx="23" cy="28" rx="2" ry="1.2" fill="#FF8FAB" />
          <ellipse cx="41" cy="28" rx="2" ry="1.2" fill="#FF8FAB" />
          {/* Screw cap */}
          <rect x="26" y="42" width="12" height="6" rx="2" fill="#94A3B8" />
          <line x1="28" y1="45" x2="36" y2="45" stroke="#64748B" strokeWidth="1.5" />
        </svg>
      );

    // 9. 고생했어요 토닥토닥 (첨부 이미지 캐릭터 그대로: 포근한 아기 동물 머리를 다정하게 쓰다듬어주는 토닥토닥 스티커 ✨)
    case 'pat-pat':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White die-cut outline border wrapping character & hand */}
          <path
            d="M32 6 C24 6 18 10 14 16 C10 22 8 30 8 38 C8 48 16 58 32 58 C46 58 56 50 56 38 C56 26 50 14 42 8 C38 6 35 6 32 6 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Subtle soft warmth glow behind character */}
          <ellipse cx="32" cy="38" rx="22" ry="18" fill="#FFF7ED" opacity="0.6" />

          {/* Adorable round chubby character body & head (Pure soft cream white) */}
          <g id="soothed-character">
            {/* Soft shadow under body */}
            <ellipse cx="32" cy="51" rx="18" ry="5" fill="#E2E8F0" opacity="0.5" />

            {/* Little rounded ears */}
            <circle cx="18" cy="25" r="4.5" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="18" cy="25" r="2.8" fill="#FFC7D0" />
            <circle cx="46" cy="25" r="4.5" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="46" cy="25" r="2.8" fill="#FFC7D0" />

            {/* Plump head & body - slightly squished at top by gentle pat */}
            <path
              d="M17 38 C17 26 23 23 32 24 C41 23 47 26 47 38 C47 48 41 52 32 52 C23 52 17 48 17 38 Z"
              fill="#FFFFFF"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Blissfully closed comforting eyes (토닥토닥 위로받는 편안한 눈 ⌒ ⌒) */}
            <path d="M23 35 Q26 31.5 29 35" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M35 35 Q38 31.5 41 35" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Rosy blushing cheeks (포근한 핑크 볼터치) */}
            <ellipse cx="21" cy="39" rx="3.5" ry="2.2" fill="#FFA5B5" opacity="0.85" />
            <ellipse cx="43" cy="39" rx="3.5" ry="2.2" fill="#FFA5B5" opacity="0.85" />

            {/* Tiny cute nose & warm soft smile */}
            <circle cx="32" cy="37" r="1.2" fill="#E26D5C" />
            <path d="M30 40 Q32 42 34 40" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" fill="none" />

            {/* Cute front paws snuggled comfortably */}
            <ellipse cx="26" cy="49" rx="3.2" ry="2.2" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" />
            <ellipse cx="38" cy="49" rx="3.2" ry="2.2" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.2" />
          </g>

          {/* Loving Hand gently patting & caressing the head (쓰담쓰담 따뜻한 손길) */}
          <g id="patting-hand">
            {/* Soft sleeve cuff (Pastel mint / cozy knit) */}
            <path
              d="M57 9 L51 14 L46 8 L52 3 Z"
              fill="#A7F3D0"
              stroke="#059669"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            {/* Hand wrist and palm entering from upper right */}
            <path
              d="M52 13 C47 16 43 19 39 21 C35 23 31 22 28 22 C26 22 25 24 27 25 C30 27 34 27 38 25 C42 23 46 20 50 17 Z"
              fill="#FEE5D4"
              stroke="#D97706"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Tender fingers lovingly resting on the crown of the head */}
            <ellipse cx="28" cy="22.5" rx="3.2" ry="2.2" fill="#FEE5D4" stroke="#D97706" strokeWidth="1.3" />
            <ellipse cx="33" cy="22.2" rx="3.2" ry="2.2" fill="#FEE5D4" stroke="#D97706" strokeWidth="1.3" />
            <ellipse cx="38" cy="23" rx="3.2" ry="2.2" fill="#FEE5D4" stroke="#D97706" strokeWidth="1.3" />

            {/* Soothing patting motion rhythms (토닥토닥 부드러운 박자감) */}
            <path d="M25 16 Q28 13.5 32 15" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M34 12 Q37 10 41 11.5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>

          {/* Warm soothing floating mini heart */}
          <path
            d="M17 15 C17 13.2 18.5 12 20.2 12.8 C21.8 12 23.4 13.2 23.4 15 C23.4 18 20.2 20.2 20.2 20.2 C20.2 20.2 17 18 17 15 Z"
            fill="#FB7185"
            stroke="#FFFFFF"
            strokeWidth="0.8"
          />
        </svg>
      );

    // 10. 잘하고있어! (엄지 손가락 따봉 하나만 👍)
    case 'doing-great':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White die-cut outline border */}
          <path
            d="M32 6 C28 6 24 10 24 16 L24 23 L18 23 C12 23 9 27 9 32 L9 44 C9 50 14 54 21 54 L44 54 C50 54 54 50 54 44 L54 36 C54 31 51 28 47 28 L37 28 L37 16 C37 10 35 6 32 6 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Soft yellow circle glow */}
          <circle cx="32" cy="33" r="23" fill="#FEF9C3" opacity="0.6" />
          {/* Big Single Thumbs-Up Hand (따봉 하나만!) */}
          <g transform="translate(6, 6)">
            {/* Wrist / Cuff */}
            <path d="M7 38 L16 38 L16 46 L7 46 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1.8" strokeLinejoin="round" />
            <rect x="14" y="37" width="3" height="10" rx="1" fill="#FFFFFF" />
            {/* Palm & Fist base */}
            <path
              d="M16 26 C16 23 19 21 23 21 L28 21 C33 21 34 25 34 29 L34 43 C34 45 31 46 27 46 L16 46 Z"
              fill="#FDBA74"
              stroke="#C2410C"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* The Big Proud Thumb standing tall (위로 우뚝 솟은 엄지손가락) */}
            <path
              d="M20 22 L20 8 C20 4.5 23 2 26 2 C28.5 2 30.5 4.5 30.5 8 L30.5 23 Z"
              fill="#FDBA74"
              stroke="#C2410C"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Thumb knuckle line */}
            <path d="M23 9 Q26 10 28 9" stroke="#EA580C" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M22 15 Q26 16 28.5 15" stroke="#EA580C" strokeWidth="1.4" strokeLinecap="round" />
            {/* Folded fingers (손가락 4개 주먹 쥔 층층이) */}
            <path d="M30 26 H37 C39.5 26 41 27.5 41 29.5 C41 31.5 39.5 33 37 33 H30" fill="#FED7AA" stroke="#C2410C" strokeWidth="1.8" />
            <path d="M30 32 H38 C40.5 32 42 33.5 42 35.5 C42 37.5 40.5 39 38 39 H30" fill="#FED7AA" stroke="#C2410C" strokeWidth="1.8" />
            <path d="M30 38 H37 C39.5 38 41 39.5 41 41.5 C41 43.5 39.5 45 37 45 H28" fill="#FED7AA" stroke="#C2410C" strokeWidth="1.8" />
            {/* Thumbs up shiny sparkles */}
            <polygon points="12,6 13,8 15,8.5 13,9.5 12,12 11,9.5 9,8.5 11,8" fill="#F59E0B" />
            <polygon points="38,6 39,8 41,8.5 39,9.5 38,12 37,9.5 35,8.5 37,8" fill="#F59E0B" />
            <polygon points="45,18 45.7,19.5 47.5,20 45.7,20.5 45,22 44.3,20.5 42.5,20 44.3,19.5" fill="#FBBF24" />
          </g>
        </svg>
      );

    // 11. 할 수 있어! (캐릭터 없이 오직 귀엽고 뽕긋한 알통만 단독 표현 💪✨)
    case 'you-can-do-it':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White die-cut outline border around standalone bicep */}
          <path
            d="M 12 43 C 12 30, 16 20, 22 19 C 28 18, 32 23, 34 32 C 35 28, 36 24, 36 21 C 34 19, 34 16, 36 14 C 38 10, 44 9, 47 12 C 50 15, 49 19, 47 21 C 48 25, 49 32, 50 38 C 51 43, 49 47, 44 47 C 34 47, 20 46, 12 43 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Standalone Bicep Arm Main Body (따뜻하고 귀여운 살구빛 톤) */}
          <path
            d="M 12 43 C 12 30, 16 20, 22 19 C 28 18, 32 23, 34 32 C 35 28, 36 24, 36 21 C 34 19, 34 16, 36 14 C 38 10, 44 9, 47 12 C 50 15, 49 19, 47 21 C 48 25, 49 32, 50 38 C 51 43, 49 47, 44 47 C 34 47, 20 46, 12 43 Z"
            fill="#FFE6D0"
            stroke="#334155"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Plump 뽕긋한 알통 굴곡 강조 음영 & 하이라이트 볼륨 */}
          <path
            d="M 15 39 C 14 31, 17 22, 22 21 C 27 20, 31 25, 33 33"
            stroke="#FDBA74"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* 알통 정점(Peak)의 발그레한 핑크빛 볼륨 하이라이트 */}
          <ellipse cx="23" cy="26" rx="5" ry="3" fill="#FB7185" opacity="0.35" />

          {/* 알통 근육 볼륨 라인 (뽕긋하게 솟은 근육 디테일) */}
          <path
            d="M 27 25 C 29 27, 31 30, 32 34"
            stroke="#E07A5F"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cute Sporty Wristband (귀여운 빨간 손목 밴드) */}
          <rect
            x="38"
            y="23"
            width="10.5"
            height="5"
            rx="2.2"
            transform="rotate(18 38 23)"
            fill="#EF4444"
            stroke="#334155"
            strokeWidth="1.8"
          />
          {/* 손목 밴드 포인트 스트라이프 */}
          <line
            x1="43"
            y1="24.5"
            x2="46"
            y2="30.5"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Clenched cute power fist detail (야무지게 쥔 주먹 손가락 라인) */}
          {/* 엄지손가락 굴곡 */}
          <path
            d="M 39 19 C 40 17, 43 17, 44 19"
            stroke="#334155"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          {/* 손가락 주름 */}
          <path
            d="M 42 14 C 43 12, 45 12, 46 14"
            stroke="#334155"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* 팔오금(안쪽 접히는 선) 디테일 */}
          <path
            d="M 33 34 C 34 37, 36 39, 39 41"
            stroke="#E07A5F"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />

          {/* 뽕긋 알통 파워 강조 에너지 라인 & 스파클 (Power Sparkles ✨) */}
          {/* 상단 파워 라인 3개 */}
          <line x1="22" y1="14" x2="22" y2="10" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="15" y1="16" x2="11" y2="13" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="29" y1="16" x2="33" y2="13" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />

          {/* 알통 옆 황금빛 반짝이 ✦ */}
          <polygon
            points="11,26 12.2,28.5 15,29 12.5,30.5 13,33 11,31.5 9,33 9.5,30.5 7,29 9.8,28.5"
            fill="#F59E0B"
          />
        </svg>
      );

    // 12. 궁금해요 (Magnifying Detective Hamster / 돋보기 햄스터 🐹🔍)
    case 'curious':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <circle cx="32" cy="32" r="26" fill="#FFFFFF" />
          {/* Pastel Lilac background */}
          <circle cx="32" cy="32" r="23" fill="#D8B4F8" />
          {/* Cute Magnifying glass */}
          <circle cx="28" cy="27" r="14" fill="#E8F4FA" stroke="#6C5CE7" strokeWidth="3.5" />
          <path d="M38 37 L48 47" stroke="#6C5CE7" strokeWidth="5" strokeLinecap="round" />
          {/* Sparkly giant curious eye inside lens */}
          <circle cx="28" cy="27" r="7" fill="#2D3436" />
          <circle cx="25.5" cy="24.5" r="2.5" fill="#FFFFFF" />
          <circle cx="30.5" cy="29.5" r="1.3" fill="#FFFFFF" />
          {/* Question mark popping */}
          <path d="M44 14 C44 12 45.5 11 47 11 C48.5 11 49.8 12 49.8 13.5 C49.8 15 48.5 15.8 47 17 V18" stroke="#FF7675" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="47" cy="20.5" r="1.1" fill="#FF7675" />
        </svg>
      );

    // 13. 응원합니다 (Pink Megaphone & Love Hearts 📣💖)
    case 'cheer-up':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <circle cx="32" cy="32" r="26" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="23" fill="#FF8E8F" />
          {/* Cute Megaphone */}
          <path d="M19 28 L35 20 V44 L19 36 Z" fill="#FFFFFF" stroke="#D80032" strokeWidth="2" />
          <ellipse cx="35" cy="32" rx="4.5" ry="12" fill="#FFEAA7" stroke="#D80032" strokeWidth="2" />
          <rect x="13" y="30" width="7" height="6" rx="2" fill="#FFFFFF" stroke="#D80032" strokeWidth="1.5" />
          {/* Floating Hearts & Sparkle popping */}
          <path d="M41 22 C41 20.5 42.5 19.5 44 20.5 C45.5 19.5 47 20.5 47 22 C47 24.5 44 26.5 44 26.5 C44 26.5 41 24.5 41 22 Z" fill="#FFFFFF" />
          <polygon points="46,36 47.2,38.5 49.7,39 47.7,40.5 48.2,43 46,41.5 43.8,43 44.3,40.5 42.3,39 44.8,38.5" fill="#FFD93D" stroke="#FFFFFF" strokeWidth="0.8" />
        </svg>
      );

    // 14. 비타민C(기운내요) (Juicy Lemon Slice 🍋⚡)
    case 'vitamin-c':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <circle cx="32" cy="32" r="26" fill="#FFFFFF" />
          {/* Sunshine circle */}
          <circle cx="32" cy="32" r="23" fill="#FFA500" />
          {/* Lemon semi-circle */}
          <path d="M14 32 A18 18 0 0 0 50 32 Z" fill="#FDFFB6" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="3.5" fill="#FFD166" />
          {/* Lemon wedges */}
          <path d="M32 32 L21 25 M32 32 L25 17 M32 32 L39 17 M32 32 L43 25" stroke="#FFA500" strokeWidth="1.8" strokeLinecap="round" />
          {/* Cheerful face */}
          <circle cx="28" cy="27" r="1.8" fill="#6B3A00" />
          <circle cx="36" cy="27" r="1.8" fill="#6B3A00" />
          {/* Sparkles */}
          <polygon points="42,12 39,18 42,18 40,24 45,17 42,17" fill="#FFD93D" stroke="#FFFFFF" strokeWidth="0.8" />
        </svg>
      );

    // 15. 반짝별(성장) (Chubby Star with blush ⭐✨)
    case 'sparkle-star':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* Outer white die-cut star */}
          <path
            d="M32 7 L38 21 L52 22 L41 31 L44 45 L32 37 L20 45 L23 31 L12 22 L26 21 Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Pastel Yellow Star body */}
          <path
            d="M32 8 L37.5 21 L51 22 L40.5 30.5 L43.5 44 L32 36.5 L20.5 44 L23.5 30.5 L13 22 L26.5 21 Z"
            fill="#FFE162"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Cute Face */}
          <circle cx="27" cy="27" r="2.2" fill="#583101" />
          <circle cx="37" cy="27" r="2.2" fill="#583101" />
          <path d="M30 31 Q32 33 34 31" stroke="#583101" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <ellipse cx="23" cy="30" rx="2.5" ry="1.5" fill="#FF8FAB" />
          <ellipse cx="41" cy="30" rx="2.5" ry="1.5" fill="#FF8FAB" />
          {/* Sparkles */}
          <polygon points="46,14 47.2,16.5 49.7,17 47.7,18.5 48.2,21 46,19.5 43.8,21 44.3,18.5 42.3,17 44.8,16.5" fill="#FFFFFF" />
        </svg>
      );

    // 16. 행운가득 (Lucky Four-Leaf Clover 🍀💚)
    case 'heart-clover':
      return (
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 64 64"
          fill="none"
          className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 ${className}`}
        >
          {/* White border cut */}
          <circle cx="32" cy="32" r="26" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="23" fill="#B4F8C8" />
          {/* 4 heart-shaped clover leaves */}
          <g transform="translate(32, 29) scale(1.05)">
            <circle cx="-6.5" cy="-6.5" r="7.2" fill="#4E9F3D" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="6.5" cy="-6.5" r="7.2" fill="#4E9F3D" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="-6.5" cy="6.5" r="7.2" fill="#4E9F3D" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="6.5" cy="6.5" r="7.2" fill="#4E9F3D" stroke="#FFFFFF" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="3.5" fill="#D8E9A8" />
            {/* Stem */}
            <path d="M0 7 Q3 17 9 20" stroke="#1E5128" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
          {/* Cute Face on center */}
          <circle cx="30" cy="28" r="1.5" fill="#1E5128" />
          <circle cx="34" cy="28" r="1.5" fill="#1E5128" />
          {/* Mini Sparkles */}
          <polygon points="45,15 46,17 48,17.5 46.5,19 47,21 45,19.8 43,21 43.5,19 42,17.5 44,17" fill="#FFFFFF" />
        </svg>
      );

    default:
      return (
        <svg width={pixelSize} height={pixelSize} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" fill="#2B729E" stroke="#FFFFFF" strokeWidth="4" />
        </svg>
      );
  }
};
