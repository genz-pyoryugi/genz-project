-- Initial setup: run once in the Supabase SQL Editor.
-- Creates quiz tables, access policies, grading function and nine original questions.
-- Schema and seed are applied in one transaction.
begin;

create table public.calendar_quiz_questions (
  id text primary key,
  chapter integer not null check (chapter between 0 and 2),
  position integer not null check (position >= 0),
  version integer not null default 1 check (version > 0),
  quiz text not null check (length(quiz) > 0),
  answer boolean not null,
  explanation text not null,
  source text not null,
  active boolean not null default true,
  unique (chapter, position)
);

create table public.calendar_quiz_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter integer not null check (chapter between 0 and 2),
  submitted_responses jsonb not null,
  answers jsonb not null,
  score integer not null,
  total integer not null check (total > 0),
  completed_at timestamptz not null default now(),
  check (score between 0 and total)
);
create index calendar_quiz_attempts_user_date on public.calendar_quiz_attempts(user_id, completed_at desc);

alter table public.calendar_quiz_questions enable row level security;
alter table public.calendar_quiz_attempts enable row level security;
revoke all on public.calendar_quiz_questions from public, anon, authenticated;
revoke all on public.calendar_quiz_attempts from public, anon, authenticated;
grant select on public.calendar_quiz_questions to anon, authenticated;
grant select on public.calendar_quiz_attempts to authenticated;
create policy calendar_questions_read on public.calendar_quiz_questions
  for select to anon, authenticated using (active);
create policy calendar_attempts_read_own on public.calendar_quiz_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.calendar_quiz_increment_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;
revoke all on function public.calendar_quiz_increment_version() from public, anon, authenticated;
create trigger calendar_quiz_version before update on public.calendar_quiz_questions
  for each row execute function public.calendar_quiz_increment_version();

-- The client sends choices only. Identity, grade and question snapshots are server-owned.
create function public.submit_calendar_quiz(p_attempt_id uuid, p_chapter integer, p_responses jsonb)
returns public.calendar_quiz_attempts
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_existing public.calendar_quiz_attempts;
  v_result public.calendar_quiz_attempts;
  v_count integer;
  v_score integer;
  v_answers jsonb;
begin
  if v_user is null then raise exception 'Login required' using errcode = '42501'; end if;
  if p_attempt_id is null or p_chapter is null or p_chapter not between 0 and 2 then
    raise exception 'Invalid attempt';
  end if;
  -- Serialize retries, including a retry racing the original request after a timeout.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_attempt_id::text, 0));
  select * into v_existing from public.calendar_quiz_attempts where id = p_attempt_id;
  if found then
    if v_existing.user_id <> v_user or v_existing.chapter <> p_chapter
      or v_existing.submitted_responses is distinct from p_responses then
      raise exception 'Attempt does not match' using errcode = '42501';
    end if;
    return v_existing;
  end if;
  if p_responses is null or pg_catalog.jsonb_typeof(p_responses) <> 'array' then
    raise exception 'Invalid answers';
  end if;
  -- Lock the full active chapter so edits cannot change the grade part way through.
  perform 1 from public.calendar_quiz_questions where chapter = p_chapter and active for share;
  select count(*) into v_count from public.calendar_quiz_questions where chapter = p_chapter and active;
  if v_count = 0 or pg_catalog.jsonb_array_length(p_responses) <> v_count then
    raise exception 'Submit every question in this chapter';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_responses) r
    where pg_catalog.jsonb_typeof(r) <> 'object'
      or pg_catalog.jsonb_typeof(r->'question_id') is distinct from 'string'
      or pg_catalog.jsonb_typeof(r->'version') is distinct from 'number'
      or pg_catalog.jsonb_typeof(r->'selected') is distinct from 'boolean'
  ) then raise exception 'Invalid answer format'; end if;
  if (select count(distinct r->>'question_id') from pg_catalog.jsonb_array_elements(p_responses) r) <> v_count then
    raise exception 'Duplicate questions';
  end if;
  if (select count(*) from pg_catalog.jsonb_array_elements(p_responses) r
    join public.calendar_quiz_questions q on q.id = r->>'question_id'
      and pg_catalog.to_jsonb(q.version) = r->'version'
    where q.chapter = p_chapter and q.active) <> v_count then
    raise exception 'Questions changed; reload and try again';
  end if;
  select count(*) filter (where (r->>'selected')::boolean = q.answer),
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'question_id', q.id, 'version', q.version, 'quiz', q.quiz,
      'selected', (r->>'selected')::boolean, 'correct', q.answer,
      'explanation', q.explanation, 'source', q.source
    ) order by q.position)
  into v_score, v_answers
  from pg_catalog.jsonb_array_elements(p_responses) r
  join public.calendar_quiz_questions q on q.id = r->>'question_id'
  where q.chapter = p_chapter and q.active;
  insert into public.calendar_quiz_attempts(id, user_id, chapter, submitted_responses, answers, score, total)
    values (p_attempt_id, v_user, p_chapter, p_responses, v_answers, v_score, v_count)
    returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.submit_calendar_quiz(uuid, integer, jsonb) from public, anon;
grant execute on function public.submit_calendar_quiz(uuid, integer, jsonb) to authenticated;

insert into public.calendar_quiz_questions (id, chapter, position, quiz, answer, explanation, source) values
('arrival', 0, 0, 'PDF의 00:00 표시는 모든 회사의 확정 출근 시각이다.', false, '출퇴근 시각은 회사가 사업장 상황에 맞게 정하는 빈칸입니다. 법정 시간 기준과 구분해야 합니다.', '일반 근로자용 제22~23조, 제25~28조'),
('break', 0, 1, '휴게시간은 근로자가 자유롭게 이용할 수 있어야 한다.', true, '제24조 작성 시 착안사항은 근로 도중 휴게를 주고 근로자가 자유롭게 이용하도록 규정할 필요가 있다고 설명합니다.', '일반 근로자용 제24조, 제31조'),
('night', 0, 2, '오후 9시에 일하면 그 시간은 PDF의 야간근로에 해당한다.', false, '제29조의 야간근로는 오후 10시부터 다음 날 오전 6시까지의 근로입니다.', '일반 근로자용 제29~30조'),
('holiday', 1, 0, '주휴일은 반드시 일요일이어야 한다.', false, '제32조 착안사항은 사업장 사정에 따라 근로자별·그룹별 다른 요일을 정할 수 있다고 설명합니다.', '일반 근로자용 제32조'),
('leave', 1, 1, '입사 1년 미만이면 연차유급휴가가 전혀 없다.', false, '제33조는 1년 미만 근로자에게 1개월 개근 시 1일의 유급휴가를 부여합니다.', '일반 근로자용 제33~37조'),
('care', 1, 2, '표준안의 본인 결혼휴가 5일은 모든 회사의 법정 의무이다.', false, '제38조는 회사 사정에 따라 달리 정할 수 있는 선택 사항이며 유·무급과 일수를 명확히 정하도록 설명합니다.', '일반 근로자용 제38~43조'),
('departure', 2, 0, '정년을 정할 때 회사는 60세 미만으로 자유롭게 정할 수 있다.', false, '제60조 착안사항은 정년을 60세 이상으로 정해야 하며 60세 미만으로 정하면 60세로 본다고 설명합니다.', '일반 근로자용 제56조, 제60조'),
('notice', 2, 1, '해고예고수당을 지급하면 정당한 이유 없이도 해고할 수 있다.', false, '해고예고와 해고의 정당성은 별개입니다. 제57조는 정당한 이유를 요구하고 제59조는 서면통지와 예고를 규정합니다.', '일반 근로자용 제57~59조'),
('pension', 2, 2, '확정급여형 퇴직연금은 필요할 때 언제나 중도인출할 수 있다.', false, '제62조 착안사항은 확정급여형 퇴직연금의 중도인출은 허용되지 않는다고 명시합니다.', '일반 근로자용 제61~63조')
on conflict (id) do nothing;
commit;
