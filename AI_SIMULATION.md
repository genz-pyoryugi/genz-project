# AI팀장 실행 안내

프로젝트 루트 `genz-project/.env.local`에 기존 Supabase 설정을 유지하고 아래 값을 추가하세요.

```dotenv
OPENAI_API_KEY=발급받은_OpenAI_API_키
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL`은 선택 사항입니다. 미설정 시 `gpt-4.1-mini`를 사용합니다.
선택 사항인 `AI_SESSION_SECRET`에 긴 임의 문자열을 설정하면 대화 서명 키를 API 키와 분리할 수 있습니다.
모두 서버 전용 변수입니다. `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
`.env.local`은 기존 `.gitignore`의 `.env*` 규칙으로 제외됩니다. 배포 시에는 호스팅 서비스의 서버 환경변수에 설정하세요.
환경변수 변경 후 서버를 재시작하세요.

```powershell
cd genz-project
npm run dev
```

브라우저에서 `http://localhost:3000/web/home.html`을 열고 오른쪽 아래 상담소 책 → 시뮬레이션 → 팀장 성격 → 카테고리 → 상황을 선택하세요.
상황과 첫 질문을 확인하고 답변을 보내면 AI팀장과 대화할 수 있습니다.
한 번 이상 답변한 뒤 **대화 종료 및 평가**를 누르면 잘한 점, 개선할 점, 추천 표현이 표시됩니다.
입력은 2,000자, 대화는 20회, 세션은 4시간까지입니다. 종료 평가 후 같은 상황을 다시 연습할 수 있습니다.
요청 실패 시 답변 입력은 유지되며 보내기 또는 평가를 다시 누를 수 있습니다.

목록은 기존 `/api/ai_scenarios`가 `status = '완료'`인 행만 조회합니다.
대화 API `/api/simulation`은 서버에서 완료된 시나리오와 평가 기준을 다시 조회합니다.
서명된 세션으로 상황 ID, 팀장 성격, 이전 대화의 변조를 검증합니다. 세션은 암호화되지 않았으며 브라우저 메모리에만 보관합니다.
사용자 발화는 낮은 우선순위의 user 메시지로 전달하고 고정된 역할·평가 기준은 서버 instructions에 둡니다.
프롬프트 방어는 모델의 지침 준수에 의존하므로 API 키 설정 후 역할 변경 요청을 포함한 실제 모델 테스트도 수행하세요.
대화는 OpenAI API에 전송되며 `store: false`로 요청합니다. Supabase에 대화를 저장하지 않습니다.
현재 별도의 로그인/사용자별 과금 제한은 없으므로 공개 서비스의 사용량 통제는 추가 작업이 필요합니다.

확인 명령:

```powershell
npm run build
npm run lint
node --check public/web/js/simulation.js
node --test tests/simulation.test.cjs
```

자동 테스트는 외부 API를 모의 처리하고 대화 이력, 평가, 변조 차단, 오류를 확인합니다. 실제 OpenAI 호출 성공을 의미하지 않습니다.
OpenAI 연결은 공식 [텍스트 생성 문서](https://developers.openai.com/api/docs/guides/text)의 Responses API 방식으로 구현했습니다.
