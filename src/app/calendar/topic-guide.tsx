import Image from 'next/image';
import type { Topic } from './data';
import './topic-guide.css';

// Headings organize the existing rules; the original text remains in data.ts.
const ruleHeadings: Record<string, string[]> = {
  arrival: ['근로시간의 기본 기준', '교대근로의 시간 구분', '별도로 확인할 근무 제도'],
  break: ['휴게시간의 부여와 이용', '휴게 시각의 운영과 변경', '적용 제외 대상 확인'],
  night: ['연장근로의 합의와 한도', '휴일근로와 가산 기준', '연령·임신 등에 따른 제한', '보상휴가의 도입 요건'],
  holiday: ['주휴일의 요일', '유급 공휴일과 대체공휴일', '공휴일 대체의 합의 요건'],
  leave: ['출근율에 따른 유급휴가', '장기근속자의 가산휴가', '휴가 사용 시기', '사용촉진과 연차 대체'],
  care: ['배우자 출산휴가', '난임치료휴가와 생리휴가', '가족돌봄휴가'],
  departure: ['퇴직 사유와 퇴직일', '사직원의 수리와 회사 규정', '정년의 설정 기준'],
  notice: ['해고의 정당한 이유', '해고예고와 예외', '해고가 제한되는 기간'],
  pension: ['퇴직급여 지급 대상', '퇴직급여제도의 운영', '중도인출의 제한', 'IRP 이전과 예외'],
};

export default function TopicGuide({ topic, chapter, image }: { topic: Topic; chapter: string; image: string }) {
  return <article className="situation-content" tabIndex={0} aria-labelledby="dialog-title">
    <span className="situation-badge">{chapter} · 상황별 안내</span>
    <header className="situation-heading">
      <h2 id="dialog-title">{topic.question}</h2>
      <Image src={image} alt="" width={200} height={165} unoptimized/>
    </header>
    {topic.core && <section className="situation-summary" aria-labelledby="situation-summary-title">
      <h3 id="situation-summary-title"><span aria-hidden="true">☀</span> 핵심 요약</h3>
      <p>{topic.core}</p>
    </section>}
    {topic.rules.length > 0 && <section className="situation-details" aria-labelledby="situation-details-title">
      <h3 id="situation-details-title">자세히 살펴보기</h3>
      <ol>{topic.rules.map((rule, index) => <li key={rule}>
        <span className="situation-number" aria-hidden="true">{index + 1}</span>
        <div>{ruleHeadings[topic.art]?.[index] && <h4>{ruleHeadings[topic.art][index]}</h4>}<p>{rule}</p></div>
      </li>)}</ol>
    </section>}
    {topic.company && <section className="situation-company" aria-labelledby="situation-company-title">
      <span className="situation-info-icon" aria-hidden="true">i</span>
      <div><h3 id="situation-company-title">회사마다 확인할 사항</h3><p>{topic.company}</p></div>
    </section>}
    {(topic.source || topic.page) && <details className="situation-source">
      <summary><svg viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 1h12l7 7v18H3ZM15 1v8h7M7 14h10M7 18h10M7 22h7"/></svg><span>관련 조항·출처 보기</span><svg className="situation-source-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 7 7 7 7-7"/></svg></summary>
      <div>{topic.source && <p className="situation-source-citation">근거: {topic.source}</p>}{topic.page && <p>PDF 파일 {topic.page}쪽부터 <a href={`/calendar/source.pdf#page=${topic.page}`} target="_blank" rel="noreferrer">원문 확인 ↗</a></p>}
        <p className="situation-scope">주40시간 제조업을 가정한 일반 근로자용 표준안 요약입니다. [필수]·[선택]은 취업규칙의 기재 구분이며 법적 의무와는 다를 수 있습니다. 단시간근로자 등은 해당 원문을 확인하세요.</p>
      </div>
    </details>}
  </article>;
}
