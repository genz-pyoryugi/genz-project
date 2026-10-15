# 회사 생활 체크리스트

실행: 프로젝트 루트에서 `npm run dev`, `http://localhost:3000/checklist`.

## 기존 코드에서 확인한 데이터 계약

`frontend`의 `public/web/js/components/checklist.js`, `components/util.js`, `data/chapters.js`, `src/app/api/[table]/route.ts`를 읽고 재사용했습니다. 전체 브랜치를 병합하지 않았습니다. 기존 첫 화면 유지를 위해 `frontend`의 `src/app/page.tsx`와 `public/intro/`만 원본 그대로 복사했습니다.

- 테이블: `checklists`
- 조회 필드: `id,category,title,item1,item2,item3,item4,item5,description,source_url`
- 필터: `status = 완료`
- 정렬: `id` 오름차순, 항목은 `item1`부터 `item5` 순서
- 분류: 기존과 같이 category의 공백을 제거한 문자열끼리 비교
- 주제 순서: 첫인상 & 대면 → 업무 커뮤니케이션 → 회의 & 응대 → 오피스 룰 → 근태 & 이직·퇴사 → 경조사 → 업무 보고 & 실수 대처
- 제목·항목은 API 결과 그대로 표시. 빈 항목만 기존 기준대로 제외. 예시 항목으로 대체하지 않음.

`/api/checklists`는 확인된 기존 API의 체크리스트 조회만 가져온 읽기 전용 경로입니다. `src/lib/supabase.ts`와 `.env.local`은 변경하지 않았습니다. 키는 로그·문서에 기록하지 않았고 `.env.local`은 Git 제외 설정을 유지합니다.

## 브라우저 저장

`localStorage` 키 `genz-checklist-page-v1`. 행 ID, 항목 필드, 원문으로 항목을 식별해 탭과 목록 순서에 영향받지 않습니다. 기존 구형 페이지의 배열 저장 방식과 충돌하지 않습니다. 데이터베이스에는 쓰지 않습니다. 저장이 제한되거나 저장 데이터를 읽지 못하면 안내를 표시합니다. 다른 탭의 storage 이벤트도 반영합니다.

## 디자인

`public/checklist/assets/office-background.png`, `mascot.png`, `coworkers.png`는 첨부 이미지를 참고해 built-in ImageGen으로 제작했습니다. 배경에는 종이·문구를 넣지 않았으며, 캐릭터 이미지에도 글씨가 없습니다. 종이, 핀, 제목, 탭, 소제목, 항목, 진행률은 화면 요소입니다. 프롬프트 요지는 ‘첨부 디자인의 남색 사무실 파티션과 책상만, 체크박스 캐릭터만, 환영하는 동료 두 명만 각각 재현하며 모든 글씨·종이를 제거’입니다.

## 확인 결과 (2026-10-12)

- 실제 API HTTP 200, 7개 주제 각각 3개 그룹·15개 항목: 총 21그룹·105항목.
- Headless Edge에서 모든 주제의 제목·항목을 API 데이터와 정확히 대조, 배열 순서 일치.
- 체크 후 새로고침 유지, 진행률·완료 개수, 100% 완료 버튼, 키보드 탭 이동 확인.
- 데스크톱 1440px와 모바일 390px 화면 확인, 가로 넘침 없음, 종이 내부 스크롤 확인.
- 로딩·빈 결과·502 오류·재시도 경로는 브라우저 테스트에서만 응답을 제어해 검증. 실제 데이터는 변경하지 않음.
- 새 페이지 ESLint 및 별도 TypeScript 검사 통과. 데이터 변경 요청과 브라우저 런타임 오류 없음.
- 개발 서버 실행 및 페이지 검증을 완료했으며 전체 프로덕션 빌드는 별도로 검증하지 않음.
- 커밋·푸시하지 않음. 기존 로컬 `public/learning`, `team-handoff`, 기타 미추적 파일은 보존.
