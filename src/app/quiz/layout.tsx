import type { Metadata } from 'next';
export const metadata: Metadata = { title: '회사 생활, 나라면? | 상황 퀴즈', description: '실제 회사 생활 상황을 선택하고 해설로 배우는 주제별 퀴즈' };
export default function QuizLayout({ children }: { children: React.ReactNode }) { return children; }
