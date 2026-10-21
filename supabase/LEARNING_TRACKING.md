# 학습 기록(익명 이용 기록 · 퀴즈 결과) 설정 안내

기존 `quizzes` 테이블과 데이터는 건드리지 않습니다. 새 테이블은 모두 `lt_` 로 시작합니다.

## 1. 한 번만 하는 설정 (Supabase 관리 화면)

1. **Authentication → Sign In / Providers → Anonymous Sign-Ins** 를 켭니다. (회원가입 화면 없이 방문자를 구분하는 기능입니다.)
2. **SQL Editor** 에서 `supabase/migrations/202610160001_learning_tracking.sql` 전체를 붙여넣고 Run. (한 번만 실행)
3. 테스트용 임시 문제가 필요하면 `supabase/seed_test_quiz.sql` 도 같은 방법으로 실행합니다.
4. 사이트 폴더에 `.env.local` 파일을 만들고 아래 두 줄을 넣습니다 (값은 **Project Settings → API**).
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   `service_role` / `secret` 키는 **절대** 넣지 않습니다. 배포 환경(Vercel 등)에도 같은 두 변수를 등록하세요.
5. `npm run dev` 후 `/intro/index.html`에서 사무실 물건을 눌러보고 `/quiz`에서 풀어보세요.

## 1-1. 기존 `quizzes` 테이블의 새 퀴즈 가져오기 (복수 선택·O/X 지원)

1. `supabase/migrations/202610160002_multi_choice_and_listing.sql` 실행 (한 번만)
2. `supabase/import_quizzes_table.sql` 실행 (한 번만) — `quizzes` 의 `status='완료'` 행을 주제(category)별 퀴즈 revision 1로 복사하고, 테스트용 임시 퀴즈는 사이트 목록에서 숨깁니다. `quizzes` 테이블은 수정하지 않습니다.
3. 문제를 고친 뒤 다시 반영하려면 import 파일의 `revision 1` 을 2로 바꿔서 실행합니다 (이전 기록은 유지됩니다).

## 2. 실제 문제 넣기

문제와 퀴즈는 **버전**으로 저장됩니다. 한번 공개(`published = true`)된 퀴즈·문제는 수정·삭제가 막혀 있어서 이전 응시 기록이 섞이지 않습니다. 고치려면 `revision` 을 올려 새 버전을 만드세요. 사이트는 퀴즈마다 **가장 높은 공개 revision** 을 보여줍니다. 퀴즈 하나가 화면의 주제 탭 하나입니다.

```sql
begin;
with qv as (
  insert into public.lt_quiz_versions(quiz_key, revision, title, is_test, published)
  values ('first-impression', 1, '첫인상 & 대면', false, false) returning id
), q as (
  insert into public.lt_question_versions(question_key, revision, kind, prompt, options, correct_option, explanation) values
  ('first-impression-q1', 1, 'single_choice', '문제 내용',
   '[{"id":"a","text":"선택지 1"},{"id":"b","text":"선택지 2"}]', 'b', '해설')
  returning id, question_key
)
insert into public.lt_quiz_items(quiz_version_id, question_version_id, position)
select qv.id, q.id, row_number() over (order by q.question_key) from qv, q;
update public.lt_quiz_versions set published = true where quiz_key = 'first-impression' and revision = 1;
commit;
```

- 선택지는 2~8개, 각 `id` 는 문제 안에서 겹치지 않게 (`a`,`b`,…). `correct_option` 은 그중 하나.
- 문제를 고칠 때: 같은 `question_key` 로 `revision = 2` 문제를 새로 넣고, 새 퀴즈 `revision = 2` 에 연결해 공개합니다. 이전 revision 의 응시 기록은 그대로 남습니다.
- 테스트 퀴즈(`is_test = true`)의 기록은 분석 쿼리에서 `not is_test` 로 제외하세요. 테스트 퀴즈는 삭제하지 않아도 되며, 실제 퀴즈는 다른 `quiz_key` 로 만들면 사이트에 함께 표시되므로 실제 문제를 모두 넣은 뒤에는 테스트 퀴즈를 목록에서 빼는 방법을 따로 안내드리겠습니다.

## 3. 기록 확인 방법 (관리자 페이지 없이)

Supabase 대시보드 → **SQL Editor** (관리자 권한으로 실행되므로 방문자 기록 전체를 볼 수 있습니다) 또는 **Table Editor** 에서 `lt_*` 테이블/뷰를 엽니다.

```sql
-- 응시별 결과 (같은 quiz_key + revision 끼리만 비교하세요)
select * from public.lt_attempt_report where not is_test order by started_at desc;

-- 카드뉴스를 먼저 본 사람 vs 사무실을 먼저 둘러본 사람의 평균 점수
select first_area, count(*) as attempts, round(avg(correct_count::numeric / nullif(question_count,0)), 2) as correct_rate
from public.lt_attempt_report
where completed and not is_test and quiz_key = 'first-impression' and revision = 1
group by first_area;

-- 같은 방문자의 첫 응시 vs 재응시
select is_first_attempt, count(*) as attempts, round(avg(correct_count::numeric / nullif(question_count,0)), 2) as correct_rate
from public.lt_attempt_report
where completed and not is_test and quiz_key = 'first-impression' and revision = 1
group by is_first_attempt;

-- 방문별 이용 순서와 첫 버튼
select * from public.lt_visit_paths order by started_at desc;
-- 원본 이벤트 / 문항별 답안
select * from public.lt_events order by occurred_at desc limit 200;
select * from public.lt_answer_report order by submitted_at desc limit 200;
```

`first_choice` 는 첫 화면(사무실)에서 처음 누른 물건 이름입니다: `files`(카드뉴스) · `radio` · `postit` · `calendar` · `phone` · `monitor` · `notebook` · `pen`(퀴즈).

## 4. 저장 구조 요약

| 테이블 | 내용 |
|---|---|
| `lt_quiz_versions` / `lt_question_versions` / `lt_quiz_items` | 퀴즈·문제·선택지·정답·해설 (버전 고정) |
| `lt_visits` | 방문 회차(방문자 단위), 처음 누른 버튼 |
| `lt_events` | 사무실/카드뉴스(열기·마지막 장)/퀴즈 이용 순서와 시각 |
| `lt_attempts` | 응시 1회 = 1행 (푼 수·정답·오답·점수·시작/완료 시각) |
| `lt_answers` | 응시별·문제별 제출 답안과 정답 여부 (서버가 채점) |

- 방문자는 `lt_ingest` 함수로만 기록을 남길 수 있고, 테이블에 직접 쓸 수 없습니다. 자기 기록만 읽을 수 있습니다(RLS).
- 같은 이벤트 ID 로 다시 보내도 중복 저장되지 않고, 전송 실패 시 브라우저에 보관했다가 자동 재시도합니다.
- 카드뉴스 화면이 준비되면 열 때 `window.genzTracker.record('cardnews_opened')`, 마지막 장에서 `window.genzTracker.record('cardnews_last_slide')` 를 호출하면 됩니다.
