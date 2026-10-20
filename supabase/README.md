# 완료 기록 Supabase 설정

## 개인 체크리스트 추가 (2026-10-20)

개인 목록을 사용하려면 [개인 체크리스트 마이그레이션](./migrations/202610200001_personal_checklists.sql)을 기존 프로젝트 SQL Editor에서 한 번 적용합니다. 이 변경은 기존 테이블을 수정하거나 삭제하지 않습니다. **현재 연결된 프로젝트에는 사용자 적용 후 실제 저장·복원과 사용자 격리 검증을 완료했습니다(2026-10-20).**

- 기존 `browserSupabase` / `ensureChecklistUser`의 익명 세션을 재사용합니다. 새 로그인 방식이나 서비스 역할 키를 추가하지 않습니다.
- `personal_checklists`는 제목, UUID가 있는 항목과 완료 상태, `pinned`, 정규화된 `position`, `revision`, 삭제 시각을 저장합니다. 기본 완료 기록과 별도 테이블입니다.
- 모든 조회·변경은 소유자 조건을 포함합니다. DB의 강제 RLS와 네 가지 정책이 실제 JWT의 `auth.uid()`를 검증합니다. `anon` 역할은 접근할 수 없습니다.
- 수정은 읽었던 `revision`과 일치할 때만 적용하고, DB 트리거가 버전을 증가시킵니다. 오래된 편집은 오류를 표시하고 초안을 유지합니다. 다시 불러온 뒤 편집 취소 → 편집으로 최신 목록을 열 수 있습니다.
- 책상에서 떼기는 `pinned=false`만 저장합니다. 항목과 마지막 위치가 보존됩니다. 체크리스트 삭제는 `deleted_at`을 설정하고 책상에서도 제거합니다.
- 개인 데이터는 기존 공용 localStorage 메모에 복제하지 않습니다. 정적 책상은 같은 출처의 `/checklist/desk-sync` 프레임을 통해 동일한 인증·저장 코드를 사용합니다. 프레임 메시지는 출처와 창을 함께 검사합니다. 변경은 BroadcastChannel로 같은 브라우저의 열린 화면에 알려집니다.
- 제목·항목 편집은 저장 버튼으로 확정하며, 저장된 목록의 완료 체크·책상 배치·위치 변경은 즉시 서버에 반영합니다. 실패 시 오류를 표시하고 서버 저장 성공으로 처리하지 않습니다.
- 익명 인증 세션만 유지하면 목록·완료 상태·책상 배치·위치는 브라우저의 체크리스트 캐시 없이 복원됩니다. 익명 인증 데이터 자체를 삭제하거나 다른 기기를 쓰면 기존 사용자로 돌아갈 수 없는 점은 기존과 같습니다.

검증: `node --test tests/personal-checklists-rls.test.cjs`는 실제 로컬 PostgreSQL 엔진에서 마이그레이션·사용자 격리·JSON 제약·버전 충돌을 검사합니다. `node tests/personal-checklists-ui.cjs`는 Auth와 REST를 모의한 격리 브라우저에서 생성, 편집, 체크, 실패와 재시도, 책상 연결, 드래그, 새로고침, 재접속, 떼기, 재부착, 삭제를 검사합니다. 기본 주소는 `http://localhost:3000`입니다. 이 검사는 원격 DB 검증을 대신하지 않습니다.

실제 Supabase 최종 검증: `node tests/verify-personal-live.cjs`. 외부 네트워크 접근이 가능한 환경에서 로컬 개발 서버를 실행한 뒤 명시적으로 실행합니다. 모의 응답 없이 실제 앱 화면과 `personalStore`를 사용합니다. 격리된 익명 사용자 두 명으로 생성·제목/항목 수정·항목 추가/삭제·완료 체크·내 기록 재열기·새로고침 세션 유지·책상 부착·드래그 위치 저장/복원·책상에서 완료 체크·떼기·삭제를 확인합니다. 실제 RLS의 타인 SELECT/INSERT/UPDATE/DELETE 및 소유권 이전 거부, 버전 충돌 거부도 검사합니다. 2026-10-20 전 항목 통과했고 검증용 목록 두 개는 소유자 세션으로 정리했습니다. 키·토큰·사용자 세션은 출력하거나 파일로 저장하지 않습니다.

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
