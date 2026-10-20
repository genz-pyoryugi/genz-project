-- Existing calendar database: apply bank expansion and wrong-answer retries together.
-- Existing attempts are preserved. Safe to rerun. Do not use initial setup on an existing DB.
begin;


create or replace function public.submit_calendar_quiz(p_attempt_id uuid, p_chapter integer, p_responses jsonb)
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
  -- Lock the bank during grading; each attempt submits exactly three distinct active questions.
  perform 1 from public.calendar_quiz_questions where chapter = p_chapter and active for share;
  v_count := 3;
  if pg_catalog.jsonb_array_length(p_responses) <> v_count then
    raise exception 'Submit exactly three questions';
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
    ) order by response.position)
  into v_score, v_answers
  from pg_catalog.jsonb_array_elements(p_responses) with ordinality response(r, position)
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
('hours-exclude-break', 0, 3, 'PDF에서 일반 성인 근로자의 하루 8시간 기준에는 휴게시간이 포함된다.', false, '제23조는 휴게시간을 제외하고 하루 8시간, 주 40시간을 규정합니다. 휴게시간을 합쳐 계산하는 기준이 아닙니다.', '일반 근로자용 제23조 · PDF 37쪽'),
('hours-young-week', 0, 4, 'PDF에서 18세 미만 사원의 기본 근로시간은 하루 7시간, 주 35시간이다.', true, '제23조는 18세 미만 사원에게 휴게시간을 제외하고 하루 7시간, 주 35시간의 별도 기준을 제시합니다.', '일반 근로자용 제23조 · PDF 37쪽'),
('break-four-hours', 0, 5, 'PDF에 따르면 4시간 일하는 경우 30분 이상의 휴게시간을 근로 도중에 주어야 한다.', true, '제24조 작성 시 착안사항은 4시간 근로 시 30분 이상, 8시간 근로 시 1시간 이상의 휴게를 근로시간 도중에 부여하도록 설명합니다.', '일반 근로자용 제24조 · PDF 39쪽'),
('break-end-only', 0, 6, 'PDF에서는 휴게시간을 근로 도중이 아니라 퇴근 뒤에 몰아서 주어도 된다고 설명한다.', false, '제24조 작성 시 착안사항은 휴게시간을 근로시간 도중에 부여하고 근로자가 자유롭게 이용할 수 있도록 보장해야 한다고 설명합니다.', '일반 근로자용 제24조 · PDF 39쪽'),
('break-notice', 0, 7, 'PDF 제24조는 업무 사정으로 휴게시간을 달리 운영할 때 해당 사원에게 미리 공지하도록 한다.', true, '제24조제2항은 업무 사정으로 휴게시간을 달리 정할 경우 해당 사원에게 미리 공지하도록 규정합니다.', '일반 근로자용 제24조제2항 · PDF 39쪽'),
('overtime-consent', 0, 8, 'PDF에서 일반 성인 사원의 연장근로는 사원의 동의하에 주 12시간 한도로 실시할 수 있다.', true, '제29조제1항은 연장근로를 사원의 동의하에 주 12시간 한도로 실시하도록 합니다. 18세 미만·산후 1년 미만·임신 중 사원에는 별도 제한이 있습니다.', '일반 근로자용 제29조제1항 · PDF 44쪽'),
('pregnancy-overtime', 0, 9, 'PDF에서는 임신 중인 사원도 동의하기만 하면 연장근로를 할 수 있다고 규정한다.', false, '제29조제1항은 임신 중인 여성사원에게 연장근로를 실시할 수 없다고 규정합니다.', '일반 근로자용 제29조제1항 · PDF 44쪽'),
('holiday-premium', 0, 10, 'PDF의 휴일근로 가산 기준은 8시간 이내 50%, 8시간 초과분 100%이다.', true, '제29조제3항은 8시간 이내 휴일근로에 통상임금의 50%, 8시간 초과 휴일근로에 100%를 가산하는 기준을 제시합니다.', '일반 근로자용 제29조제3항 · PDF 44쪽'),
('compensatory-leave-agreement', 0, 11, 'PDF에서는 연장·야간·휴일근로 임금 대신 휴가를 주려면 근로자대표와 서면합의가 필요하다.', true, '제29조제5항은 근로자대표와 서면합의하여 연장·야간·휴일근로 임금을 대신하는 휴가를 줄 수 있도록 규정합니다.', '일반 근로자용 제29조제5항 · PDF 45쪽'),
('holiday-foundation', 1, 3, 'PDF에 등장하는 회사 창립기념일은 모든 회사가 반드시 유급휴일로 정해야 하는 날이다.', false, '제32조 작성 시 착안사항은 창립기념일 등은 회사 사정에 따라 휴일로 정할 수 있다고 설명합니다. 예시를 모든 회사의 의무로 해석하지 않습니다.', '일반 근로자용 제32조 · PDF 48쪽'),
('holiday-attendance', 1, 4, 'PDF 제32조는 1주 동안 소정근로일을 개근한 사원에게 유급주휴일을 부여하도록 한다.', true, '제32조제2항은 1주 동안 소정근로일을 개근한, 즉 결근이 없는 사원에게 유급주휴일을 부여하도록 규정합니다.', '일반 근로자용 제32조제2항 · PDF 48쪽'),
('holiday-substitute-written', 1, 5, 'PDF에서는 관공서 공휴일과 대체공휴일을 특정 근로일로 대체할 때 근로자대표와 서면합의하도록 한다.', true, '제32조제4항은 해당 공휴일을 유급휴일로 하고, 근로자대표와 서면합의한 경우 특정 근로일로 대체할 수 있도록 규정합니다.', '일반 근로자용 제32조제4항 · PDF 48쪽'),
('annual-eighty-percent', 1, 6, 'PDF 제33조는 1년간 80% 이상 출근한 사원에게 15일의 유급휴가를 주도록 한다.', true, '제33조제1항은 1년간 80% 이상 출근한 사원에게 15일의 유급휴가를 부여하도록 규정합니다.', '일반 근로자용 제33조제1항 · PDF 49쪽'),
('annual-under-eighty', 1, 7, 'PDF에서는 1년간 출근율이 80% 미만이면 개근한 달이 있어도 연차휴가를 전혀 받을 수 없다.', false, '제33조제2항은 1년 미만 사원 또는 1년간 80% 미만 출근한 사원에게 1개월 개근 시 1일의 유급휴가를 주도록 합니다.', '일반 근로자용 제33조제2항 · PDF 49쪽'),
('annual-long-service', 1, 8, 'PDF에서 3년 이상 근속자의 가산 연차를 포함한 총 휴가일수 한도는 25일이다.', true, '제33조제3항은 3년 이상 근속 시 최초 1년을 초과하는 근속연수 매 2년에 1일을 가산하며, 가산휴가를 포함한 총 휴가일수는 25일을 한도로 합니다.', '일반 근로자용 제33조제3항 · PDF 49쪽'),
('annual-work-injury', 1, 9, 'PDF에서는 업무상 부상이나 질병으로 휴업한 기간을 연차 산정 시 출근한 것으로 본다.', true, '제33조제4항제1호는 업무상의 부상 또는 질병으로 휴업한 기간을 제1항·제2항의 연차 산정 시 출근한 것으로 보도록 합니다.', '일반 근로자용 제33조제4항 · PDF 49쪽'),
('annual-parental-leave', 1, 10, 'PDF에서는 육아휴직 기간을 연차 산정 시 출근한 기간에서 무조건 제외한다.', false, '제33조제4항제3호는 해당 법률에 따른 육아휴직 기간을 제1항·제2항의 연차 산정 시 출근한 것으로 보도록 합니다.', '일반 근로자용 제33조제4항 · PDF 49쪽'),
('annual-two-year-bonus', 1, 11, 'PDF에서 3년 이상 근속자의 가산 연차는 최초 1년을 초과하는 근속연수 매 2년마다 1일이다.', true, '제33조제3항의 가산 기준은 매년 1일이 아니라 최초 1년을 초과하는 계속근로연수 매 2년에 대하여 1일입니다. 총 휴가일수 한도는 25일입니다.', '일반 근로자용 제33조제3항 · PDF 49쪽'),
('dismissal-written', 2, 3, 'PDF에서 해고 통지는 해고 사유와 날짜를 적은 서면으로 하도록 한다.', true, '제59조제1항은 해고 사유 및 날짜를 기재하여 서면으로 통지하도록 규정합니다. 해고예고와 서면통지의 요건을 함께 확인해야 합니다.', '일반 근로자용 제59조제1항 · PDF 78쪽'),
('dismissal-three-month-exception', 2, 4, 'PDF에서는 계속근로기간이 3개월 미만인 사원에게도 예외 없이 30일 전 해고예고가 필요하다.', false, '제59조제2항제1호는 계속근로기간 3개월 미만을 해고예고의 예외로 둡니다. 이 예외가 정당한 해고 사유나 서면통지 요건까지 없애는 것은 아닙니다.', '일반 근로자용 제57조, 제59조제1~2항 · PDF 76·78쪽'),
('retirement-over-sixty', 2, 5, 'PDF에 따르면 회사는 정년을 61세나 62세처럼 60세보다 높게 정할 수도 있다.', true, '제60조 작성 시 착안사항은 정년을 60세 이상으로 정해야 하며, 61세·62세 등 60세 초과 설정도 가능하다고 설명합니다.', '일반 근로자용 제60조 · PDF 79쪽'),
('retirement-fifty-eight', 2, 6, 'PDF에 따르면 정년을 58세로 정하면 그 정년은 60세로 본다.', true, '제60조 작성 시 착안사항은 정년을 60세 미만으로 설정하는 경우 60세로 간주한다고 설명합니다.', '일반 근로자용 제60조 · PDF 79쪽'),
('pension-under-year', 2, 7, 'PDF 제61조는 계속근로기간이 1년 미만인 사원을 퇴직급여 지급 대상에서 제외한다.', true, '제61조제2항은 계속근로기간 1년 미만이거나, 4주 평균 주 소정근로시간 15시간 미만인 사원에게는 퇴직급여를 지급하지 않는다고 규정합니다.', '일반 근로자용 제61조제2항 · PDF 80쪽'),
('pension-short-hours', 2, 8, 'PDF에서는 4주 평균 주 소정근로시간이 15시간 미만이어도 1년만 근무하면 반드시 퇴직급여 지급 대상이 된다.', false, '제61조제2항은 4주 평균 주 소정근로시간 15시간 미만인 사원을 지급 대상에서 제외합니다. 계속근로기간과 소정근로시간 조건을 함께 확인해야 합니다.', '일반 근로자용 제61조제2항 · PDF 80쪽'),
('pension-dc-reasons', 2, 9, 'PDF에서는 확정기여형 퇴직연금도 법령상 사유를 확인하지 않고 언제나 중도인출할 수 있다.', false, '제62조는 확정기여형 가입 사원이 주택구입 등 해당 법령에서 정한 사유로 요구하는 경우 중도인출할 수 있도록 합니다. 모든 사유의 중도인출을 허용하는 규정이 아닙니다.', '일반 근로자용 제62조 · PDF 81쪽'),
('pension-irp-default', 2, 10, 'PDF에서는 퇴직급여를 지급받을 계정을 지정하지 않으면 원칙적으로 사원 명의의 IRP 계정으로 이전한다.', true, '제63조제2항은 지급받을 계정을 지정하지 않은 경우 사원 명의의 개인형퇴직연금 계정으로 이전하도록 합니다. 작성 시 착안사항의 이전 예외 사유도 확인해야 합니다.', '일반 근로자용 제63조제2항 · PDF 83쪽'),
('pension-irp-exceptions', 2, 11, 'PDF에서는 55세 이후 퇴직하거나 급여액이 300만원 이하인 경우 등을 IRP 이전의 예외로 설명한다.', true, '제63조 작성 시 착안사항은 55세 이후 퇴직, 300만원 이하 급여액, 근로자 사망 등 이전 예외 사유를 제시합니다.', '일반 근로자용 제63조 · PDF 83쪽')
on conflict (id) do nothing;




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
