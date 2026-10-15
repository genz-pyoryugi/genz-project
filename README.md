# 젠지표류기 카드뉴스 콘텐츠

`content` 브랜치는 가로형 교육 카드뉴스 7개와 학습 전·후 자기진단을 제공합니다. 현재는 콘텐츠의 로컬 미리보기이며 전체 자동화나 외부 퀴즈 연결이 완료된 상태는 아닙니다.

## 실행

```bash
npm install
npm run dev
```

기본 주소는 http://localhost:3000 이며 사용 중이면 개발 서버가 안내하는 포트를 사용합니다. 루트 화면은 `/web/home.html`로 연결됩니다. 배포용 확인은 `npm run build`로 실행합니다.

## 콘텐츠

| 카드뉴스 | 카테고리 | 구성 문서 |
| --- | --- | --- |
| 의사소통능력 · 직장에서 함께 이해하기 | 협업 & 동료 존중 | [원고](docs/NEWSLETTER_CONTENT.md) |
| 함께 일하는 대인관계능력 | 직장 관계 & 예절 | [원고](docs/INTERPERSONAL_CONTENT.md) |
| 원칙을 지키는 직업윤리 | 업무 절차 & 기준 | [원고](docs/WORK_ETHICS_CONTENT.md) |
| 신입사원 첫 출근, 첫 단추 잘 끼우기 | 조직 이해·적응 | [원고](docs/FIRST_DAY_ADAPTATION_CONTENT.md) |
| 메일과 메신저, 업무에 맞게 함께 쓰기 | 질문 & 소통 | [원고](docs/EMAIL_MESSENGER_CONTENT.md) |
| 재택근무, 일과 소통의 기준 세우기 | 근무 & 재택 수칙 | [원고](docs/REMOTE_WORK_CONTENT.md) |
| 함께 쓰는 공간과 비품, 다음 사람까지 생각하기 | 공용 공간 & 비품 관리 | [원고](docs/SHARED_RESOURCES_CONTENT.md) |

각 콘텐츠는 내용 5장입니다. 삭제 요청된 세로형 TOP 3·첫 출근·의사소통 카드 3개는 등록 목록에서 제거했습니다. 과거 렌더러와 원본 자산 일부는 참고용으로 남아 있습니다.

## 디자인과 편집

- PC 카드 1200×675px, 왼쪽 이미지 513×523px. Pretendard, 베이지 `#fdf9f2`, 딥블루 강조.
- 상단 라벨 → 메인카피 → 개념·사례 박스 → 설명 항목 → 강조 박스 → 전체 하단 핵심 정리와 탐색 순서입니다.
- 이미지와 본문·아이콘·버튼은 개별 웹 요소입니다. 새 삽화의 제작·수정 내역은 `public/web/assets/picture/*.md`에 기록합니다.
- 원문 링크를 제공한 콘텐츠만 5장에 ‘원문보기’를 표시합니다. 버튼 높이는 상단 라벨과 같습니다.
- 공용 관리 1장은 금화 삭제와 회전 초침, 2장은 오른쪽 분류 박스의 흑백 전환, 3장은 첫 체크 이후 순차 체크 모션을 사용합니다. 동작 줄이기 설정을 지원합니다.
- 기준은 [뉴스레터 템플릿](docs/NEWSLETTER_TEMPLATE.md)을 따릅니다. [세로형 기록](docs/CARDNEWS_TEMPLATE.md)과 혼용하지 않습니다.

## 주요 파일

- `public/web/js/data/*-content.js`: 콘텐츠 원고·질문·이미지·카테고리. 각 모듈이 `CARDNEWS_CONTENTS`에 등록합니다.
- `public/web/js/data/cardnews-categories.js`: 기존 7개 카테고리 ID와 명칭.
- `public/web/js/components/newsletter-cardnews.js`: 공통 가로형 렌더러·탐색·이미지 모션 레이어.
- `public/web/js/components/cardnews-learning.js`: 전·후 자기진단과 완료 화면.
- `public/web/js/components/cardnews-preview.js`: 카테고리 필터와 콘텐츠 목록.
- `public/web/css/newsletter-cardnews.css`: 가로형 템플릿과 모션.
- `public/web/css/cardnews-preview.css`: 필터와 자기진단 공통 스타일.
- `public/web/assets/fonts/`: Pretendard 파일과 라이선스.

## 학습 흐름과 저장

학습 전 자기진단 → 내용 5장 → 마지막 ‘다음’ 클릭 → 학습 후 자기진단 → 완료 화면입니다. 전·후 모달은 병아리와 블랙 75% 딤을 사용합니다. 첫 응답 후 진행률 50%, 두 번째 응답 후 100%이며 자기진단에 정답·오답은 없습니다.

응답 1~5와 질문·학습 목표·버전·시각은 `genz:cardnews-learning:v1:<콘텐츠 ID>`에 콘텐츠별로 저장합니다. 서버 전송은 없고 저장이 차단되면 페이지 메모리와 안내를 사용합니다. 다시 시작하면 해당 콘텐츠의 최신 응답을 갱신합니다.

‘퀴즈 풀러 가기’ 이후의 내부 퀴즈·채점·해설·결과 코드는 제거했습니다. 버튼은 `cardnews:quiz-request` 이벤트의 `detail.contentId`로 대상 ID를 전달할 뿐 화면을 전환하지 않습니다. 별도 폴더의 퀴즈 주소·수신 처리는 아직 설정하지 않았습니다.

카테고리는 콘텐츠별 ID로 필터링하며 ‘전체’에서도 모두 표시합니다. 필터 변경 시 첫 화면부터 시작합니다. 키보드와 이전·다음·페이지 점을 지원합니다.
