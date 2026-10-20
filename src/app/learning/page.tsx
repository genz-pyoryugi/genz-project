'use client';
import Link from 'next/link';
import LearningRecords from '@/components/LearningRecords';
import { learnerToken } from '@/lib/learning-client';

export default function LearningPage() {
  return <main className="lr-page" lang="ko"><section className="lr-shell"><header className="lr-shell-head"><span className="lr-brand">GEN Z QUIZ</span><Link href="/quiz" className="lr-back">퀴즈로 돌아가기 →</Link></header><LearningRecords getToken={learnerToken}/></section></main>;
}
