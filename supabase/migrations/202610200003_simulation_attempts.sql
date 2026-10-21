-- AI 팀장 시뮬레이션 결과 (한 번 평가할 때마다 한 줄)
-- 저장은 서버(/api/simulation, SUPABASE_SECRET_KEY)만 한다: 점수는 서버의 AI 평가가 만든 값이라 브라우저가 직접 넣거나 고칠 수 없게
-- 브라우저(익명 로그인 사용자)는 자기 기록만 읽을 수 있다. 대화 원문은 저장하지 않는다.
create table if not exists public.simulation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,  -- 퀴즈 · SOS 와 같은 Supabase 익명 사용자
  scenario_id text not null,                 -- 예: proc-01 (src/lib/simulation/scenarios.ts)
  scenario_title text not null,
  category text not null,                    -- 예: 업무 절차&기준
  personality_key text not null,             -- calm · direct · busy · meticulous · custom
  personality_label text not null,           -- 예: 바쁜 팀장 / 직접 입력해 해석한 이름
  attempt smallint not null default 1,       -- 2 이상 = 다시 답변하기
  turns smallint not null,                   -- 사용자가 답한 횟수 (최대 5)
  situation_score smallint check (situation_score between 1 and 5),   -- 상황 파악 (평가 실패 시 null)
  response_score smallint check (response_score between 1 and 5),     -- 대응 방식
  followup_score smallint check (followup_score between 1 and 5),     -- 후속 행동
  total_score smallint check (total_score between 3 and 15),
  previous_total smallint check (previous_total between 3 and 15),    -- 다시 답변했을 때 이전 시도 총점
  strengths jsonb not null default '[]'::jsonb,       -- 잘한 점
  missed_points jsonb not null default '[]'::jsonb,   -- 놓친 부분
  original_response text,                    -- '이렇게 말하면 더 좋아요'의 바탕이 된 사용자 답변 한 줄
  improved_response text,
  comparison text,                           -- 이전 시도와 비교
  fallback boolean not null default false,   -- AI 평가 형식이 깨져 기본 안내로 대신한 경우
  created_at timestamptz not null default now()
);

create index if not exists simulation_attempts_user_created on public.simulation_attempts (user_id, created_at desc);
create index if not exists simulation_attempts_scenario on public.simulation_attempts (scenario_id);

alter table public.simulation_attempts enable row level security;

-- 읽기: 자기 기록만. 쓰기 정책은 만들지 않는다 (service role 인 서버만 insert)
drop policy if exists "simulation_attempts_select_own" on public.simulation_attempts;
create policy "simulation_attempts_select_own" on public.simulation_attempts
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.simulation_attempts from anon, authenticated;
grant select on public.simulation_attempts to authenticated;
