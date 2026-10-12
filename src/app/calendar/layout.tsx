import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '스티커 달력 | 취업규칙 학습',
  description: '2026 표준취업규칙을 상황별 스티커와 OX 퀴즈로 배우는 학습용 달력',
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
