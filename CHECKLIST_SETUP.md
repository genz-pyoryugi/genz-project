# PDF 체크리스트 연결

로컬 운영 화면: http://localhost:3001/checklist-admin

1. 프로젝트 루트의 `.env.local`에 `OPENAI_API_KEY`와 `SUPABASE_SECRET_KEY`를 설정합니다. Supabase 조회 설정과 로컬 관리용 토큰은 설치 시 기존 설정을 바탕으로 준비됩니다. 실제 키를 채팅, GitHub, NEXT_PUBLIC 변수에 넣지 마세요.
2. `npm install` 후 `npm run dev:checklists`를 실행합니다. 개발 서버는 이 컴퓨터의 127.0.0.1에만 연결됩니다.
3. 화면에서 실제 `categories` 목차와 `contents`의 PDF를 선택합니다. 원본 PDF를 열어 본문 페이지 범위(최대 20쪽)를 고릅니다.
4. 초안을 생성하면 PDF의 선택한 부분이 OpenAI로 전송됩니다. 원문과 근거 페이지를 대조하고 문구를 수정한 뒤 확인 체크를 하고 저장합니다.
5. 기존 `checklists` 테이블에 `category,title,item1..item5,description,source_url,status` 형식으로 저장됩니다. 검토 후 저장한 행의 status는 기존 학습 화면의 조회 조건인 `완료`입니다. 기존 수동 체크리스트와 다른 자료는 삭제하지 않습니다.

같은 자료 ID와 같은 페이지 범위로 다시 저장하면 이 도구가 만든 기존 행만 갱신합니다. 다른 페이지 범위는 별도 체크리스트로 저장합니다. 단일 로컬 서버에서 같은 범위의 동시 저장을 막습니다. 여러 서버로 확장할 때는 별도 생성 ID 열과 DB UNIQUE 제약이 필요합니다.

현재 공개 PDF 9개를 선택할 수 있습니다. 뉴스는 원본 링크로 보관하며 이 기능은 PDF 원문을 분석합니다. 기사 원문 수집 기능은 추가하지 않았습니다. `05-work-ethics.pdf`와 `07-work-ethics.pdf`는 같은 내용이지만 두 목차에 각각 연결됩니다.

프론트엔드 연동 시 기존 7개 옛 목차 문자열(첫인상 & 대면 등)을 그대로 필터링하면 새 목차의 체크리스트가 표시되지 않습니다. 이 관리 화면은 categories에서 현재 목차를 읽어 저장 결과까지 보여줍니다. 별도 frontend 브랜치도 같은 categories.name을 사용하도록 연결해야 합니다.

관리 화면과 생성/저장 API는 로컬 운영용입니다. 공개 배포에서 바로 사용할 수 없도록 호스트와 관리용 토큰을 검사합니다. 공개 운영 전 관리자 인증과 DB 수준의 중복 방지 및 사용량 제한을 추가하세요.

모델은 기존 SOS 코드의 기본값인 gpt-4.1-mini를 따릅니다. OPENAI_CHECKLIST_MODEL로 변경할 수 있으며 PDF 입력과 Structured Outputs를 지원해야 합니다. PDF 페이지 번호는 원본 PDF 뷰어 기준이며 모델의 근거 요약이 원문 의미와 일치하는지는 사람이 검토해야 합니다.

검증: `npm run test:checklists`, `npx tsc --noEmit`, `npm run lint`.
테스트는 가짜 AI 응답과 가짜 DB로 PDF 발췌, 결과 검증, 저장/중복 갱신 흐름을 검사하며 실제 API 사용료가 발생하지 않습니다.

공식 API 문서:
- https://developers.openai.com/api/docs/guides/file-inputs
- https://developers.openai.com/api/docs/guides/structured-outputs

## ??? ?? (2026-10-15)

- ??? ????? ?? ?? ??? 11?? ?? ??? ESLint ??? ??????. ???? AI?DB ??? ????? ?? ?? ???? DB ??? ???? ????.
- ?? backend ???? ??? ??? ??? ???? Next.js ???? ??(next build --webpack)? TypeScript ??? ??????.
- ?? npm run lint?? ?? src/app/community-test/page.tsx? react-hooks/set-state-in-effect ?? 1?? ?? ????. ?? ??? ?? SOS API? ???? ?????.
- ??? ??? ?? ???? ?? ??????. GitHub ???? ?? ??? ??? ??? ???? ????.
