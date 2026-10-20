-- Keep original attempts and link each wrong-answer retry to its saved parent.
begin;

alter table public.calendar_quiz_attempts add column if not exists retry_of uuid
  references public.calendar_quiz_attempts(id);

-- One defaulted fourth argument keeps existing three-argument clients compatible.
drop function if exists public.submit_calendar_quiz(uuid, integer, jsonb);
create or replace function public.submit_calendar_quiz(
  p_attempt_id uuid, p_chapter integer, p_responses jsonb, p_retry_of uuid default null
)
returns public.calendar_quiz_attempts
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_existing public.calendar_quiz_attempts;
  v_parent public.calendar_quiz_attempts;
  v_result public.calendar_quiz_attempts;
  v_count integer := 3;
  v_score integer;
  v_answers jsonb;
begin
  if v_user is null then raise exception 'Login required' using errcode = '42501'; end if;
  if p_attempt_id is null or p_chapter is null or p_chapter not between 0 and 2 or p_attempt_id = p_retry_of then
    raise exception 'Invalid attempt';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_attempt_id::text, 0));
  select * into v_existing from public.calendar_quiz_attempts where id = p_attempt_id;
  if found then
    if v_existing.user_id <> v_user or v_existing.chapter <> p_chapter
      or v_existing.retry_of is distinct from p_retry_of
      or v_existing.submitted_responses is distinct from p_responses then
      raise exception 'Attempt does not match' using errcode = '42501';
    end if;
    return v_existing;
  end if;
  if p_responses is null or pg_catalog.jsonb_typeof(p_responses) <> 'array' then
    raise exception 'Invalid answers';
  end if;
  if p_retry_of is not null then
    select * into v_parent from public.calendar_quiz_attempts where id = p_retry_of;
    if not found or v_parent.user_id <> v_user or v_parent.chapter <> p_chapter then
      raise exception 'Retry does not match' using errcode = '42501';
    end if;
    select count(*) into v_count from pg_catalog.jsonb_array_elements(v_parent.answers) a
      where a->'selected' is distinct from a->'correct';
    if v_count = 0 then raise exception 'No wrong answers to retry'; end if;
  end if;
  if pg_catalog.jsonb_array_length(p_responses) <> v_count then
    raise exception 'Submit every question in this attempt';
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
  if p_retry_of is not null and exists (
    select 1 from pg_catalog.jsonb_array_elements(p_responses) r
    where not exists (
      select 1 from pg_catalog.jsonb_array_elements(v_parent.answers) a
      where a->>'question_id' = r->>'question_id' and a->'selected' is distinct from a->'correct'
    )
  ) then raise exception 'Retry must contain only the parent wrong answers'; end if;
  perform 1 from public.calendar_quiz_questions where chapter = p_chapter and active for share;
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
    ) order by response.position)
  into v_score, v_answers
  from pg_catalog.jsonb_array_elements(p_responses) with ordinality response(r, position)
  join public.calendar_quiz_questions q on q.id = r->>'question_id'
  where q.chapter = p_chapter and q.active;
  insert into public.calendar_quiz_attempts(id, user_id, chapter, submitted_responses, answers, score, total, retry_of)
    values (p_attempt_id, v_user, p_chapter, p_responses, v_answers, v_score, v_count, p_retry_of)
    returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.submit_calendar_quiz(uuid, integer, jsonb, uuid) from public, anon;
grant execute on function public.submit_calendar_quiz(uuid, integer, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
