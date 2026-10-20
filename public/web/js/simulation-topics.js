// Display order only. Scenario text and assessment criteria always come from the published DB rows.
const CHAPTERS = ['조직 이해&적응', '업무 절차&기준', '질문&소통', '협업&동료 존중', '직장 내 관계&예절', '근무&재택 수칙', '공용 공간 & 비품 관리']
  .map((title, index) => ({ title, num: String(index + 1).padStart(2, '0') }));
