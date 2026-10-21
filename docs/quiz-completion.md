# 퀴즈 완료 화면과 AI 팀장 연결

완료 화면은 기존 상단 제목·주제 목차 아래에 책을 읽는 펜 캐릭터와 실제 정답 수/문제 수를 표시합니다. ‘틀린 문제 다시 풀기’와 ‘AI 팀장 시뮬레이션’ 두 버튼을 나란히 배치하고, 별도 전체 다시 풀기 버튼은 제거했습니다. 오답 버튼은 이번 응시의 오답 ID만 새 복습 응시로 넘기며, 만점이면 ‘틀린 문제가 없어요!’ 안내로 대체합니다.

두 버튼 아래에는 ‘잘 이해한 내용’과 ‘한 번 더 확인할 내용’ 카드를 배치합니다. 검토된 실제 문제의 세부 항목과 제출 답안을 사용하고, 혼합 정오답은 일부 이해 상태로 안내합니다. 카드에는 항목명을 표시하며 설명·복습 펼침 영역·재응시 변화 영역은 제거했습니다. 데이터 부족 안내는 유지합니다. 좁은 화면에서는 카드가 세로로 배치되고 내용이 늘면 높이도 늘어납니다. 저장 상태 문구와 실패 내역은 화면에서 숨겼으며 실제 자동 저장·재전송·내부 실패 보관은 유지합니다.

- 독립 `/quiz` 화면: `/web/simulation.html`로 바로 이동합니다.
- 사무실 팝업의 퀴즈: 동일 출처의 부모에 `genz-quiz:simulation` 메시지를 보내 기존 모니터 선택 동작을 사용합니다. 부모는 출처와 현재 콘텐츠 iframe의 `source`를 모두 확인합니다. 기존 사무실 배경에서 AI 팀장 팝업으로 전환하고 모니터 이용 기록도 남깁니다.
- 기존 학습 기록 기능은 `/learning`에서 계속 사용할 수 있습니다. 완료 화면의 해당 버튼만 AI 팀장 연결로 교체했습니다.

현재 체크아웃에는 사무실 모니터가 가리키던 `/web/sos.html?view=sim`의 파일이 없었습니다. `origin/frontend`의 시뮬레이션 JS·CSS·삽화·시뮬레이션 API를 재사용하고, 필요한 공통 도구와 공개된 `ai_scenarios`만 읽는 좁은 조회 API를 연결했습니다. 상담 채팅 기능과 구분된 `/web/simulation.html`을 제공하며 사무실 모니터도 같은 경로를 사용합니다. 브랜치 전체나 다른 테이블 API는 가져오지 않았습니다.

시나리오는 Supabase `ai_scenarios`의 `status='완료'` 데이터만 사용합니다. AI 대화에는 서버 환경 변수 `OPENAI_API_KEY`가 필요합니다. 이 키를 `NEXT_PUBLIC_*` 변수에 넣으면 안 됩니다. 선택적으로 `OPENAI_MODEL`, 서명 키 `AI_SESSION_SECRET`을 사용할 수 있으며 기존 시뮬레이션 API의 설정 방식을 그대로 따릅니다. 키가 없으면 실제 AI 답변을 흉내 내지 않고 연결 설정 안내를 표시합니다. `.env.local`은 수정하지 않았습니다.

검증: 프로덕션 빌드·타입 검사·대상 ESLint·기존 33개 테스트 통과. `/quiz`, `/web/simulation.html`, 시뮬레이션 JS/CSS/그림, `/api/ai_scenarios`의 HTTP 200과 잘못된 시뮬레이션 API 요청의 HTTP 400을 확인했습니다. 현재 공개 시나리오 조회는 0건입니다. 시나리오 데이터·공개 상태·RLS를 확인해야 하며, 서버 키도 없어 실제 AI 대화 호출은 검증하지 않았습니다.

## 캐릭터 자산

- 파일: `public/quiz/assets/pen-reading.png` (1024×1536 RGBA, 투명 배경)
- 생성 방식: built-in imagegen, 기존 `pen-sky.png`를 참조한 새 파일. 기존 자산은 유지합니다.
- 최종 프롬프트:

> Use case: identity-preserve. Asset type: transparent mascot illustration for the completion screen of GEN Z QUIZ. Edit target is the attached existing sky-blue anthropomorphic pen mascot. Preserve its recognizable sky blue pen body, navy thick outlines, orange side clip, cream face panel, cute dot eyes and smile, white gloves, gold nib, and orange sneakers. Change the pose so the pen stands calmly facing forward holding and reading an open small cream-colored book with both gloved hands at chest/waist level, with a warm encouraging smile. Match a friendly clean Korean educational app illustration: crisp navy outlines and soft restrained shading. Show full body including hat/cap and shoes, comfortably centered, with two small cyan sparkle accents and a subtle light-gray oval ground shadow. The whole background must be genuinely transparent alpha, no dark glow, no rectangular backdrop, no text, no labels, no UI. Only the reading pen mascot and tiny accents. Do not recreate the entire quiz screenshot. Output a clean production PNG asset.
