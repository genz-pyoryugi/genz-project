// Keep stored question snapshots and legal sources intact; simplify reading text only.
export function quizReadingText(text: string): string {
  return text
    .replace(/PDF에 등장하는/g, '표준안에 등장하는')
    .replace(/PDF의\s*00:00/g, '예시의 00:00')
    .replace(/PDF(?:에서는|에서|에 따르면|의)\s*/g, '')
    .replace(/PDF\s+(?=제\d+조)/g, '')
    .trim();
}

// Rephrase only known originals, so a separately edited online question is preserved.
const everydayQuestions: Record<string, string> = {
  '제24조는 업무 사정으로 휴게시간을 달리 운영할 때 해당 사원에게 미리 공지하도록 한다.':
    '업무 사정으로 쉬는 시간이 바뀌면, 해당 직원에게 미리 알려야 한다.',
  '제32조는 1주 동안 소정근로일을 개근한 사원에게 유급주휴일을 부여하도록 한다.':
    '일주일 동안 정해진 근무일에 빠짐없이 출근하면 유급 주휴일을 받을 수 있다.',
  '제33조는 1년간 80% 이상 출근한 사원에게 15일의 유급휴가를 주도록 한다.':
    '1년간 출근율이 80% 이상인 직원에게는 15일의 연차유급휴가가 주어진다.',
  '제61조는 계속근로기간이 1년 미만인 사원을 퇴직급여 지급 대상에서 제외한다.':
    '계속 일한 기간이 1년 미만인 직원은 퇴직급여 지급 대상에서 제외된다.',
};

export function quizQuestionText(text: string): string {
  const cleaned = quizReadingText(text);
  return everydayQuestions[cleaned] ?? cleaned;
}
