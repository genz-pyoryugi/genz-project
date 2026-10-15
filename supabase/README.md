# 완료 기록 Supabase 설정

## 현재 구조

- 자료 목록은 기존 `contents`, `categories`, `checklists` 조회 API를 그대로 사용합니다.
- 완료 기록은 브라우저 전용 Supabase Auth 클라이언트로 **익명 로그인**한 다음 `public.checklist_completions`에 직접 저장합니다. 서버 공용 클라이언트에는 사용자 세션을 넣지 않습니다.
- 익명 사용자도 Supabase의 `authenticated` 역할을 사용합니다. 사용자 구분은 임의 브라우저 ID가 아닌 JWT의 `auth.uid()`로 합니다.
- 로그인 화면은 없습니다. 같은 브라우저의 세션을 재사용하고 자동 갱신합니다. 브라우저 데이터를 지우거나 다른 기기를 사용하면 기존 익명 사용자로 돌아갈 수 없습니다.
- 공개 키만 브라우저에서 사용합니다. 서비스 역할 키를 `NEXT_PUBLIC_` 환경 변수에 넣으면 안 됩니다.

## 실제 프로젝트에 적용

코드 파일 추가만으로 원격 데이터베이스가 변경되지는 않습니다.

1. Supabase Auth 설정에서 **Allow anonymous sign-ins**를 활성화합니다. 2026-10-15 읽기 전용 점검에서는 이미 활성화되어 있었습니다.
2. 연결된 Supabase 관리 도구로 [마이그레이션](./migrations/202610150001_checklist_completions.sql)을 적용하거나, 프로젝트 SQL Editor에서 해당 SQL 전체를 실행합니다. 기존 테이블을 삭제하는 SQL은 없습니다. 이미 적용된 마이그레이션은 다시 실행하지 않습니다.
3. `checklist_completions`에 RLS가 활성화됐는지, 사용자별 SELECT/INSERT/UPDATE/DELETE 정책 4개가 적용됐는지 확인합니다. 공개 `anon` 역할에는 접근 권한을 부여하지 않습니다.
4. 서로 다른 브라우저 프로필로 저장·조회·삭제를 확인하고, 다른 사용자의 `user_id`를 지정한 직접 요청이 거부되는지 실제 프로젝트에서도 확인합니다.

테이블이 없거나 인증·네트워크 요청이 실패하면 저장 성공 문구를 표시하지 않습니다. 기록 창과 시트에서 오류 및 재연결 버튼을 제공합니다. 클라우드 저장 실패를 localStorage 저장 성공으로 대체하지 않습니다.

## 기존 기록 이전과 삭제

- 기존 `genz-checklist-completions-v1`은 읽기만 하고 삭제하거나 덮어쓰지 않습니다. 체크 상태와 책상에 붙인 메모는 기존 브라우저 저장 방식을 유지합니다.
- 기록 창의 **기존 기록 서버로 이전**을 눌렀을 때만 현재 익명 사용자에게 이전합니다. 익명 사용자가 바뀌면 기존 기록을 자동으로 이전하지 않습니다.
- 기록 ID의 SHA-256과 `user_id`를 복합 기본 키로 사용합니다. 기존 ID가 긴 JSON이어도 인덱스 크기 제한에 걸리지 않습니다. SQL 제약으로 해시 일치도 확인합니다.
- 50개씩 이전하며 충돌 기록은 건너뜁니다. 각 묶음의 서버 반영을 확인한 뒤 진행합니다. 중간 실패 후 재시도해도 중복되지 않습니다.
- 앱 삭제는 `deleted_at`을 설정하는 논리 삭제입니다. 목록에서 즉시 제외하고 실행 취소를 지원합니다. 삭제 표시를 남겨 두므로 원본을 다시 이전해도 삭제 기록이 되살아나지 않습니다. 명시적으로 같은 미션을 다시 저장하면 복원할 수 있습니다.
- 테이블에 물리 DELETE를 수행할 권한도 소유자에게만 있습니다. DB에서 물리 삭제한 뒤 원본을 다시 이전하면 새로 추가될 수 있습니다.
- 원본 localStorage와 책상에 붙인 스냅샷은 서버 기록 삭제와 별도로 유지됩니다.

## 검증

```powershell
npx tsc --noEmit --incremental false
node --test tests/completions.test.cjs tests/pdf-checklists.test.cjs tests/desk-notes.test.cjs
```

로컬 PostgreSQL 엔진의 실제 RLS 검증 (원격 DB 검증과 구별):

```powershell
npm install --prefix .tools/browser --no-save @electric-sql/pglite
node --test tests/completions-rls.test.cjs
```

격리된 Playwright 브라우저 검증 (Auth와 REST 응답을 모의하므로 실제 사용자·기록을 만들지 않음):

```powershell
npm install --prefix .tools/browser playwright
npx --prefix .tools/browser playwright install chromium
node tests/completions-cloud-ui.cjs
node tests/completions-delete-ui.cjs
node tests/checklist-ui.cjs
node tests/desk-notes-ui.cjs
```

개발 서버 기본 주소는 `http://localhost:3002`이며 `CHECKLIST_TEST_URL`로 변경할 수 있습니다.
