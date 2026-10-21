// Editable educational copy. Examples and questions are authored learning scenarios.
const COMMUNICATION_CONTENT = {
  id:'workplace-communication',title:'직장에서 통하는 의사소통',type:'communicationGuide',
  primaryCategoryId:'collaboration',secondaryCategoryIds:[],
  categoryIds:['collaboration'],
  learning:{version:1,goal:'업무 조건을 확인하고 사실·해석을 구분하며 공동 이해를 만드는 소통',
    preQuestion:'나는 업무 조건을 확인하고, 사실과 해석을 구분하며 이해한 내용을 재확인할 수 있다.',
    postQuestion:'나는 업무 조건 확인, 사실과 해석 구분, 공동 이해를 위한 재확인 방법을 설명할 수 있다.'},
  sources:[{name:'NCS 의사소통능력 자료 · 하위능력 분류 확인',url:'https://ncs.go.kr/th03/TH0302List.do?dirSeq=121'}],
  sourceNote:'사용자 제공 인포그래픽 5장 기반 재구성. 이미지 제작자·원출처와 인물 인용은 미확인. 사례와 퀴즈는 학습용 창작입니다.',
  slides:[
    {title:'업무 지시 확인',message:'전달보다 중요한 건 서로의 이해',
      blocks:[
        {kind:'example',label:'학습용 예시',text:'“내일 회의 자료를 간단히 준비해요.” 요청자는 고객 설명용 요약본을, 담당자는 내부 검토용 상세본을 떠올렸어요. 제출 시점도 서로 달랐어요.'},
        {label:'목적',text:'누가, 어디에 쓰는 자료인지 확인해요.'},
        {label:'결과물',text:'형식·분량·꼭 담을 내용을 맞춰요.'},
        {label:'기한',text:'언제까지 누구에게 전달할지 정해요.'},
      ],takeaway:'“고객 설명용 요약본을 회의 전에 드리면 될까요?”처럼 이해한 내용을 확인해요.'},
    {title:'의사소통의 기본',message:'다섯 가지 능력을 함께 써요',
      blocks:[
        {kind:'skill',label:'문서이해능력',text:'문서의 요구와 조건을 읽어요. 예: 메일에서 요청 결과물·기한·제출 형식을 구분하기.'},
        {kind:'skill',label:'문서작성능력',text:'목적에 맞게 내용을 정리해 써요. 예: 합의한 업무 조건을 메일로 남기기.'},
        {kind:'skill',label:'경청능력',text:'상대의 말과 의도를 집중해 들어요. 예: 설명을 끝까지 듣고 필요한 조건 묻기.'},
        {kind:'skill',label:'의사표현능력',text:'생각과 요청을 명확하게 말해요. 예: 작업 목적과 필요한 지원을 구체적으로 설명하기.'},
        {kind:'skill',label:'기초외국어능력',text:'업무에 필요한 외국어를 이해하고 표현해요. 예: 외국어 메일의 일정·조건을 확인하기.'},
      ],takeaway:'업무 예시는 학습용입니다. 메일을 읽고, 질문하고, 합의 내용을 적는 과정이 연결돼요.'},
    {title:'오해를 줄이는 소통',message:'사실과 해석을 구분해요',
      blocks:[
        {kind:'example',label:'학습용 예시',text:'동료가 “표의 근거를 더 보여주세요”라고 했어요. 담당자는 “나를 못 믿는구나”라고 받아들였어요.'},
        {label:'확인된 사실',text:'표에 근거를 추가해 달라는 수정 요청을 받았어요.'},
        {label:'내가 더한 해석',text:'상대가 나를 불신한다는 생각은 아직 확인되지 않았어요.'},
        {kind:'action',label:'수정 대상과 기준 질문하기',text:'“어느 항목에 어떤 근거가 필요할까요?”라고 묻고, 필요한 자료와 수정 범위를 확인해요.'},
      ],takeaway:'요청의 대상·기준부터 확인하면 선입견에 따른 오해를 줄일 수 있어요.'},
    {title:'소통의 실천',message:'쉽게 전하고 같은 이해를 만들어요',
      blocks:[
        {label:'쉬운 표현 + 구체적인 기준',text:'“적당히” 대신 결과물의 형식·범위·기한을 밝혀요.'},
        {label:'이해한 내용 요약',text:'목적·할 일·기한을 내 말로 정리한 뒤 맞는지 물어요.'},
        {label:'적극적 경청 + 조건 질문',text:'설명을 끝까지 듣고 빠진 조건과 필요한 지원을 확인해요.'},
        {kind:'action',label:'상황에 맞는 채널',text:'급하면 통화·대화로 먼저 확인해요. 복잡하면 함께 설명하고 질문해요. 기록이 필요하면 합의 내용을 메일·공유 문서에 남겨요.'},
      ],takeaway:'학습용 예시: 긴급한 일정 변경은 먼저 통화로 맞춘 뒤 변경 내용을 문서로 공유해요.'},
    {title:'핵심 요약과 자기 진단',message:'보냈는지보다, 같은 내용을 이해했는지 확인하세요.',
      blocks:[
        {label:'목적·결과물·기한',text:'요청의 목적, 원하는 결과물, 제출 시점을 맞췄나요?'},
        {label:'사실과 해석',text:'확인된 요청과 내가 추측한 의도를 구분했나요?'},
        {label:'공동 이해 재확인',text:'각자가 이해한 역할·조건·기한을 요약해 맞췄나요?'},
        {label:'상황에 맞는 채널',text:'긴급성·복잡성·기록 필요성을 함께 고려했나요?'},
      ],takeaway:'학습 후 상태를 확인한 뒤 상황형 퀴즈로 적용해 보세요.'},
  ],

};
