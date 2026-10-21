-- AI 팀장 시뮬레이션 결과에 '학습 경로' 추가: 튜토리얼대로(카드뉴스 → 퀴즈 → AI 시뮬레이션) 왔는지, 바로 왔는지
-- 202610200003_simulation_attempts.sql 다음에 실행 (여러 번 실행해도 안전)
alter table public.simulation_attempts
  add column if not exists learning_path text not null default 'direct',
  add column if not exists cardnews_completed_at timestamptz,   -- 시작 시점에 같은 카테고리 카드뉴스를 마친 시각 (없으면 null)
  add column if not exists quiz_completed_at timestamptz;       -- 시작 시점에 같은 카테고리 퀴즈를 마친 시각 (없으면 null)

alter table public.simulation_attempts drop constraint if exists simulation_attempts_learning_path_check;
alter table public.simulation_attempts add constraint simulation_attempts_learning_path_check
  check (learning_path in ('tutorial', 'quiz_then_cardnews', 'cardnews_only', 'quiz_only', 'direct'));

create index if not exists simulation_attempts_scenario_path on public.simulation_attempts (scenario_id, learning_path);

-- 같은 상황(지문)끼리만 비교: 상황 × 학습 경로별 첫 시도 평균 (다시 답변하기는 빼고)
create or replace view public.simulation_path_compare with (security_invoker = true) as
select scenario_id, scenario_title, category, learning_path,
  count(*) as attempts,
  round(avg(total_score), 1) as avg_total,
  round(avg(situation_score), 1) as avg_situation,
  round(avg(response_score), 1) as avg_response,
  round(avg(followup_score), 1) as avg_followup
from public.simulation_attempts
where attempt = 1 and not fallback and total_score is not null
group by scenario_id, scenario_title, category, learning_path;
