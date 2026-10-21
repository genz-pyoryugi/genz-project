// AI 팀장 시뮬레이션 시나리오 (7개 카테고리 × 3개 = 21개). 서버 전용 — facts · rubric 은 브라우저로 보내지 않는다.
// 브라우저에는 publicScenario() 로 공개 정보(제목 · 상황 · 추천 팀장 · 연결된 퀴즈 개념)만 보낸다.
//  context        : 사용자에게 공개되는 상황
//  facts          : AI 팀장만 아는 고정 사실. 팀장 성격과 관계없이 절대 바뀌지 않고, 사용자가 물어본 것만 답한다
//  openingMessage : 팀장의 첫 대사 (성격에 맞게 말투만 바뀜)
//  possibleTwists : 대화 중 자연스럽게 하나 덧붙일 수 있는 추가 조건
//  learningPoints · idealBehaviors · avoidBehaviors · evaluationRubric : 평가 기준
//  quizConcepts   : 이 상황과 연결된 퀴즈 개념(01 주제 문제의 concept 키 — src/app/quiz/page.tsx CONCEPT_BY_KEY) — 그 개념을 틀렸으면 '추천' 표시
import type { PersonalityKey } from './personalities';

export const CATEGORIES = ['조직 이해·적응', '업무 절차&기준', '질문&소통', '협업&동료 존중', '직장 관계&예절', '근무&재택 수칙', '공용 공간&비품 관리'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Scenario = {
  id: string;
  category: Category;
  title: string;
  description: string;
  difficulty: '쉬움' | '보통' | '어려움';
  recommendedPersonality: PersonalityKey;
  context: string;
  facts: Record<string, string>;
  openingMessage: string;
  possibleTwists: string[];
  learningPoints: string[];
  idealBehaviors: string[];
  avoidBehaviors: string[];
  evaluationRubric: { situationUnderstanding: string; responseQuality: string; followupAction: string };
  quizConcepts: string[];
};

export const SCENARIOS: Scenario[] = [
  // ===== 1. 조직 이해·적응
  {
    id: 'org-01', category: '조직 이해·적응', title: '이 방식, 왜 이렇게 하지?',
    description: '기존 방식을 잘 모른 채 개선 의견을 낸 상황을 조율해보세요.', difficulty: '보통', recommendedPersonality: 'meticulous',
    context: '팀의 주간 보고는 공유 문서에 항목별로 따로 정리한 뒤 팀장에게 메일로 보내는 방식이에요. 여러분은 메신저에 한 번에 올리면 더 빠를 것 같아, 지금 방식을 충분히 알아보지 않은 채 팀장님께 바꾸자고 말을 꺼냈어요.',
    facts: {
      '현재 보고 방식': '공유 문서에 항목별 정리 → 팀장에게 메일 발송',
      '이렇게 하는 이유': '팀장이 이 내용을 그대로 다른 부서와 임원 보고에 재사용하고, 메일이 공식 기록으로 남아야 하기 때문',
      '변경 가능 여부': '근거와 대안을 정리해 오면 다음 달 팀 회의에서 논의할 수 있음 (팀장 혼자 바로 바꾸지는 않음)',
    },
    openingMessage: '지금 방식보다 다른 방법이 더 나을 것 같다고 했죠? 어떤 부분을 바꾸고 싶은 거예요?',
    possibleTwists: ['좋은 방법일 수 있는데, 지금 방식이 왜 이렇게 되어 있는지는 확인해봤어요?'],
    learningPoints: ['기존 업무 방식 관찰', '기존 방식의 이유 확인', '바로 판단하거나 바꾸기보다 조직의 흐름 이해', '개선 의견을 근거와 함께 제시'],
    idealBehaviors: ['지금 방식이 왜 이렇게 되어 있는지 질문한다', '개선 의견을 근거(시간 절약 등)와 함께 말한다', '바로 바꾸지 않고 검토·논의 절차를 제안한다'],
    avoidBehaviors: ['기존 방식을 비효율적이라고 단정한다', '이유를 묻지 않고 혼자 바꿔 진행하겠다고 한다', '전 직장 방식과 우열을 비교한다'],
    evaluationRubric: {
      situationUnderstanding: '현재 방식에 아직 모르는 이유(재사용 · 공식 기록)가 있을 수 있음을 알아차렸는가',
      responseQuality: '단정하지 않고 질문과 근거를 갖춰 공손하게 의견을 말했는가',
      followupAction: '바로 바꾸기보다 정리해서 논의하겠다는 등 다음 단계를 제시했는가',
    },
    quizConcepts: ['org-process'],
  },
  {
    id: 'org-02', category: '조직 이해·적응', title: '이건 누구한테 확인해야 하지?',
    description: '필요한 자료를 누구에게 요청해야 할지 찾아보세요.', difficulty: '쉬움', recommendedPersonality: 'calm',
    context: '작년 하반기 고객 만족도 조사 결과가 업무에 필요한데, 어느 팀의 누구에게 요청해야 하는지 몰라요. 팀장님께 여쭤보려는 상황이에요.',
    facts: {
      '자료를 가진 팀': '고객경험팀',
      '실제 담당자': '고객경험팀 박서연 매니저 (팀장인 최 팀장이 아님)',
      '요청 방법': '사내 메신저로 먼저 요청하고, 자료 사용 목적을 함께 적어야 함',
      '조직도 위치': '사내 포털 > 조직도에서 고객경험팀 담당 업무를 확인할 수 있음',
    },
    openingMessage: '그 자료가 필요하다고 했죠. 누구에게 확인해볼 생각이에요?',
    possibleTwists: ['그 팀이 자료를 가지고 있긴 한데 실제 담당자는 다른 사람이에요.'],
    learningPoints: ['조직도 확인', '담당자의 역할 파악', '협업 관계 이해', '필요한 정보를 누구에게 요청해야 하는지 확인'],
    idealBehaviors: ['조직도나 담당 업무를 먼저 확인해보겠다고 한다', '실제 담당자가 누구인지 묻는다', '요청할 때 목적과 필요한 범위를 함께 밝히겠다고 한다'],
    avoidBehaviors: ['아무에게나 일단 물어보겠다고 한다', '팀 대표(팀장)에게 바로 요청하겠다고 단정한다', '팀장에게 대신 받아달라고 한다'],
    evaluationRubric: {
      situationUnderstanding: '자료를 가진 팀과 실제 담당자가 다를 수 있음을 파악했는가',
      responseQuality: '스스로 확인할 방법(조직도)을 말하고, 필요한 정보를 구체적으로 질문했는가',
      followupAction: '담당자에게 목적과 함께 요청하는 다음 행동을 정했는가',
    },
    quizConcepts: ['org-start', 'org-process'],
  },
  {
    id: 'org-03', category: '조직 이해·적응', title: '이 업무도 제가 하면 될까요?',
    description: '다른 팀에서 직접 들어온 업무 요청을 어떻게 처리할지 정해보세요.', difficulty: '보통', recommendedPersonality: 'direct',
    context: '마케팅팀 직원이 여러분에게 직접 메신저로 “이벤트 참가자 300명 명단 엑셀 정리 좀 부탁드려요”라고 요청했어요. 여러분의 담당 업무인지 확실하지 않아 팀장님께 말씀드리는 상황이에요.',
    facts: {
      '실제 담당': '원래 마케팅팀 운영 담당자의 업무. 우리 팀 업무가 아님',
      '이전 사례': '지난번 다른 신입이 그냥 처리했지만, 그 뒤 팀 업무가 밀려 팀장이 정리하기로 했음',
      '처리 원칙': '다른 팀 요청은 팀장에게 공유한 뒤 담당 여부를 정함',
    },
    openingMessage: '다른 팀에서 요청이 왔다고 했죠. 어떤 요청이었어요?',
    possibleTwists: ['지난번에는 다른 신입이 그냥 처리했다고 하네요.'],
    learningPoints: ['자신의 역할 범위 확인', '업무 담당자 확인', '보고 관계 확인', '이전 사람이 했다는 이유만으로 바로 수행하지 않기'],
    idealBehaviors: ['요청 내용과 분량을 구체적으로 보고한다', '자신의 담당 업무인지 확인을 요청한다', '처리 여부가 정해지면 요청한 사람에게 회신하겠다고 한다'],
    avoidBehaviors: ['전에 누가 했으니 그냥 하겠다고 한다', '팀장에게 알리지 않고 처리하거나 거절한다', '요청한 직원을 탓한다'],
    evaluationRubric: {
      situationUnderstanding: '내 업무 범위인지, 보고가 필요한 일인지 구분했는가',
      responseQuality: '요청 내용·분량을 정확히 전달하고 판단을 구했는가',
      followupAction: '결정에 따라 요청자에게 회신하는 등 다음 행동을 정했는가',
    },
    quizConcepts: ['org-start'],
  },

  // ===== 2. 업무 절차&기준
  {
    id: 'proc-01', category: '업무 절차&기준', title: '“내일까지 정리해주세요”',
    description: '애매한 업무 요청을 질문으로 구체화해보세요.', difficulty: '보통', recommendedPersonality: 'busy',
    context: '팀장님이 지나가다 경쟁사 자료를 내일까지 정리해달라고 짧게 요청했어요. 아직 자세한 조건은 듣지 못했어요.',
    facts: {
      '목적': '임원 보고용',
      '범위': '경쟁사 3곳 (A사 · B사 · C사)',
      '비교 항목': '가격, 주요 기능',
      '결과물 형태': '1페이지 비교표',
      '마감': '내일 오후 2시',
      '검토': '제출 전 오전 11시에 초안을 한 번 보고 싶음',
    },
    openingMessage: '경쟁사 자료 좀 정리해서 내일까지 주세요.',
    possibleTwists: ['아, 임원분들이 보실 거라 길면 안 돼요.'],
    learningPoints: ['업무 목적 확인', '범위 확인', '결과물 형태 확인', '정확한 기한 확인', '검토 기준 확인'],
    idealBehaviors: ['목적(누가 보는지)을 묻는다', '범위(몇 곳, 어떤 항목)를 묻는다', '형태·분량과 정확한 마감 시간을 묻는다', '이해한 내용을 요약해 확인한다'],
    avoidBehaviors: ['“네 알겠습니다”로만 답하고 조건을 묻지 않는다', '범위를 혼자 추측해 정한다', '마감 시간을 확인하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '요청에 빠진 조건(목적·범위·형태·마감·검토)이 있음을 알아차렸는가',
      responseQuality: '필요한 조건을 구체적으로 질문하고 정리했는가',
      followupAction: '이해한 내용을 요약 확인하거나 중간 검토 일정을 잡았는가',
    },
    quizConcepts: ['proc-ethics'],
  },
  {
    id: 'proc-02', category: '업무 절차&기준', title: '지난번처럼 하면 되나요?',
    description: '비슷한 업무라도 이번 조건을 다시 확인해보세요.', difficulty: '보통', recommendedPersonality: 'calm',
    context: '지난달 팀 내부 회의용으로 만든 월간 실적 자료(상세 수치 위주 10장)와 같은 방식으로 이번 달 자료도 정리해달라는 요청을 받았어요.',
    facts: {
      '이번 자료의 대상': '다른 부서장들이 함께 보는 분기 회의용',
      '달라지는 점': '요약 3장 이내, 부서별 비교와 다음 분기 계획이 들어가야 함',
      '마감': '목요일 오후 5시',
    },
    openingMessage: '지난번에 했던 방식으로 이번 자료도 정리해주세요.',
    possibleTwists: ['이번 자료는 지난번하고 보는 사람이 조금 달라요.'],
    learningPoints: ['비슷한 업무라도 조건 재확인', '기존 방식을 무조건 적용하지 않기', '대상과 목적에 따라 기준 확인'],
    idealBehaviors: ['이번 자료를 누가 보는지, 목적이 같은지 확인한다', '분량·구성이 지난번과 같은지 묻는다', '달라진 조건을 정리해 확인한다'],
    avoidBehaviors: ['지난번 파일을 그대로 복사해 진행하겠다고 한다', '대상과 목적을 묻지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '같은 방식이라도 대상·목적이 바뀌었을 수 있음을 파악했는가',
      responseQuality: '달라진 점을 구체적으로 질문했는가',
      followupAction: '바뀐 조건을 반영한 진행 계획이나 확인 시점을 말했는가',
    },
    quizConcepts: ['proc-ethics'],
  },
  {
    id: 'proc-03', category: '업무 절차&기준', title: '절차를 그냥 넘어가도 될까요?',
    description: '급한 일정 속에서 승인 절차를 어떻게 다룰지 판단해보세요.', difficulty: '어려움', recommendedPersonality: 'busy',
    context: '외부 업체에 보낼 견적 요청서를 오늘 안에 보내야 해요. 원래는 구매팀 승인을 받은 뒤 보내야 하는데, 팀장님이 시간이 없다며 먼저 보내자고 해요.',
    facts: {
      '정식 절차': '외부 발송 전 구매팀 사전 승인 필요 (보통 1일 소요)',
      '예외 규정': '긴급 시 구매팀장 구두 승인 후 발송하고 다음 날 서면 승인 가능',
      '권한': '신입사원은 예외 승인 권한이 없음. 팀장이 구매팀장에게 요청해야 함',
      '업무 영향': '오늘 못 보내면 업체 회신이 이틀 늦어짐',
    },
    openingMessage: '시간이 좀 없는데 이번 건 그냥 먼저 진행하면 안 될까요?',
    possibleTwists: ['구매팀 승인은 원래 하루쯤 걸리거든요.'],
    learningPoints: ['승인 절차 확인', '권한 확인', '예외 적용 여부 확인', '업무 영향 파악', '애매할 경우 확인 후 진행'],
    idealBehaviors: ['승인 없이 보내도 되는지 기준·예외 규정을 확인한다', '본인에게 권한이 없음을 말하고 승인권자 확인을 제안한다', '일정 영향과 대안(긴급 승인 요청)을 함께 말한다'],
    avoidBehaviors: ['바로 “네, 보내겠습니다”라고 동의한다', '이유 없이 무조건 안 된다고 거절한다', '절차를 몰래 건너뛴다'],
    evaluationRubric: {
      situationUnderstanding: '승인 절차·권한·예외 여부를 확인해야 하는 상황임을 파악했는가',
      responseQuality: '팀장을 존중하면서 기준을 근거로 의견을 말했는가',
      followupAction: '긴급 승인 요청 등 일정을 지키면서 절차를 지킬 대안을 제시했는가',
    },
    quizConcepts: ['proc-fair', 'proc-ethics'],
  },

  // ===== 3. 질문&소통
  {
    id: 'comm-01', category: '질문&소통', title: '팀장님, 잠깐 질문 있습니다',
    description: '짧은 시간 안에 막힌 부분을 정확하게 질문해보세요.', difficulty: '보통', recommendedPersonality: 'busy',
    context: '보고서를 만들다 보니 3분기 매출이 영업팀 자료에는 12.4억, 재무팀 자료에는 11.8억으로 서로 달라요. 팀장님이 곧 회의에 들어가셔야 하는 상황이에요.',
    facts: {
      '원인': '영업팀은 계약 기준, 재무팀은 입금 기준',
      '이번 보고서 기준': '재무팀 입금 기준을 사용',
      '표기': '기준을 각주로 적어야 함',
    },
    openingMessage: '무슨 일이에요? 저 5분 뒤에 회의 들어가야 해요.',
    possibleTwists: ['그래서 저한테 뭘 정해달라는 거예요?'],
    learningPoints: ['현재 상황 설명', '내가 확인한 내용', '정확히 막힌 부분', '필요한 답'],
    idealBehaviors: ['어떤 자료의 어떤 숫자가 다른지 짧게 말한다', '스스로 확인해본 내용을 말한다', '어느 기준을 써야 하는지처럼 필요한 답을 분명히 묻는다'],
    avoidBehaviors: ['배경 설명을 길게 늘어놓는다', '“숫자가 이상해요”처럼 막연하게 묻는다', '필요한 답이 무엇인지 말하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '두 자료의 차이와 막힌 지점을 정확히 파악했는가',
      responseQuality: '짧은 시간에 맞게 핵심(상황 · 확인한 것 · 필요한 답)만 질문했는가',
      followupAction: '답을 받은 뒤 반영 방법(각주 등)이나 추가 확인을 정했는가',
    },
    quizConcepts: ['comm-quick'],
  },
  {
    id: 'comm-02', category: '질문&소통', title: '읽었는데 답이 없다',
    description: '응답이 필요한 메시지에 답이 없을 때 다시 연락해보세요.', difficulty: '보통', recommendedPersonality: 'busy',
    context: '견적서 최종 금액(320만 원) 승인을 받아 오후 2시까지 업체에 회신해야 해서, 팀장님께 메신저로 검토를 요청했어요. 그런데 팀장님이 읽고 답하지 않았어요. 지금은 오후 1시 20분이에요. 팀장님께 다시 연락하는 상황이에요.',
    facts: {
      '상황': '팀장은 메시지를 읽었지만 연속 회의 중이라 답하지 못했음',
      '팀장 일정': '1시 40분에 잠깐 자리에 있음, 2시부터 다시 회의',
    },
    openingMessage: '아, 메시지 봤는데 계속 회의라서요. 뭐가 급한 거였죠?',
    possibleTwists: ['저 1시 40분쯤 잠깐 자리에 있어요.'],
    learningPoints: ['필요한 응답 시점 전달', '긴급도 판단', '추가 연락 방법', '무조건 반복 메시지 보내지 않기'],
    idealBehaviors: ['무엇을 언제까지 확인받아야 하는지 짧게 말한다', '왜 그 시간까지 필요한지 이유를 말한다', '가능한 확인 방법·시간을 함께 정한다'],
    avoidBehaviors: ['답이 없어 서운하다는 식으로 말한다', '같은 메시지를 반복해서 보냈다고 한다', '마감 이유와 시점을 말하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '응답 기한과 긴급도를 파악하고 있는가',
      responseQuality: '필요한 확인과 시점을 짧고 정중하게 전달했는가',
      followupAction: '확인받을 방법과 시간을 구체적으로 정했는가',
    },
    quizConcepts: ['comm-channel', 'comm-quick'],
  },
  {
    id: 'comm-03', category: '질문&소통', title: '회의에서 내용이 바뀌었다',
    description: '회의에서 바뀐 결정을 정리하고 확인해보세요.', difficulty: '쉬움', recommendedPersonality: 'meticulous',
    context: '어제 메신저로는 “신규 고객 대상 안내문”을 만들기로 했는데, 오늘 회의에서 대상과 일정이 바뀌었어요. 회의가 끝나고 팀장님이 말을 걸었어요.',
    facts: {
      '바뀐 대상': '신규 고객 → 기존 고객 중 6개월 이상 미이용 고객',
      '바뀐 일정': '금요일 → 다음 주 화요일 오전',
      '담당': '안내문 작성은 사용자, 발송은 운영팀',
      '기록 위치': '팀 공유 폴더의 회의록 문서',
    },
    openingMessage: '회의에서 말한 방향으로 진행해주세요.',
    possibleTwists: ['운영팀에도 바뀐 내용이 전달돼야 해요.'],
    learningPoints: ['결정사항 정리', '변경 내용 기록', '공유 위치 확인', '담당자 및 일정 확인'],
    idealBehaviors: ['바뀐 대상과 일정을 다시 말해 확인한다', '결정사항을 회의록이나 공유 위치에 기록하겠다고 한다', '관련 담당자(운영팀)에게 공유할지 확인한다'],
    avoidBehaviors: ['“네”로만 답하고 확인하지 않는다', '메신저 내용과 회의 내용이 섞인 채 진행한다', '기록·공유를 하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '메신저 결정과 회의 결정이 달라졌음을 알아차렸는가',
      responseQuality: '바뀐 내용을 요약해 정확히 확인했는가',
      followupAction: '기록 위치와 공유 대상 · 일정까지 정했는가',
    },
    quizConcepts: ['comm-record'],
  },

  // ===== 4. 협업&동료 존중
  {
    id: 'collab-01', category: '협업&동료 존중', title: '둘이 같이 진행해주세요',
    description: '공동 업무의 역할과 일정을 정해보세요.', difficulty: '보통', recommendedPersonality: 'calm',
    context: '팀장님이 다음 주 고객사 제안서를 동기 김민준 님과 함께 만들라고 했어요. 아직 역할과 일정은 정해지지 않았어요.',
    facts: {
      '결과물': '고객사 제안서 10장 내외',
      '마감': '다음 주 수요일 오전 10시',
      '팀장 기대': '시장 분석(앞부분)과 제안 내용(뒷부분)을 나눠 맡기를 원함',
      '중간 점검': '금요일 오후에 초안 한 번 확인 가능',
      '협업 대상': '김민준 님 (같은 팀 동기)',
    },
    openingMessage: '이번 자료는 김민준 님하고 같이 만들어주세요.',
    possibleTwists: ['두 분이 알아서 나누면 될 것 같은데요.'],
    learningPoints: ['공동 목적 확인', '각자 역할 정하기', '일정 정하기', '중간 확인 시점 정하기'],
    idealBehaviors: ['결과물의 목적과 마감을 확인한다', '역할을 어떻게 나눌지 기대가 있는지 묻거나 제안한다', '중간 점검 시점을 정한다'],
    avoidBehaviors: ['알아서 하겠다고만 한다', '역할을 혼자 정해버린다', '마감만 확인하고 중간 점검은 정하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '역할·일정이 정해지지 않은 공동 업무임을 파악했는가',
      responseQuality: '목적·역할·일정을 구체적으로 확인하거나 제안했는가',
      followupAction: '동료와의 역할 분담과 중간 점검 일정을 다음 행동으로 정했는가',
    },
    quizConcepts: ['collab-confirm', 'collab-basics'],
  },
  {
    id: 'collab-02', category: '협업&동료 존중', title: '공동 작업이 계속 늦어진다',
    description: '동료의 지연을 사실 중심으로 설명하고 일정을 조율해보세요.', difficulty: '어려움', recommendedPersonality: 'direct',
    context: '김민준 님과 함께 만드는 제안서에서 김민준 님이 맡은 시장 분석 파트가 화요일 예정이었는데, 목요일인 오늘까지 올라오지 않았어요. 여러분의 제안 파트는 시장 분석 결론을 받아야 시작할 수 있어서 작업이 멈춰 있어요. 팀장님이 진행 상황을 물어요.',
    facts: {
      '지연 이유': '김민준 님이 갑자기 다른 긴급 업무를 맡았음 (사용자는 아직 모름)',
      '마감': '다음 주 수요일 오전 10시 (변경 없음)',
    },
    openingMessage: '자료가 왜 아직 안 올라왔죠?',
    possibleTwists: ['김민준 님이 이번 주에 다른 급한 일을 하나 맡긴 했어요.'],
    learningPoints: ['사람을 평가하지 않기', '사실 중심 설명', '업무 영향 설명', '역할/일정 재조율'],
    idealBehaviors: ['예정일과 현재 상태를 사실대로 말한다', '내 파트에 생긴 영향을 설명한다', '역할 조정이나 새 일정 등 해결안을 제안한다'],
    avoidBehaviors: ['동료가 게으르다는 식으로 탓한다', '내 책임이 아니라고만 한다', '해결책 없이 상황만 전달한다'],
    evaluationRubric: {
      situationUnderstanding: '지연 사실과 내 업무에 미치는 영향을 정확히 파악했는가',
      responseQuality: '동료를 평가하지 않고 사실 중심으로 설명했는가',
      followupAction: '일정·역할 재조율 등 구체적인 해결안을 제시했는가',
    },
    quizConcepts: ['collab-fact'],
  },
  {
    id: 'collab-03', category: '협업&동료 존중', title: '이번 자료는 누가 뭘 했죠?',
    description: '공동 결과물에서 각자의 역할을 정확하게 설명해보세요.', difficulty: '쉬움', recommendedPersonality: 'meticulous',
    context: '김민준 님과 함께 만든 제안서가 끝났어요. 여러분은 제안 내용(6~10장)과 전체 디자인 통일을, 김민준 님은 시장 분석(1~5장)과 경쟁사 데이터 수집을 맡았고, 최종 검토와 발표 리허설은 함께 했어요. 팀장님이 각자 어떤 부분을 맡았는지 물어요.',
    facts: {
      '팀장 생각': '경쟁사 데이터 정리가 특히 좋았다고 봄 (누가 했는지는 모름)',
      '팀장 계획': '이 내용을 다음 고객사 미팅 담당을 정하는 데 참고함',
    },
    openingMessage: '이번 결과물에서 각자 어떤 부분을 맡았어요?',
    possibleTwists: ['경쟁사 데이터 정리가 특히 좋던데, 그건 누가 했어요?'],
    learningPoints: ['자신의 역할 정확히 설명', '동료의 기여도 함께 인정', '공동 성과를 개인 성과처럼 말하지 않기'],
    idealBehaviors: ['내가 맡은 부분을 구체적으로 말한다', '동료가 맡은 부분과 기여를 함께 말한다', '함께 한 부분을 구분해서 설명한다'],
    avoidBehaviors: ['전체를 내가 한 것처럼 말한다', '동료의 기여를 빼거나 깎아내린다', '“같이 했어요”라고만 뭉뚱그린다'],
    evaluationRubric: {
      situationUnderstanding: '팀장이 각자의 역할을 정확히 알고 싶어 함을 파악했는가',
      responseQuality: '자신과 동료의 기여를 구체적이고 공정하게 설명했는가',
      followupAction: '이후 미팅 등 다음 일에서 역할을 이어갈 방법을 말했는가',
    },
    quizConcepts: ['collab-basics'],
  },

  // ===== 5. 직장 관계&예절
  {
    id: 'etq-01', category: '직장 관계&예절', title: '이 업무도 좀 도와줄 수 있죠?',
    description: '갑작스러운 추가 업무 요청에 가능한 범위를 조율해보세요.', difficulty: '보통', recommendedPersonality: 'calm',
    context: '오늘 오후 5시 마감인 주간 보고서를 70%쯤 작성했는데, 팀장님이 다른 자료 검토를 추가로 부탁해요.',
    facts: {
      '추가 요청': '내일 오전 회의용 발표 자료의 오탈자 · 숫자 검토 (12장)',
      '실제 필요한 시간': '약 30분',
      '팀장 마감': '내일 오전 9시 회의 전까지면 됨',
    },
    openingMessage: '혹시 이 자료도 오늘 같이 봐줄 수 있어요?',
    possibleTwists: ['전체는 아니고 30분 정도면 될 것 같은데요.'],
    learningPoints: ['현재 자신의 상황 설명', '가능한 범위 제시', '무조건 수락하거나 거절하지 않기', '대안 제시'],
    idealBehaviors: ['현재 하고 있는 업무와 마감을 설명한다', '언제까지 필요한지 묻는다', '가능한 시간·범위나 대안(보고서 마감 후 검토 등)을 제안한다'],
    avoidBehaviors: ['무리해서 바로 다 하겠다고 한다', '바쁘다며 바로 거절만 한다', '현재 상황을 말하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '내 마감과 추가 요청의 기한을 함께 고려했는가',
      responseQuality: '상황을 설명하며 정중하게 가능한 범위를 말했는가',
      followupAction: '구체적인 시간이나 대안으로 일정을 조율했는가',
    },
    quizConcepts: ['etq-help'],
  },
  {
    id: 'etq-02', category: '직장 관계&예절', title: '2시까지 받을 수 있죠?',
    description: '예상보다 늦어진 일정을 미리 알리고 조율해보세요.', difficulty: '보통', recommendedPersonality: 'direct',
    context: '오후 2시까지 팀장님께 드리기로 한 고객 분석 자료가 지금 1시 20분인데 아직 끝나지 않았어요. 분석 표는 완성했고, 요약 문장과 오탈자 검토가 남았어요.',
    facts: {
      '팀장 필요': '오후 3시 고객사 미팅에서 사용',
      '최소 필요': '미팅 전 30분은 내용을 훑어봐야 함 → 2시 30분이 한계',
    },
    openingMessage: '자료 2시까지 받을 수 있죠?',
    possibleTwists: ['3시는 좀 늦는데요. 2시 30분까지 필요한 부분만 먼저 받을 수 있을까요?'],
    learningPoints: ['늦기 전에 알리기', '현재 진행 상태 공유', '일정 영향 확인', '새로운 시간 제안', '범위 재조율'],
    idealBehaviors: ['지금 상태(완료된 부분 · 남은 부분)를 말한다', '가능한 시간을 구체적으로 제안한다', '완성된 부분을 먼저 드리는 등 범위를 조율한다'],
    avoidBehaviors: ['일단 “네”라고 답한다', '사과만 하고 대안을 말하지 않는다', '현재 상태를 숨긴다'],
    evaluationRubric: {
      situationUnderstanding: '팀장 일정(미팅)에 미치는 영향을 파악했는가',
      responseQuality: '현재 상태를 솔직하게 알리고 구체적인 시간을 제안했는가',
      followupAction: '먼저 줄 수 있는 범위와 다음 전달 시점을 정했는가',
    },
    quizConcepts: ['etq-trust'],
  },
  {
    id: 'etq-03', category: '직장 관계&예절', title: '이 파일 때문에 다시 작업해야 하는데요',
    description: '실수로 다른 사람 업무에 영향이 생긴 상황에 대응해보세요.', difficulty: '어려움', recommendedPersonality: 'direct',
    context: '오전에 디자인팀에 상품 정보 파일을 보냈는데, 최신본(v3)이 아니라 지난 버전(v2)이었어요. 두 파일은 가격 3개가 달라요. 그 파일로 작업한 디자인팀이 다시 작업해야 하는 상황이에요.',
    facts: {
      '영향': '디자인팀 상세페이지 2장 수정 필요, 약 1시간 추가 작업',
      '디자인팀 마감': '오늘 오후 6시',
      '팀장 기대': '사과와 함께 정확한 수정 내용 전달, 재발 방지',
    },
    openingMessage: '아까 전달한 파일 때문에 다른 팀에서 다시 작업해야 한다고 합니다.',
    possibleTwists: ['디자인팀은 오늘 6시까지 마감이에요.'],
    learningPoints: ['실수 인정', '발생한 영향 확인', '사과만 하고 끝내지 않기', '수정 행동 제시', '후속 조치'],
    idealBehaviors: ['실수를 바로 인정한다', '무엇이 달라졌는지와 영향을 확인한다', '최신본 재전달·변경 내용 정리 등 수정 행동을 말한다', '재발 방지 방법을 말한다'],
    avoidBehaviors: ['변명하거나 남 탓을 한다', '사과만 반복한다', '수정 계획 없이 끝낸다'],
    evaluationRubric: {
      situationUnderstanding: '실수가 다른 팀 일정에 준 영향을 파악했는가',
      responseQuality: '변명 없이 인정하고 구체적으로 사과했는가',
      followupAction: '수정 행동과 재발 방지책까지 제시했는가',
    },
    quizConcepts: ['etq-trust'],
  },

  // ===== 6. 근무&재택 수칙
  {
    id: 'remote-01', category: '근무&재택 수칙', title: '두 시간 정도 연락이 어려울 것 같습니다',
    description: '재택근무 중 집중 시간을 공유하고 연락 방법을 정해보세요.', difficulty: '쉬움', recommendedPersonality: 'meticulous',
    context: '재택근무 중이에요. 오후 2시부터 4시까지 데이터 정리에 집중하려고 메신저 알림을 꺼두려 해요. 팀장님께 미리 말씀드리는 상황이에요.',
    facts: {
      '팀 규칙': '집중 시간은 미리 공유하고, 긴급 건은 전화로 연락',
      '오늘 팀 일정': '오후 3시에 다른 팀에서 급한 확인 요청이 올 수도 있음',
      '팀장 요청': '최소 한 시간에 한 번은 메신저를 확인해주길 원함',
    },
    openingMessage: '그 시간에 급한 일이 생기면 어떻게 연락하면 되죠?',
    possibleTwists: ['오늘 3시쯤 다른 팀에서 급한 확인이 올 수도 있어요.'],
    learningPoints: ['집중 시간 공유', '메시지 확인 가능 시점', '긴급 연락 방법', '팀과 연결 유지'],
    idealBehaviors: ['집중 시간과 이유를 말한다', '메시지를 확인할 시점을 정한다', '긴급할 때 연락할 방법(전화 등)을 알려준다'],
    avoidBehaviors: ['그냥 알림을 끄겠다고만 한다', '확인 시점을 정하지 않는다', '긴급 연락 방법을 말하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '집중 시간에도 팀과 연결이 필요함을 파악했는가',
      responseQuality: '시간·이유·확인 시점을 구체적으로 공유했는가',
      followupAction: '긴급 연락 방법과 확인 주기를 정했는가',
    },
    quizConcepts: ['remote-contact'],
  },
  {
    id: 'remote-02', category: '근무&재택 수칙', title: '지금 어디까지 됐어요?',
    description: '진행 상황을 완료·막힘·다음 행동으로 나눠 공유해보세요.', difficulty: '보통', recommendedPersonality: 'busy',
    context: '재택근무 중 팀장님이 메신저로 진행 상황을 물어요. 고객 문의 200건 중 160건은 유형 분류를 끝내 팀 공유 폴더의 ‘고객문의_분류.xlsx’에 올렸어요. 남은 40건은 환불과 배송 지연이 섞여 있어 어느 유형으로 넣을지 기준이 없어요. 마감은 내일 오전 10시예요.',
    facts: {
      '40건 기준': '물어보면 알려줌 — 환불 유형으로 분류하고 비고란에 배송 지연 표시',
      '팀장 일정': '오후 4시에 결과를 한 번 보고 싶음',
    },
    openingMessage: '지금 작업 어디까지 됐어요?',
    possibleTwists: ['그 40건은 제가 기준을 정해줘야 하는 거죠?'],
    learningPoints: ['완료한 결과 공유', '결과물 위치 공유', '막힌 조건 설명', '다음 행동', '다음 확인 시점'],
    idealBehaviors: ['완료한 양과 결과물 위치를 말한다', '막힌 부분과 필요한 결정을 구체적으로 말한다', '다음 행동과 완료 예정 시점을 말한다'],
    avoidBehaviors: ['“거의 다 했어요”처럼 막연하게 답한다', '막힌 부분을 말하지 않는다', '일한 시간만 나열한다'],
    evaluationRubric: {
      situationUnderstanding: '완료·막힘·남은 일을 정확히 구분하고 있는가',
      responseQuality: '수치와 위치를 들어 구체적으로 공유했는가',
      followupAction: '필요한 결정 요청과 다음 확인 시점을 정했는가',
    },
    quizConcepts: ['remote-share'],
  },
  {
    id: 'remote-03', category: '근무&재택 수칙', title: '퇴근 전에 이것만 정리해주세요',
    description: '다음 사람이 이어서 할 수 있게 인수인계해보세요.', difficulty: '보통', recommendedPersonality: 'meticulous',
    context: '퇴근 시간인데 거래처 연락처 정리(120곳 중 80곳 완료, 팀 공유 폴더 ‘거래처_연락처_정리.xlsx’)가 끝나지 않았어요. 남은 40곳 중 5곳은 담당자가 바뀌어 영업팀 확인이 필요해요. 마감은 내일 오후 3시인데, 내일은 휴가라 동료 이수아 님이 이어서 해야 해요. 팀장님이 인수인계를 어떻게 할지 물어요.',
    facts: {
      '이수아 님 일정': '내일 오전 9시 출근, 10시까지 회의라 그 뒤에 작업 가능',
      '팀장 기대': '말로만 넘기지 말고 공유 폴더에 인수인계 메모를 남기길 원함',
    },
    openingMessage: '내일 다른 사람이 이어서 해야 하는데 어디서부터 보면 되죠?',
    possibleTwists: ['이수아 님은 이 작업을 처음 보는 거라서요.'],
    learningPoints: ['완료/미완료 구분', '파일 또는 자료 위치', '확인해야 할 사람', '다음 확인 시점', '인수인계'],
    idealBehaviors: ['완료한 것과 남은 것을 구분해 말한다', '파일 위치를 알려준다', '확인이 필요한 사람(영업팀)과 마감을 알려준다', '인수인계 내용을 기록으로 남기겠다고 한다'],
    avoidBehaviors: ['“거의 다 했어요, 나머지만 하면 돼요”로 끝낸다', '파일 위치를 빼먹는다', '기록 없이 말로만 넘긴다'],
    evaluationRubric: {
      situationUnderstanding: '다음 사람이 처음 보는 작업이라 필요한 정보가 무엇인지 파악했는가',
      responseQuality: '완료·미완료·위치·확인 대상을 구체적으로 정리했는가',
      followupAction: '인수인계 기록과 연락 방법 등 후속 조치를 정했는가',
    },
    quizConcepts: ['remote-share', 'remote-goal'],
  },

  // ===== 7. 공용 공간&비품 관리
  {
    id: 'shared-01', category: '공용 공간&비품 관리', title: '어댑터가 어디 갔죠?',
    description: '옮겨 쓴 공용 비품의 위치를 공유하고 정리해보세요.', difficulty: '쉬움', recommendedPersonality: 'busy',
    context: '오전에 3층 A회의실 공용 비품함에 있던 USB-C 어댑터를 5층 B회의실로 가져가 썼는데, 아직 테이블 위에 두고 돌려놓지 않았어요. 공용 비품 대여 시트에도 기록하지 않았어요. 팀장님이 어댑터를 찾고 있어요.',
    facts: {
      '팀장 필요': '10분 뒤 3층 회의',
    },
    openingMessage: '회의실에 있던 어댑터 혹시 봤어요? 지금 필요한데 안 보이네요.',
    possibleTwists: ['요즘 계속 위치가 바뀌어서 찾기가 어렵네요.'],
    learningPoints: ['이동 기록', '현재 위치 공유', '사용 후 반납 위치'],
    idealBehaviors: ['제가 가져갔다고 바로 말하고 현재 위치를 알려준다', '바로 가져다 놓겠다고 한다', '앞으로 대여 기록을 남기겠다고 한다'],
    avoidBehaviors: ['모른다고 하거나 얼버무린다', '위치만 알려주고 반납하지 않는다', '기록 없이 옮긴 것을 대수롭지 않게 넘긴다'],
    evaluationRubric: {
      situationUnderstanding: '내가 옮긴 비품 때문에 생긴 문제임을 파악했는가',
      responseQuality: '솔직하게 인정하고 정확한 위치를 알렸는가',
      followupAction: '즉시 반납과 이동 기록 등 재발 방지 행동을 정했는가',
    },
    quizConcepts: ['shared-manage', 'shared-after'],
  },
  {
    id: 'shared-02', category: '공용 공간&비품 관리', title: '하나 더 구매할까요?',
    description: '새로 사기 전에 기존 비품을 먼저 확인해보세요.', difficulty: '보통', recommendedPersonality: 'calm',
    context: '어댑터를 하나 더 사달라는 요청이 들어왔어요. 비품 목록에는 같은 제품 예비 1개가 3층 창고 선반 B에 있다고 되어 있지만, 상태는 확인되지 않았어요.',
    facts: {
      '실제 상태': '확인해보면 정상 작동함 (목록 갱신은 3개월 전)',
      '구매 절차': '비품 구매는 총무팀 승인 필요, 평균 1주일 소요',
      '가격': '개당 4만 원',
    },
    openingMessage: '그냥 하나 새로 주문할까요?',
    possibleTwists: ['목록이 좀 오래되긴 했어요.'],
    learningPoints: ['기존 재고 확인', '보관 위치 확인', '현재 상태 확인', '실제 구매 필요 여부 판단'],
    idealBehaviors: ['목록에 있는 예비품을 먼저 확인하자고 한다', '보관 위치와 실제 상태를 확인하겠다고 한다', '확인 결과에 따라 구매 여부를 정하자고 한다'],
    avoidBehaviors: ['바로 주문하자고 한다', '목록만 보고 있다고 단정한다', '확인 후 목록을 갱신하지 않는다'],
    evaluationRubric: {
      situationUnderstanding: '목록과 실제 상태가 다를 수 있음을 파악했는가',
      responseQuality: '구매 전 확인할 내용을 구체적으로 말했는가',
      followupAction: '확인 후 구매 결정과 목록 갱신까지 연결했는가',
    },
    quizConcepts: ['shared-manage'],
  },
  {
    id: 'shared-03', category: '공용 공간&비품 관리', title: '원래 자리에 두긴 했는데요',
    description: '사용 후 이상이 생긴 공용 장비를 후속 조치까지 연결해보세요.', difficulty: '보통', recommendedPersonality: 'direct',
    context: '어제 회의실 빔프로젝터를 쓰고 원래 자리에 돌려놨는데, 사용 중에 화면이 두세 번 깜빡였어요. 오늘 다음 사람이 쓰려는데 전원은 켜지지만 화면이 안 나온대요.',
    facts: {
      '담당': '총무팀 장비 담당 정하늘 매니저',
      '신고 방법': '사내 포털 > 시설 · 장비 고장 신고',
      '다음 사용': '오늘 오후 2시 회의에서 필요함',
    },
    openingMessage: '다음 사람이 쓰려고 했는데 작동이 안 된다고 하네요.',
    possibleTwists: ['어제 쓸 때는 괜찮았어요?'],
    learningPoints: ['제자리 정리', '사용 후 상태 확인', '문제 발생 시 증상 공유', '담당자에게 후속 조치 연결'],
    idealBehaviors: ['어제 사용 중 있었던 증상을 그대로 말한다', '담당자에게 고장 신고 등 후속 조치를 하겠다고 한다', '오늘 회의를 위한 대안(다른 장비 등)을 함께 찾는다'],
    avoidBehaviors: ['제자리에 뒀으니 내 책임이 아니라고 한다', '깜빡였던 증상을 숨긴다', '알리기만 하고 후속 조치는 남에게 미룬다'],
    evaluationRubric: {
      situationUnderstanding: '사용 중 증상이 고장과 관련 있을 수 있음을 파악했는가',
      responseQuality: '증상을 솔직하고 구체적으로 공유했는가',
      followupAction: '담당자 신고와 당장의 대안까지 연결했는가',
    },
    quizConcepts: ['shared-after', 'shared-purpose'],
  },
];

export function getScenario(id: unknown): Scenario | undefined {
  return typeof id === 'string' ? SCENARIOS.find(s => s.id === id) : undefined;
}

// 브라우저로 보내도 되는 정보만 (facts · rubric · 이상적 행동은 빼고, 학습 포인트는 결과 화면용으로 남김)
export function publicScenario(s: Scenario) {
  return {
    id: s.id, category: s.category, title: s.title, description: s.description, difficulty: s.difficulty,
    minutes: '약 2~3분', recommendedPersonality: s.recommendedPersonality, context: s.context, quizConcepts: s.quizConcepts,
  };
}
