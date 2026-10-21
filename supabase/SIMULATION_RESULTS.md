# AI 팀장 시뮬레이션 결과 저장 (simulation_attempts)

AI 팀장 시뮬레이션에서 사용자가 대화를 마치고 평가를 받으면, 그 결과를 Supabase에 한 줄씩 저장하려고 합니다.
코드는 준비돼 있고, **Supabase에 테이블만 만들어 주시면** 바로 저장되기 시작합니다.

## 해 주실 일 (1번만)

1. Supabase 대시보드 → **SQL Editor**에서 아래 두 파일을 **순서대로** 붙여넣고 실행해 주세요.
   1. [`migrations/202610200003_simulation_attempts.sql`](migrations/202610200003_simulation_attempts.sql): 새 테이블 `public.simulation_attempts`, 인덱스 2개, 읽기 정책 1개
   2. [`migrations/202610200004_simulation_learning_path.sql`](migrations/202610200004_simulation_learning_path.sql): 학습 경로 열 3개, 인덱스 1개, 비교용 뷰 `simulation_path_compare`
   - **기존 테이블은 건드리지 않습니다.** 둘 다 여러 번 실행해도 안전하게 작성했습니다.
   - 1번을 이미 실행했다면 2번만 실행하면 됩니다. (2번이 없으면 저장이 실패하니 꼭 둘 다 필요해요)
2. 끝입니다. 추가 설정은 필요 없습니다.
   - 사용자 구분은 SOS 상담 · 퀴즈와 같은 **익명 로그인 사용자**(`auth.users`)를 씁니다. 익명 로그인은 이미 켜져 있는 설정을 그대로 사용합니다.
   - 서버 저장에는 이미 `.env.local`에 있는 `SUPABASE_SECRET_KEY`를 씁니다.

## 저장 방식

- 저장은 **서버(`/api/simulation`)만** 합니다. 점수는 서버의 AI 평가가 만든 값이라, 브라우저가 직접 넣거나 고칠 수 없게 insert · update · delete 권한을 막아 두었습니다.
- 브라우저(익명 사용자)는 **자기 기록만 읽을 수** 있습니다 (RLS: `user_id = auth.uid()`).
- 대화 원문은 저장하지 않습니다. 점수 · 피드백과, "이렇게 말하면 더 좋아요"의 바탕이 된 사용자 답변 한 줄만 저장합니다.
- 테이블이 없거나 저장에 실패해도 사용자 화면은 그대로 동작합니다 (저장만 건너뜀).

## 저장되는 값

| 열 | 내용 |
| --- | --- |
| `user_id` | 익명 사용자 ID |
| `scenario_id` · `scenario_title` · `category` | 연습한 상황 (예: `proc-01`, 업무 절차&기준) |
| `personality_key` · `personality_label` | 팀장 성격 (`calm` · `direct` · `busy` · `meticulous` · `custom`) |
| `attempt` | 몇 번째 시도인지 (2 이상 = 다시 답변하기) |
| `turns` | 사용자가 답한 횟수 (최대 5) |
| `learning_path` | 시작 전에 같은 카테고리를 어떻게 공부했는지: `tutorial`(카드뉴스 → 퀴즈 → AI, 튜토리얼대로) · `quiz_then_cardnews` · `cardnews_only` · `quiz_only` · `direct`(바로 AI 시뮬레이션) |
| `cardnews_completed_at` · `quiz_completed_at` | 그 카테고리의 카드뉴스 · 퀴즈를 마친 시각 (이 브라우저 기록 기준, 없으면 null) |
| `situation_score` · `response_score` · `followup_score` | 상황 파악 · 대응 방식 · 후속 행동 (각 1~5) |
| `total_score` · `previous_total` | 총점(15점 만점), 다시 답변했을 때 이전 총점 |
| `strengths` · `missed_points` | 잘한 점 · 놓친 부분 (JSON 배열) |
| `original_response` · `improved_response` · `comparison` | 고칠 답변 한 줄 · 개선 예시 · 이전 시도와 비교 |
| `fallback` | AI 평가 형식이 깨져 기본 안내로 대신했는지 |
| `created_at` | 저장 시각 |

## 확인용 쿼리

```sql
-- 튜토리얼대로 했을 때 vs 바로 했을 때: 같은 상황(지문)끼리만, 첫 시도 기준
select scenario_title, learning_path, attempts, avg_total, avg_situation, avg_response, avg_followup
from public.simulation_path_compare order by category, scenario_title, learning_path;

-- 두 경로가 모두 있는 상황만 나란히
select scenario_title,
  max(avg_total) filter (where learning_path = 'tutorial') as 튜토리얼대로,
  max(avg_total) filter (where learning_path = 'direct')   as 바로_시뮬레이션,
  sum(attempts) as 전체_횟수
from public.simulation_path_compare group by scenario_title
having count(*) filter (where learning_path in ('tutorial', 'direct')) = 2;
```

```sql
-- 최근 저장된 결과
select created_at, scenario_title, personality_label, attempt, total_score
from public.simulation_attempts order by created_at desc limit 20;

-- 상황별 평균 점수
select category, scenario_title, count(*) as 횟수, round(avg(total_score), 1) as 평균
from public.simulation_attempts where not fallback
group by category, scenario_title order by category, scenario_title;
```
