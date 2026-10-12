import type { Metadata } from 'next';
export const metadata: Metadata = { title: '회사 생활 체크리스트', description: '주제별 회사 생활 체크리스트와 나의 실천 기록' };
export default function ChecklistLayout({ children }: { children: React.ReactNode }) { return children; }
