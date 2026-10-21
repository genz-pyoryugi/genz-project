-- Additive follow-up to 202610160001. Run once, after it.
-- Adds multiple-choice questions, hint/per-option feedback, and a "listed" switch that can hide
-- a quiz from the site without touching immutable published content.
begin;

alter table public.lt_question_versions drop constraint lt_question_versions_kind_check;
alter table public.lt_question_versions add constraint lt_question_versions_kind_check
  check (kind in ('single_choice','multi_choice'));
alter table public.lt_question_versions alter column correct_option drop not null;
alter table public.lt_question_versions
  add column correct_options jsonb, add column hint text, add column feedback jsonb;
alter table public.lt_question_versions add constraint lt_question_correct_check check (
  (kind = 'single_choice' and correct_option is not null)
  or (kind = 'multi_choice' and correct_options is not null and jsonb_array_length(correct_options) >= 1));

alter table public.lt_quiz_versions add column listed boolean not null default true;

-- Published content stays immutable; only the "listed" flag of a quiz version may change afterwards.
create or replace function public.lt_guard_content() returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_TABLE_NAME = 'lt_quiz_versions' then
   if old.published and (TG_OP = 'DELETE' or (to_jsonb(new) - 'listed') <> (to_jsonb(old) - 'listed')) then
     raise exception 'Published quiz versions are immutable'; end if;
 elsif TG_TABLE_NAME = 'lt_question_versions' then
   if exists(select 1 from public.lt_quiz_items i join public.lt_quiz_versions v on v.id=i.quiz_version_id where i.question_version_id=old.id and v.published) then
     raise exception 'Published question versions are immutable'; end if;
 else
   if exists(select 1 from public.lt_quiz_versions v where v.id=case when TG_OP='INSERT' then new.quiz_version_id else old.quiz_version_id end and v.published)
     or (TG_OP='UPDATE' and exists(select 1 from public.lt_quiz_versions v where v.id=new.quiz_version_id and v.published)) then
     raise exception 'Published quiz membership is immutable'; end if;
 end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;

create or replace function public.lt_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'isTest',v.is_test,'revision',v.revision,
 'questions',(select jsonb_agg(jsonb_build_object('id',q.id,'questionKey',q.question_key,'revision',q.revision,'kind',q.kind,
 'question',q.prompt,'options',q.options,'correctOption',q.correct_option,'correctOptions',q.correct_options,
 'hint',q.hint,'feedback',q.feedback,'explanation',q.explanation,'points',q.points) order by i.position)
 from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id where i.quiz_version_id=v.id)) order by v.quiz_key),'[]'::jsonb)
 from public.lt_quiz_versions v where v.published and v.listed
 and v.revision=(select max(x.revision) from public.lt_quiz_versions x where x.quiz_key=v.quiz_key and x.published)
$$;

-- Same contract as before. For multiple choice, "selectedOption" carries the chosen option ids joined by ",".
-- A multiple-choice answer is correct only when the chosen set equals the correct set.
create or replace function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); eid uuid := (p->>'id')::uuid; vid uuid := (p->>'visitId')::uuid;
 aid uuid := (p->>'attemptId')::uuid; kind text := p->>'type'; at_time timestamptz := (p->>'at')::timestamptz;
 a public.lt_attempts; q public.lt_question_versions; old_event public.lt_events;
 picked text[]; right_set text[]; ok boolean; stored text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if eid is null or vid is null or at_time is null or (p->>'sequence')::bigint is null then raise exception 'Missing event identity'; end if;
 if pg_column_size(p) > 2048 then raise exception 'Event too large'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into old_event from public.lt_events where id=eid;
 if found then
   if old_event.visitor_id<>uid or old_event.payload<>p then raise exception 'Event ID conflict'; end if;
   return;
 end if;
 if kind='visit_started' then
   insert into public.lt_visits(id,visitor_id,started_at) values(vid,uid,at_time) on conflict do nothing;
 end if;
 if not exists(select 1 from public.lt_visits where id=vid and visitor_id=uid) then raise exception 'Visit ownership mismatch'; end if;
 if kind='first_choice' then
   if p->>'choice' not in ('files','radio','postit','calendar','phone','monitor','notebook','pen') then raise exception 'Invalid choice'; end if;
   update public.lt_visits set first_choice=coalesce(first_choice,p->>'choice') where id=vid;
 elsif kind='quiz_started' then
   if not exists(select 1 from public.lt_quiz_versions where id=(p->>'quizVersionId')::uuid and published) then raise exception 'Quiz unavailable'; end if;
   insert into public.lt_attempts(id,visitor_id,visit_id,quiz_version_id,started_at,question_count)
   select aid,uid,vid,(p->>'quizVersionId')::uuid,at_time,count(*) from public.lt_quiz_items where quiz_version_id=(p->>'quizVersionId')::uuid;
 elsif kind in ('answer_submitted','quiz_completed') then
   select * into a from public.lt_attempts where id=aid and visitor_id=uid and visit_id=vid for update;
   if not found then raise exception 'Attempt ownership mismatch'; end if;
   if a.completed then raise exception 'Attempt is already complete'; end if;
   if kind='answer_submitted' then
     select qv.* into q from public.lt_question_versions qv join public.lt_quiz_items i on i.question_version_id=qv.id
     where i.quiz_version_id=a.quiz_version_id and qv.id=(p->>'questionVersionId')::uuid;
     if not found then raise exception 'Question is not in attempt version'; end if;
     select coalesce(array_agg(distinct s order by s), '{}') into picked from unnest(string_to_array(coalesce(p->>'selectedOption',''), ',')) s;
     if cardinality(picked) = 0 or (q.kind = 'single_choice' and cardinality(picked) <> 1) then raise exception 'Invalid option'; end if;
     if exists(select 1 from unnest(picked) s where not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id' = s)) then
       raise exception 'Invalid option'; end if;
     if q.kind = 'single_choice' then ok := picked[1] = q.correct_option;
     else
       select array_agg(x order by x) into right_set from jsonb_array_elements_text(q.correct_options) x;
       ok := picked = right_set;
     end if;
     stored := array_to_string(picked, ',');
     insert into public.lt_answers values(aid,q.id,uid,stored,ok,case when ok then q.points else 0 end,at_time,now())
       on conflict (attempt_id,question_version_id) do nothing; -- first submitted answer wins
     update public.lt_attempts set
       answered_count=(select count(*) from public.lt_answers where attempt_id=aid),
       correct_count=(select count(*) from public.lt_answers where attempt_id=aid and is_correct),
       wrong_count=(select count(*) from public.lt_answers where attempt_id=aid and not is_correct),
       score=(select coalesce(sum(points),0) from public.lt_answers where attempt_id=aid) where id=aid;
   else
     if a.answered_count<>a.question_count or a.question_count=0 then raise exception 'Attempt has unanswered questions'; end if;
     update public.lt_attempts set completed=true,completed_at=at_time where id=aid;
   end if;
 elsif kind not in ('visit_started','office_entered','office_object_opened','cardnews_opened','cardnews_last_slide','quiz_opened') then
   raise exception 'Unknown event type';
 end if;
 insert into public.lt_events values(eid,uid,vid,kind,at_time,now(),(p->>'sequence')::bigint,p);
end $$;

commit;
