# 카드뉴스 콘텐츠 컴포넌트

이 브랜치(`content`)는 신입사원 치명적 실수 TOP 3 카드뉴스를 개발합니다.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에 접속하면 카드뉴스 컴포넌트만 표시됩니다.

## 구성

- ‘직장에서 통하는 의사소통’: 웹 텍스트 카드 5장 + 전·후 자기진단 + 상황형 퀴즈 5문항. 기존 콘텐츠를 유지하며 질문/소통과 협업 카테고리에 등록했습니다.
- 신규 콘텐츠·문항 편집과 출처 확인 사항은 [docs/COMMUNICATION_CONTENT.md](docs/COMMUNICATION_CONTENT.md)에 정리했습니다.

- TOP 3 카드 3장과 원문보기 카드 1장
- 1080 × 1350px 기준, 세로 4:5
- Pretendard 로컬 폰트, #fdf9f2 베이지 배경
- 세 카드 하단에 동일한 전구 아이콘 팁 박스
- 카드 내부 하단 점 표시, 외부 이전·다음 버튼
- 출처 문구와 이미지 저장 버튼은 표시하지 않음

## 파일

- `public/web/js/components/cardnews.js`: 카드 렌더링 및 슬라이드 동작
- `public/web/js/components/cardnews-preview.js`: 컴포넌트 등록 및 단독 화면 연결
- `public/web/js/components/util.js`: DOM 생성 공통 도구
- `public/web/js/data/articles.js`: 원문 기사 데이터
- `public/web/css/cardnews-preview.css`: 단독 실행 화면 스타일
- `public/web/css/components.css`: 컴포넌트 스타일
- `public/web/assets/picture/*-beige.png`: 삽화
- `public/web/assets/fonts/`: Pretendard 파일 및 라이선스

## 카테고리 필터
- 공통 ID·명칭: `public/web/js/data/cardnews-categories.js` (7개 원칙).
- 콘텐츠 단위 연결: `public/web/js/data/cardnews-contents.js`의 `categoryIds` 배열. 기사 원래 분류는 유지합니다.
- TOP 3 콘텐츠는 사용자 지정에 따라 직장 예절·근무 수칙 두 카테고리에 연결했습니다. `categoryEvidence`에 근거를 기록했습니다.
- 카테고리가 없으면 전체에서만 표시하며, 필터 변경 시 첫 슬라이드부터 표시합니다.
- 필터는 Tab/Enter/Space와 방향키/Home/End로 조작합니다. 방향키는 초점만 이동합니다.

## 첫 출근 적응 가이드
- 기존 a0 기사를 별도 콘텐츠 first-day-guide로 추가했습니다. 기존 TOP 3는 유지합니다.
- 원문 본문을 확인하고 경청·질문 / 동료 존중 / 재택·비품 관리 3장과 원문 안내 1장으로 요약했습니다. 순위·퍼센트는 사용하지 않습니다.
- categoryIds는 communication, collaboration, etiquette, work-rules, shared-resources입니다.
- 삽화: public/web/assets/picture/first-day-guide-scenes.png. 렌더러: public/web/js/components/first-day-cardnews.js.

## 자기평가 학습 흐름

- 완료 화면의 ‘퀴즈 풀러 가기’ 버튼은 `learning.quizUrl`을 지정하면 해당 주소로 이동합니다. 미연결 상태에서는 준비 중 안내를 표시합니다. SPA에서는 `cardnews:quiz-request` 이벤트의 `detail.contentId`를 받고 `preventDefault()`로 기본 동작을 대체할 수 있습니다.
- 모든 콘텐츠는 학습 전 자기평가 → 내용 3장·실천 요약·원문 안내(5장) → 학습 후 자기평가 → 완료 순서로 진행합니다. 기존 원문 링크는 유지합니다.
- 카드뉴스 데이터의 learning에서 goal, preQuestion, postQuestion, version, recap을 설정합니다. 전·후 질문은 같은 목표를 기준으로 작성합니다.
- 응답은 1~5 숫자이며 브라우저 localStorage의 genz:cardnews-learning:v1:<콘텐츠 ID>에 preResponse/postResponse, 질문·목표·버전, 시작·완료 시각과 함께 저장합니다. 서버 전송은 없습니다.
- 콘텐츠를 다시 열면 자기평가부터 새로 시작하며 시작 버튼을 누르면 해당 ID의 최신 시도만 갱신합니다. 저장이 차단되면 현재 페이지 메모리에 보관하고 안내합니다.

- Pre-learning self-assessment now uses a horizontal 1-5 agreement scale. Clicking a number saves preResponse and immediately opens slide 1; no start button. Endpoint labels range from disagreement to strong agreement. Post-learning selection and completion/quiz flow are unchanged.

- Both assessments use matching chick/cream popups over the dimmed content and one-click 1-5 scales. Each submitted assessment contributes 50%: before response 0%, after prompt 50%, completion 100%. No gauge is shown while reading slides. Post selection immediately saves postResponse and opens completion with the existing quiz button.
