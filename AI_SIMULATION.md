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

사무실 화면(`/intro/index.html`)의 모니터를 누르면 `/web/sos.html?view=sim`이 열립니다.
첫 화면에 상황 21개가 크기가 제각각인 칩으로 나열됩니다(퀴즈 결과 화면의 AI 팀장 버튼으로 오면 `localStorage['genz_sim_from_quiz']`로 그 퀴즈 주제의 상황 3개를 맨 위에 먼저 보여 줌) → 상황 설명 + 추천 팀장 → **추천 팀장으로 시작 / 팀장 바꾸기 / 직접 설정** 순서입니다.
팀장과 3~5번 주고받으면 팀장이 대화를 마무리하고(먼저 **대화 끝내고 피드백 받기**를 눌러도 됨), 상황 파악 · 대응 방식 · 후속 행동(각 5점, 총 15점)과 잘한 점 · 놓친 부분 · 이렇게 말하면 더 좋아요가 표시됩니다.
결과 화면에서 **다시 답변해보기**(같은 상황 · 같은 팀장, 이전 시도와 비교) · **같은 상황 다시하기** · **다른 상황 선택**을 고를 수 있습니다.

| 무엇 | 위치 |
| --- | --- |
| 상황 21개 (공개 상황 · 팀장만 아는 사실 · 학습 포인트 · 평가 기준 · 연결된 퀴즈 개념) | `src/lib/simulation/scenarios.ts` |
| 팀장 성격 (차분한 · 직설적인 · 바쁜 · 꼼꼼한, 직접 입력 해석 · 금지 성격) | `src/lib/simulation/personalities.ts` |
| API (GET 목록, POST start · chat · evaluate) | `src/app/api/simulation/route.ts` |
| 화면 | `public/web/js/simulation.js`, 스타일 `public/web/css/chat.css` · `public/web/sos.html`(.theme-sim) |

- 팀장만 아는 사실(facts)과 평가 기준은 서버 코드에만 있고 브라우저로 보내지 않습니다. 팀장 성격은 말투만 바꾸고 사실 · 마감 · 범위 · 평가 기준은 바꾸지 않습니다.
- 직접 입력한 팀장 설명은 시작할 때 한 번 AI가 성격 특성(tone · warmth · patience · work_standard · followup_style)으로 해석하고, 그 결과를 서명된 세션에 넣어 매 턴 같은 성격을 씁니다. 욕설 · 모욕 · 차별 · 인격 비하 · 위협 · 규칙 변경 요청은 거절합니다.
- 대화 응답은 `{askedFacts, reply, shouldEnd, usedTwist}`, 평가는 3개 기준 점수 + strengths · missedPoints · improvedResponse JSON 스키마로 받고, 형식이 깨지면 기본 안내(되묻기 / 학습 포인트)로 대신합니다.
- 퀴즈(`src/app/quiz/page.tsx`)는 풀이가 끝나면 틀린 문제의 concept 키를 브라우저 `localStorage['genz_quiz_weak']`에 주제별로 저장하고, 시뮬레이션은 같은 concept(`quizConcepts`)를 가진 상황에 **추천**을 붙입니다.
- 답변 1,000자, 대화 5턴, 세션 4시간까지입니다. 대화 · 세션 · 다시 답변하기 정보는 서버 키로 서명해 브라우저 메모리에만 두며 암호화되지는 않습니다 (Supabase에 저장하지 않음).
- 대화는 OpenAI API에 `store: false`로 전송됩니다. 별도 로그인/사용량 제한은 없으므로 공개 서비스라면 사용량 통제가 추가로 필요합니다.

확인 명령:

```powershell
npm run build
npm run lint
node --check public/web/js/simulation.js
node --test tests/simulation.test.cjs
```

자동 테스트는 외부 API를 모의 처리하고 21개 상황 구성, 사실 비공개, 성격 고정 · 금지 성격 거절, 구조화 응답 · fallback, 다시 답변하기 비교, 변조 차단, 오류를 확인합니다. 실제 OpenAI 호출 성공을 의미하지 않습니다.
OpenAI 연결은 공식 [텍스트 생성 문서](https://developers.openai.com/api/docs/guides/text)의 Responses API 방식으로 구현했습니다.
