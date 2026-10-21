'use client';

import Image from 'next/image';
import type { Ref } from 'react';
import type { SaveStatus } from '@/lib/learning-client';

export function CompletionSaveStatus({ save, reviewing, recordsReady }: { save: SaveStatus | null; reviewing: boolean; recordsReady: boolean }) {
  if (save?.state === 'saved' && (!reviewing || recordsReady)) return null;
  return <p className="gq-note gq-result-save" role="status">{reviewing && !recordsReady
    ? '오답 복습 기록 저장은 Supabase 학습 기록 SQL 적용 후 제공됩니다.'
    : save?.state === 'unconfigured' ? 'Supabase 미연결: 결과는 이 기기에만 보관돼요.'
    : save?.state === 'error' ? `저장하지 못했어요. ${save.message}`
    : '결과를 저장하고 있어요.'}</p>;
}

export default function QuizCompletion({ score, total, wrongIds, reviewing, onRetry, headingRef, topicName = '' }: {
  score: number; total: number; wrongIds: string[]; reviewing: boolean;
  onRetry: (ids: string[]) => void; headingRef?: Ref<HTMLHeadingElement>; topicName?: string;
}) {
  return <div className="gq-result">
    <div className="gq-result-overview">
    <Image className="gq-result-mascot" src="/quiz/assets/pen-reading.png" width={1024} height={1536}
      sizes="(max-width: 600px) 85px, 140px" alt="책을 읽으며 미소 짓는 하늘색 펜 캐릭터"/>
    <div className="gq-result-content">
      <h2 ref={headingRef} tabIndex={-1}>{reviewing ? '한 걸음 더 배웠어요!' : '끝까지 풀었어요!'}</h2>
      <p className="gq-score" aria-label={`${total}문제 중 ${score}문제 정답`}><strong>{score}</strong><span> / {total}</span></p>
      <p className="gq-result-message">맞힌 내용과 다시 볼 내용을 정리했어요.</p>
    </div>
    </div>
      <div className="gq-result-actions">
        {wrongIds.length ? <button className="gq-primary" onClick={() => onRetry([...wrongIds])}>틀린 문제 다시 풀기 <span className="gq-retry-count">{wrongIds.length}</span></button>
          : <p className="gq-no-wrong" role="status"><span aria-hidden="true">✓</span> 틀린 문제가 없어요!</p>}
        <a className="gq-primary gq-sim-button" href="/web/sos.html?view=sim" onClick={event => {
          // the simulation opens on this quiz topic's card (public/web/js/simulation.js reads 'genz_sim_from_quiz')
          try { localStorage.setItem('genz_sim_from_quiz', JSON.stringify({ topic: topicName, at: Date.now() })); } catch {}
          if (window.parent !== window) { event.preventDefault(); window.parent.postMessage({ type: 'genz-quiz:simulation' }, location.origin); }
        }}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3z"/></svg><span>AI 팀장 시뮬레이션</span></a>
      </div>
  </div>;
}
