# 팀 전달: PDF → 젠지표류기 학습 UI

이 코드는 기존 Next.js + 정적 HTML 프로젝트에 연결된 첫 버전입니다. 별도의 디자인 작업 없이 기존 학습 컴포넌트를 사용합니다.

## 실행

Node.js 20 이상 권장. 프로젝트 루트에서 `npm install` 후 `.env.local`에 설정합니다.

```dotenv
OPENAI_API_KEY=발급받은_키
OPENAI_MANUAL_MODEL=gpt-4.1-mini
```

기존 Supabase 환경변수는 유지하세요. 새 PDF 변환 API 자체는 Supabase를 사용하지 않습니다.
API 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. `.env.local`을 공유하거나 Git에 추가하지 마세요.
PDF 입력과 Structured Outputs를 지원하는 모델을 사용해야 합니다.

```powershell
npm run dev
```

`http://localhost:3000/web/home.html#manual-upload` → PDF 선택 → 학습 챕터 만들기.
10MB 이하, 1~30쪽, 암호로 보호되지 않은 PDF를 지원합니다.

## 팀이 복사해야 할 파일

- `src/app/api/manuals/convert/route.ts`: multipart 파일 수신·크기 제한·PDF 검증·AI 요청·응답 검증
- `src/lib/manual-conversion.ts`: 데이터 계약(JSON Schema), 서버 검증, 생성 지침
- `public/web/js/manual-upload.js`: 파일 전송·대기/오류 처리·생성 결과를 CHAPTERS에 연결
- `public/web/js/components/manual-learning.js`: 핵심 가이드·상황 게임 렌더링
- `public/web/js/chapter.js`: 가이드/게임 탭과 출처 표시, 동적 챕터 지원
- `public/web/js/components/util.js`, `quiz.js`: localOnly 데이터 렌더링
- `public/web/home.html`: 업로드 버튼과 스크립트 로딩 순서
- `public/web/css/home.css`, `components.css`: 업로드와 학습 UI 스타일
- `package.json`, `package-lock.json`: pdf-lib 의존성

같은 프로젝트 기반인 팀원은 이 파일들을 병합합니다. 다른 프로젝트라면 필요한 DOM ID와 스크립트 순서를 함께 맞춰야 합니다.
샘플용 manual-sample.js와 넷플릭스 PDF는 자동 변환의 필수 파일이 아닙니다. 샘플 링크를 유지할 때만 필요합니다.

## 처리 방식

1. 브라우저가 multipart `file` 필드로 PDF를 POST `/api/manuals/convert`에 전송합니다.
2. 서버는 파일 바이트 수, PDF 헤더, 파싱 가능 여부, 암호화 여부, 실제 페이지 수를 검사합니다.
3. PDF를 Base64 `input_file`로 OpenAI Responses API에 전달합니다. PDF의 텍스트와 페이지 이미지는 OpenAI에서 분석합니다. 이 코드가 별도로 텍스트를 추출하거나 OCR하는 것은 아닙니다.
4. JSON Schema로 `title`, `description`, `guide`, `adventure`, `quiz`, `checklist`를 생성합니다. 서버에서 필수 필드·길이·배열 수·정답 범위·페이지 범위를 다시 검증합니다.
5. 브라우저는 이를 기존 CHAPTERS 형식에 맞추고 `localOnly: true`로 기존 컴포넌트에 전달합니다.
6. 원문 보기 링크는 선택한 PDF의 브라우저 Blob URL을 사용합니다. 업로드 파일을 public 폴더에 복사하지 않습니다.

## 현재 범위와 한계

- 한 번에 문서의 핵심 주제 하나를 한 챕터로 생성합니다. 전체 매뉴얼의 모든 규정을 학습 자료로 빠짐없이 옮기는 기능은 아닙니다.
- 결과는 현재 탭 메모리에만 있고 새로고침하면 사라집니다. 최신 생성 챕터 하나를 유지합니다.
- 서버·Supabase에 PDF나 결과를 영구 저장하지 않습니다. OpenAI에는 PDF가 전송되며 `store: false`는 API 응답 저장 설정입니다. 외부 처리·보존 정책 전체를 없애는 설정이 아닙니다.
- 페이지 번호의 범위는 검증하지만 실제 문장과 근거 페이지의 의미 일치는 사람이 확인해야 합니다. 학습용 예시는 회사의 추가 규정이 아닙니다.
- 손상·암호화 PDF는 거절합니다. 스캔 PDF의 읽기 정확도는 실제 모델 테스트가 필요합니다.
- 로그인·사용자별 접근 권한·사용량 제한은 아직 없습니다. 현재 범위는 팀의 로컬 시연용입니다.
- 배포 플랫폼의 업로드 용량/실행시간 제한은 별도 확인이 필요합니다. API 처리 제한은 150초, 브라우저 대기는 180초입니다.

## 확인

```powershell
node --test tests/manual-conversion.test.cjs
npm run lint
npm run build
```

자동 테스트는 OpenAI를 모의 처리하므로 실제 API 호출 성공이나 콘텐츠 정확성을 보장하지 않습니다.
공식 방식 참고: https://developers.openai.com/api/docs/guides/file-inputs
