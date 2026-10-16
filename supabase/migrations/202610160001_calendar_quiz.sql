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

commit;
