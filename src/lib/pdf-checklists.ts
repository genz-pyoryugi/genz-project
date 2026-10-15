import type { Row } from '@/app/checklist/model';

type MaterialChecklist = {
  id: string;
  category: string;
  file: string;
  title: string;
  pages: number[];
  evidence: string;
  items: [string, string, string, string, string];
};

// Learning activities adapted from the actual PDFs linked in the admin contents table.
// Page numbers are PDF viewer pages, not the page numbers printed in the document.
export const materialChecklists: MaterialChecklist[] = [
  { id:'organization-goal', category:'조직 이해·적응', file:'01-organization.pdf', title:'우리 팀의 방향 찾기', pages:[96,97,98],
    evidence:'조직 목표를 확인하고 개인·팀의 목표가 전체 목표와 연결되는지 살펴보는 활동을 바탕으로 구성했어요.',
    items:['회사 목표 한 줄 적기','우리 팀 목표 확인하기','내 업무 목표 적기','회사와 팀 목표 연결하기','내 업무의 기여점 찾기'] },
  { id:'organization-map', category:'조직 이해·적응', file:'01-organization.pdf', title:'조직도에서 길 찾기', pages:[107,108,109],
    evidence:'조직도를 구하거나 그려 자신의 위치와 구성원의 임무·담당 업무를 파악하는 활동을 바탕으로 구성했어요.',
    items:['사내 조직도 찾아보기','조직도에 내 위치 표시하기','우리 부서 역할 적기','협조할 부서 찾아보기','관련 업무 담당자 확인하기'] },
  { id:'organization-role', category:'조직 이해·적응', file:'01-organization.pdf', title:'내 역할을 또렷하게', pages:[106,110],
    evidence:'조직 구조를 통해 업무의 범위·권한, 필요한 정보의 제공자와 의사소통 경로를 파악하는 내용을 바탕으로 구성했어요.',
    items:['내 업무 범위 확인하기','내 결정 권한 물어보기','필요한 업무 정보 적기','정보를 얻을 담당자 찾기','정보 요청 방법 확인하기'] },
  { id:'work-plan', category:'업무 절차·기준', file:'02-work-understanding.pdf', title:'시작 전에 계획 한 장', pages:[8,10,11],
    evidence:'업무지침과 활용 가능한 시간·예산·기술·협력부서를 확인하고 수행 계획을 작성하는 활동을 바탕으로 구성했어요.',
    items:['업무지침 먼저 확인하기','쓸 수 있는 시간 적기','필요한 자원 목록 만들기','협력할 부서 확인하기','업무 단계별 일정 적기'] },
  { id:'work-flow', category:'업무 절차·기준', file:'02-work-understanding.pdf', title:'일의 흐름을 한눈에', pages:[11,12,13],
    evidence:'간트 차트·워크 플로 시트·체크리스트로 세부 단계와 협조 사항, 수행 수준을 점검하는 내용을 바탕으로 구성했어요.',
    items:['주요 업무를 단계로 나누기','단계별 시작과 끝 적기','협조가 필요한 단계 표시하기','단계별 소요시간 적기','끝낸 업무 단계 점검하기'] },
  { id:'work-problem', category:'업무 절차·기준', file:'02-problem-solving.pdf', title:'막힌 일도 차근차근', pages:[66,67,70,71],
    evidence:'문제를 세분화하고 원인을 분류하며 객관적 자료를 모아 여러 해결안을 비교하는 내용을 바탕으로 구성했어요.',
    items:['막힌 문제를 작게 나누기','가능한 원인 모아 적기','비슷한 원인끼리 묶기','확인한 자료의 출처 적기','해결안의 실행 가능성 비교하기'] },
  { id:'communication-listen', category:'질문·소통', file:'03-communication.pdf', title:'오늘은 잘 듣는 사람', pages:[64,65],
    evidence:'말을 중간에 자르지 않고 의미와 표정에 주의를 기울이며 이해하지 못한 부분을 질문하는 경청 방법을 바탕으로 구성했어요.',
    items:['상대 말 끝까지 듣기','모르는 부분 질문하기','이해한 내용 확인하기','말투와 표정에도 주의하기','미리 판단하지 않고 듣기'] },
  { id:'communication-question', category:'질문·소통', file:'03-communication.pdf', title:'한 번 더 확인하는 대화', pages:[72,73],
    evidence:'산만한 행동을 멈추고 요약·확인 질문·개방형 질문으로 메시지의 정확성을 점검하는 경청훈련을 바탕으로 구성했어요.',
    items:['대화 중 다른 행동 멈추기','들은 요점을 내 말로 정리하기','요약한 내용이 맞는지 묻기','구체적인 상황 질문하기','상대 입장에서 생각하기'] },
  { id:'communication-document', category:'질문·소통', file:'03-communication.pdf', title:'한눈에 읽히는 업무 메모', pages:[50],
    evidence:'짧은 표제, 결론 우선, 간결한 문장, 수치·일자의 정확성, 작성 후 검토라는 문서작성 원칙을 바탕으로 구성했어요.',
    items:['핵심을 담은 제목 붙이기','전할 결론 먼저 적기','긴 문장을 짧게 나누기','금액과 날짜 다시 확인하기','보내기 전 내용 검토하기'] },
  { id:'teamwork-goal', category:'협업·동료 존중', file:'04-teamwork.pdf', title:'함께 가는 팀 만들기', pages:[36,37],
    evidence:'공동 목표, 신뢰와 존중, 역할·책임 이행, 솔직한 대화를 팀워크의 기본요소로 설명한 내용을 바탕으로 구성했어요.',
    items:['팀의 공동 목표 확인하기','내 역할과 책임 적기','동료의 역할 확인하기','도움이 필요한 부분 말하기','팀 목표에 맞춰 결과 점검하기'] },
  { id:'teamwork-strength', category:'협업·동료 존중', file:'04-teamwork.pdf', title:'서로의 강점 더하기', pages:[38],
    evidence:'역할·책임의 명료화, 절차 확인, 강점 활용, 구성원 지원, 의견 차이의 공개적 논의를 바탕으로 구성했어요.',
    items:['팀 업무 절차 확인하기','동료가 잘하는 일 알아보기','내가 도울 수 있는 일 찾기','바뀐 역할 함께 확인하기','다른 의견을 솔직하게 나누기'] },
  { id:'teamwork-difference', category:'협업·동료 존중', file:'04-teamwork.pdf', title:'다른 의견도 함께 풀기', pages:[99,100],
    evidence:'윈-윈 갈등관리 활동에서 각자의 관심사, 공통점과 차이점, 이해의 정확성을 확인하는 절차를 바탕으로 구성했어요.',
    items:['내가 원하는 점 적기','상대가 원하는 점 물어보기','서로 동의하는 점 찾기','의견이 다른 부분 정리하기','이해한 상대 뜻 확인하기'] },
  { id:'ethics-greeting', category:'직장 관계·예절', file:'05-work-ethics.pdf', title:'작은 인사로 여는 하루', pages:[56,57],
    evidence:'상황에 맞는 예절을 논의하는 활동과 정중하고 진실한 인사, 전화·방문 예절에 관한 내용을 바탕으로 구성했어요.',
    items:['동료에게 정중히 인사하기','방에 들어가기 전 노크하기','전화할 때 예의 갖추기','상황에 맞는 인사법 확인하기','헷갈리는 직장예절 물어보기'] },
  { id:'ethics-respect', category:'직장 관계·예절', file:'05-work-ethics.pdf', title:'존중이 전해지는 말', pages:[58,59],
    evidence:'온라인 글의 오해 가능성, 사생활 보호, 개인의 다양성 존중과 비하·강요를 삼가는 원칙을 바탕으로 구성했어요.',
    items:['메시지에 오해할 표현 살피기','동료의 사생활 존중하기','다른 가치관 인정하기','비하하는 표현 고쳐 쓰기','개인 선택을 강요하지 않기'] },
  { id:'ethics-responsibility', category:'직장 관계·예절', file:'05-work-ethics.pdf', title:'책임과 배려 챙기기', pages:[45,48,60],
    evidence:'봉사와 책임의식, 규칙 준수, 인간 존중이라는 공동체윤리의 원칙을 업무 실천으로 바꾼 활동이에요.',
    items:['오늘 맡은 역할 확인하기','맡은 업무 이행 여부 점검하기','업무에 적용할 규칙 확인하기','동료를 도울 일 찾아보기','상대 권리를 배려했는지 돌아보기'] },
  { id:'remote-workspace', category:'근무·재택 수칙', file:'06-remote-work.pdf', title:'집에서도 일할 준비 끝', pages:[41],
    evidence:'독립된 업무공간과 업무 특성에 필요한 PC·네트워크·화상회의 장비·업무 솔루션을 준비하는 내용을 바탕으로 구성했어요.',
    items:['업무에 집중할 공간 정하기','업무용 컴퓨터 점검하기','네트워크 연결 확인하기','회의에 필요한 장비 확인하기','회사 업무도구 접속 확인하기'] },
  { id:'remote-communication', category:'근무·재택 수칙', file:'06-remote-work.pdf', title:'떨어져 있어도 한 팀', pages:[42],
    evidence:'연락방법 사전 결정, 근무형태별 계획, 관리자와 마감·보고주기 합의, 문자화된 업무지시를 바탕으로 구성했어요.',
    items:['긴급 연락 방법 확인하기','재택에 맞는 업무계획 세우기','업무 마감일 함께 확인하기','중간보고 시기 정하기','바뀐 업무지시 글로 확인하기'] },
  { id:'remote-security', category:'근무·재택 수칙', file:'06-remote-work.pdf', title:'업무 자료 안전하게', pages:[41,43],
    evidence:'업무공간 확보와 가족의 기밀자료 접근 차단, 문서의 안전한 처리, 사무공간·컴퓨터 잠금에 관한 내용을 바탕으로 구성했어요.',
    items:['자료가 노출될 위치 살피기','가족의 업무자료 접근 막기','자리 비울 때 컴퓨터 잠그기','업무공간 잠금 상태 확인하기','종이 자료 안전하게 처리하기'] },
  { id:'supplies-sort', category:'공용 공간·비품 관리', file:'07-supplies.pdf', title:'찾기 쉬운 비품 정리', pages:[77,81,82],
    evidence:'미사용 물품의 활용 계획을 세우고 사용품·보관품을 나누며 같은 종류와 유사한 물품을 분류하는 활동을 바탕으로 구성했어요.',
    items:['계속 쓸 물품 구분하기','보관할 물품 따로 나누기','같은 종류끼리 모으기','비슷한 물품 가까이 두기','미사용 물품 활용 계획 적기'] },
  { id:'supplies-store', category:'공용 공간·비품 관리', file:'07-supplies.pdf', title:'꺼내 쓰기 편한 자리', pages:[82,83],
    evidence:'물품의 재질·무게·부피에 맞는 장소를 정하고 자주 사용하는 물품을 접근하기 쉬운 위치에 두는 보관 원칙을 바탕으로 구성했어요.',
    items:['물품 재질에 맞는 자리 찾기','깨지기 쉬운 물품 따로 두기','무게와 부피에 맞게 보관하기','자주 쓸 물품 가까이 두기','사용한 물품 제자리에 두기'] },
  { id:'supplies-community', category:'공용 공간·비품 관리', file:'07-work-ethics.pdf', title:'함께 쓰는 공간의 약속', pages:[45,60],
    evidence:'공동체윤리의 책임·규칙 준수·타인 배려 원칙을 공용 공간과 비품 사용 상황에 적용한 학습 활동이에요.',
    items:['공용 공간 사용 규칙 확인하기','비품 사용 약속 지키기','다음 사용자를 배려하기','함께 관리할 역할 확인하기','동료를 도울 정리 일 찾기'] },
];

export type LinkedMaterial = { title: string; category: string | null; url: string | null };
const normalized = (value: string | null) => (value || '').replace(/\s/g, '');
export function linkedPdfRows(sources: LinkedMaterial[], supabaseUrl: string): Row[] {
  const origin = new URL(supabaseUrl).origin;
  return materialChecklists.flatMap(checklist => {
    const expected = `${origin}/storage/v1/object/public/genz-materials/${checklist.file}`;
    const source = sources.find(candidate => candidate.url === expected && normalized(candidate.category) === normalized(checklist.category));
    if (!source) return [];
    return [{
      id: `pdf:${checklist.id}`, category: source.category, title: checklist.title,
      item1: checklist.items[0], item2: checklist.items[1], item3: checklist.items[2], item4: checklist.items[3], item5: checklist.items[4],
      source_url: expected, source_title: source.title, source_pages: checklist.pages, source_evidence: checklist.evidence,
    }];
  });
}
