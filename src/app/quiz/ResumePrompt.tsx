'use client';

export default function ResumePrompt({ compatible, onContinue, onRestart }: {
  compatible: boolean; onContinue: () => void; onRestart: () => void;
}) {
  return <div className="gq-state gq-resume" role="region" aria-labelledby="quiz-resume-heading">
    <h2 id="quiz-resume-heading">이전에 풀던 퀴즈가 있어요</h2>
    <p>{compatible ? '풀던 위치와 선택한 답, 제출한 답의 해설을 이어서 확인할 수 있어요.'
      : '문제 버전·구성 또는 저장 상태가 현재 퀴즈와 달라 그대로 이어갈 수 없어요. 기존 기록을 남기고 새로 시작해 주세요.'}</p>
    <div className="gq-resume-actions">
      {compatible && <button className="gq-primary" onClick={onContinue}>이어 풀기</button>}
      <button className="gq-primary gq-resume-new" onClick={onRestart}>처음부터 풀기</button>
    </div>
    <p>이어서 풀기는 같은 브라우저의 익명 식별 정보가 유지되는 동안 사용할 수 있어요.</p>
  </div>;
}
