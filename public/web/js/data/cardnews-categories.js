// Shared platform principles; display order is intentional.
const CARDNEWS_CATEGORIES = Object.freeze([
  { id: 'organization', name: '조직 이해·적응' },
  { id: 'procedures', name: '업무 절차 &기준' },
  { id: 'communication', name: '질문 &소통' },
  { id: 'collaboration', name: '협업& 동료 존중' },
  { id: 'etiquette', name: '직장 관계& 예절' },
  { id: 'work-rules', name: '근무& 재택 수칙' },
  { id: 'shared-resources', name: '공용 공간 &비품 관리' },
].map(category => Object.freeze(category)));
