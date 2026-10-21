// GenZ Office Guide (젠지 표류기) Community Types

export type ChapterId = '01' | '02' | '03' | '04' | '05' | '06' | '07';

export interface ChapterInfo {
  id: ChapterId;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  recommendedKeywords: string[];
}

export type PostItColor = 'yellow' | 'blue' | 'mint' | 'peach' | 'ivory';

export type FastenerType = 'tape-clear' | 'tape-craft' | 'tape-blue' | 'clip-silver' | 'none';

export type OfficeStickerCategory = 'all' | 'character' | 'memo' | 'deco';

export interface OfficeStickerDef {
  id: string;
  name: string;
  tag: string;
  category: OfficeStickerCategory;
  iconType: string;
  badgeBg: string;
  badgeText: string;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  rotation: number; // -20 to 20 deg
  scale: number;
  author: string;
  authorRole: '신입' | '선배' | '동기' | '사수' | '1년차' | '팀장';
  placedAt: string;
}

export interface TapeComment {
  id: string;
  author: string;
  authorRole: '신입' | '선배' | '동기' | '사수' | '1년차' | '팀장';
  content: string;
  tapeStyle: 'scotch' | 'craft' | 'blue' | 'yellow' | 'gray';
  targetSentence?: string;
  createdAt: string;
  likes: number;
  // 신고 (src/lib/community/report.ts)
  reportCount?: number;
  reportedByMe?: boolean;
  reportReasons?: string[];
}

export interface PostItPost {
  id: string;
  chapterId: ChapterId;
  title: string;
  content: string;
  categoryTag: string; // e.g., '첫인사', '호칭고민', '메일실수', '지각연락'
  author: {
    nickname: string;
    role: '신입' | '인턴' | '1년차' | '취준생';
    companyType?: string; // e.g., 'IT스타트업', '대기업', '중견기업', '공공기관'
  };
  createdAt: string;
  color: PostItColor;
  fastener: FastenerType;
  rotation: number;
  highlightedText?: string;
  isMine?: boolean; // 이 브라우저에서 내가 쓴 포스트잇 (내 보관함 · 삭제 · '내 글' 배지, 로그인 기능 전까지의 표시)
  // 신고 (src/lib/community/report.ts)
  reportCount?: number;
  reportedByMe?: boolean;
  reportReasons?: string[];
  stickers: PlacedSticker[];
  comments: TapeComment[];
}
