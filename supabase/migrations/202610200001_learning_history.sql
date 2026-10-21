-- Run after 202610160001 and 202610160002. Preserves all existing records.
begin;

-- Only a trusted SQL administrator can appoint operators. No client writes or sign-up path.
create table public.lt_operators (
 user_id uuid primary key references auth.users(id), appointed_at timestamptz not null default now()
);
alter table public.lt_operators enable row level security;
revoke all on public.lt_operators from public, anon, authenticated;
create function public.lt_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lt_operators o join auth.users u on u.id=o.user_id
 where o.user_id=auth.uid() and not coalesce(u.is_anonymous,true))
$$;
revoke all on function public.lt_is_admin() from public,anon;
grant execute on function public.lt_is_admin() to authenticated;
create function public.lt_learning_version() returns integer language sql stable set search_path='' as $$ select 3 $$;
revoke all on function public.lt_learning_version() from public,anon;
grant execute on function public.lt_learning_version() to authenticated;

-- Earlier code saved only full attempts. It never persisted review attempts.
alter table public.lt_attempts add column mode text not null default 'full' check(mode in ('full','review')),
 add column source_attempt_id uuid references public.lt_attempts(id);
alter table public.lt_attempts add constraint lt_review_source check
 ((mode='full' and source_attempt_id is null) or (mode='review' and source_attempt_id is not null));
-- New attempts freeze their membership here. Historical full attempts retain their immutable quiz membership.
create table public.lt_attempt_items (
 attempt_id uuid not null references public.lt_attempts(id),
 question_version_id uuid not null references public.lt_question_versions(id),
 position integer not null, primary key(attempt_id,question_version_id), unique(attempt_id,position)
);
alter table public.lt_attempt_items enable row level security;
revoke all on public.lt_attempt_items from public,anon,authenticated;
grant select on public.lt_attempt_items to authenticated;
create policy lt_read_attempt_items on public.lt_attempt_items for select to authenticated using
 (exists(select 1 from public.lt_attempts a where a.id=attempt_id));

create policy lt_admin_visits on public.lt_visits for select to authenticated using((select public.lt_is_admin()));
create policy lt_admin_attempts on public.lt_attempts for select to authenticated using((select public.lt_is_admin()));
create policy lt_admin_answers on public.lt_answers for select to authenticated using((select public.lt_is_admin()));
create policy lt_admin_events on public.lt_events for select to authenticated using((select public.lt_is_admin()));
-- Published question content was already public through lt_catalog. Permit versioned history joins.
grant select on public.lt_quiz_versions,public.lt_quiz_items,public.lt_question_versions to authenticated;
create policy lt_read_published_quizzes on public.lt_quiz_versions for select to authenticated using(published);
create policy lt_read_published_items on public.lt_quiz_items for select to authenticated using
 (exists(select 1 from public.lt_quiz_versions v where v.id=quiz_version_id and v.published));
create policy lt_read_published_questions on public.lt_question_versions for select to authenticated using
 (exists(select 1 from public.lt_quiz_items i where i.question_version_id=lt_question_versions.id));

create or replace function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); eid uuid := (p->>'id')::uuid; vid uuid := (p->>'visitId')::uuid;
 aid uuid := (p->>'attemptId')::uuid; kind text := p->>'type'; at_time timestamptz := (p->>'at')::timestamptz;
 a public.lt_attempts; q public.lt_question_versions; old_event public.lt_events;
 picked text[]; right_set text[]; ok boolean; stored text;
 attempt_mode text := coalesce(p->>'mode','full');
 source_id uuid := (p->>'sourceAttemptId')::uuid; parent_attempt public.lt_attempts;
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
   if attempt_mode not in ('full','review') then raise exception 'Invalid attempt mode'; end if;
   if not exists(select 1 from public.lt_quiz_versions where id=(p->>'quizVersionId')::uuid and published) then raise exception 'Quiz unavailable'; end if;
   select * into a from public.lt_attempts where id=aid;
   if found then
     if a.visitor_id<>uid or a.visit_id<>vid or a.quiz_version_id<>(p->>'quizVersionId')::uuid
       or a.mode<>attempt_mode or a.source_attempt_id is distinct from source_id then raise exception 'Attempt ID conflict'; end if;
     return;
   end if;
   if attempt_mode='review' then
     select * into parent_attempt from public.lt_attempts where id=source_id and visitor_id=uid
       and quiz_version_id=(p->>'quizVersionId')::uuid and completed;
     if not found then raise exception 'Invalid review source'; end if;
     if not exists(select 1 from public.lt_answers where attempt_id=source_id and not is_correct) then raise exception 'No wrong answers to review'; end if;
   elsif source_id is not null then raise exception 'Full attempts cannot have a review source';
   end if;
   insert into public.lt_attempts(id,visitor_id,visit_id,quiz_version_id,started_at,question_count,mode,source_attempt_id)
   values(aid,uid,vid,(p->>'quizVersionId')::uuid,at_time,0,attempt_mode,source_id);
   insert into public.lt_attempt_items(attempt_id,question_version_id,position)
   select aid,i.question_version_id,i.position from public.lt_quiz_items i
   where i.quiz_version_id=(p->>'quizVersionId')::uuid and (attempt_mode='full' or exists
     (select 1 from public.lt_answers ans where ans.attempt_id=source_id and ans.question_version_id=i.question_version_id and not ans.is_correct));
   update public.lt_attempts set question_count=(select count(*) from public.lt_attempt_items where attempt_id=aid) where id=aid;
   if not exists(select 1 from public.lt_attempt_items where attempt_id=aid) then raise exception 'Empty quiz'; end if;
 elsif kind in ('answer_submitted','quiz_completed') then
   select * into a from public.lt_attempts where id=aid and visitor_id=uid and visit_id=vid for update;
   if not found then raise exception 'Attempt ownership mismatch'; end if;
   if kind='answer_submitted' then
     select qv.* into q from public.lt_question_versions qv join public.lt_quiz_items i on i.question_version_id=qv.id
     where i.quiz_version_id=a.quiz_version_id and qv.id=(p->>'questionVersionId')::uuid;
     if not found then raise exception 'Question is not in attempt version'; end if;
     if a.mode='review' and not exists(select 1 from public.lt_attempt_items where attempt_id=aid and question_version_id=q.id) then
       raise exception 'Question is not in review'; end if;
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
     if exists(select 1 from public.lt_answers where attempt_id=aid and question_version_id=q.id) then
       if not exists(select 1 from public.lt_answers where attempt_id=aid and question_version_id=q.id and selected_option=stored) then
         raise exception 'Answer already submitted'; end if;
       return;
     end if;
     if a.completed then raise exception 'Attempt is already complete'; end if;
     insert into public.lt_answers values(aid,q.id,uid,stored,ok,case when ok then q.points else 0 end,at_time,now())
       on conflict (attempt_id,question_version_id) do nothing; -- first submitted answer wins
     update public.lt_attempts set
       answered_count=(select count(*) from public.lt_answers where attempt_id=aid),
       correct_count=(select count(*) from public.lt_answers where attempt_id=aid and is_correct),
       wrong_count=(select count(*) from public.lt_answers where attempt_id=aid and not is_correct),
       score=(select coalesce(sum(points),0) from public.lt_answers where attempt_id=aid) where id=aid;
   else
     if a.completed then return; end if;
     if a.answered_count<>a.question_count or a.question_count=0 then raise exception 'Attempt has unanswered questions'; end if;
     update public.lt_attempts set completed=true,completed_at=at_time where id=aid;
   end if;
 elsif kind not in ('visit_started','office_entered','office_object_opened','cardnews_opened','cardnews_last_slide','quiz_opened') then
   raise exception 'Unknown event type';
 end if;
 insert into public.lt_events values(eid,uid,vid,kind,at_time,now(),(p->>'sequence')::bigint,p);
end $$;

-- Invoker views honor the caller's RLS, including when accessed directly through PostgREST.
create view public.lt_learning_records with (security_invoker=true) as
select a.*, v.quiz_key, v.title, v.revision, v.is_test, visits.first_choice,
 coalesce(route.path,'unclassified') as path,
 membership.signature,membership.max_score,
 coalesce(details.answers,'[]'::jsonb) as answers,
 coalesce(timeline.events,'[]'::jsonb) as events
from public.lt_attempts a
join public.lt_quiz_versions v on v.id=a.quiz_version_id
join public.lt_visits visits on visits.id=a.visit_id
cross join lateral (
 select string_agg(i.question_version_id::text,',' order by i.position) as signature,sum(q.points) as max_score
 from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id where i.quiz_version_id=a.quiz_version_id
 and (a.mode='full' or exists(select 1 from public.lt_attempt_items ai
 where ai.attempt_id=a.id and ai.question_version_id=i.question_version_id))
) membership
left join lateral (
 select case when e.event_type='cardnews_opened' then 'cardnews' else 'office' end as path
 from public.lt_events e where e.visit_id=a.visit_id
 and e.event_type in ('cardnews_opened','office_entered','office_object_opened')
 and e.client_sequence < (select min(s.client_sequence) from public.lt_events s
 where s.visit_id=a.visit_id and s.event_type='quiz_started' and s.payload->>'attemptId'=a.id::text)
 order by e.client_sequence desc,e.occurred_at desc,e.id desc limit 1
) route on true
left join lateral (
 select jsonb_agg(jsonb_build_object('questionId',q.id,'question',q.prompt,'options',q.options,
 'correctOptions',case when q.kind='single_choice' then jsonb_build_array(q.correct_option) else q.correct_options end,
 'selectedOption',ans.selected_option,'isCorrect',ans.is_correct,'points',ans.points,
 'explanation',q.explanation,'submittedAt',ans.submitted_at) order by i.position) as answers
 from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id
 left join public.lt_answers ans on ans.attempt_id=a.id and ans.question_version_id=q.id
 where i.quiz_version_id=a.quiz_version_id and (a.mode='full' or exists(select 1 from public.lt_attempt_items ai
 where ai.attempt_id=a.id and ai.question_version_id=q.id))
) details on true
left join lateral (
 select jsonb_agg(jsonb_build_object('type',e.event_type,'at',e.occurred_at,'sequence',e.client_sequence,
 'object',e.payload->>'object') order by e.client_sequence,e.occurred_at,e.id) as events
 from public.lt_events e where e.visit_id=a.visit_id
) timeline on true;
revoke all on public.lt_learning_records from public,anon,authenticated;
grant select on public.lt_learning_records to authenticated;

create function public.lt_records(
 p_admin boolean default false, p_from timestamptz default null,p_to timestamptz default null,
 p_topic text default null,p_path text default null,p_limit integer default 50,p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_admin and not public.lt_is_admin() then raise exception 'Operator required' using errcode='42501'; end if;
 if p_limit not between 1 and 10000 or p_offset<0 or (p_from is not null and p_to is not null and p_from>=p_to)
 or (p_path is not null and p_path not in ('cardnews','office','unclassified')) then
 raise exception 'Invalid filters' using errcode='22023'; end if;
 with filtered as materialized (
 select r.* from public.lt_learning_records r
 where (p_admin or r.visitor_id=auth.uid())
 and (p_from is null or r.started_at>=p_from) and (p_to is null or r.started_at<p_to)
 and (p_topic is null or r.quiz_key=p_topic) and (p_path is null or r.path=p_path)
 ), page as (
 select * from filtered order by started_at desc,id desc limit p_limit offset p_offset
 ), comparisons as (
 select visitor_id,quiz_version_id,quiz_key,title,revision,mode,signature,
 count(*) as attempts,
 (array_agg(correct_count order by started_at,id))[1] as first_correct,
 (array_agg(correct_count order by started_at desc,id desc))[1] as latest_correct,
 (array_agg(score order by started_at,id))[1] as first_score,
 (array_agg(score order by started_at desc,id desc))[1] as latest_score,
 max(question_count) as question_count,max(max_score) as max_score
 from filtered where completed and signature is not null
 group by visitor_id,quiz_version_id,quiz_key,title,revision,mode,signature
 ), paths as (
 select path,count(distinct visitor_id) as participants,count(*) as attempts,
 count(*) filter(where completed) as completed_attempts,
 round(100.0*count(*) filter(where completed)/nullif(count(*),0),1) as completion_rate,
 round(100.0*sum(correct_count) filter(where completed)/nullif(sum(question_count) filter(where completed),0),1) as accuracy
 from filtered where mode='full' and not is_test group by path
 ), matching_visits as materialized (
 select v.* from public.lt_visits v where (p_admin or v.visitor_id=auth.uid())
 and (p_from is null or v.started_at>=p_from) and (p_to is null or v.started_at<p_to)
 and ((p_topic is null and p_path is null) or exists(select 1 from filtered f where f.visit_id=v.id))
 ), visit_page as (
 select v.*,coalesce((select jsonb_agg(jsonb_build_object('type',e.event_type,'at',e.occurred_at,
 'sequence',e.client_sequence,'object',e.payload->>'object') order by e.client_sequence,e.occurred_at,e.id)
 from public.lt_events e where e.visit_id=v.id),'[]'::jsonb) as events
 from matching_visits v order by v.started_at desc,v.id desc limit p_limit offset p_offset
 )
 select jsonb_build_object(
 'attempts',coalesce((select jsonb_agg(to_jsonb(p) order by p.started_at desc,p.id desc) from page p),'[]'::jsonb),
 'total',(select count(*) from filtered),
 'comparisons',coalesce((select jsonb_agg(to_jsonb(c) order by c.title,c.visitor_id,c.revision,c.mode) from comparisons c),'[]'::jsonb),
 'paths',coalesce((select jsonb_agg(to_jsonb(p) order by p.path) from paths p),'[]'::jsonb),
 'visits',coalesce((select jsonb_agg(to_jsonb(v) order by v.started_at desc,v.id desc) from visit_page v),'[]'::jsonb),
 'visitTotal',(select count(*) from matching_visits),
 'topics',coalesce((select jsonb_agg(jsonb_build_object('key',x.quiz_key,'title',x.title)) from
 (select distinct r.quiz_key,r.title from public.lt_learning_records r where p_admin or r.visitor_id=auth.uid()) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.lt_records(boolean,timestamptz,timestamptz,text,text,integer,integer) from public,anon;
grant execute on function public.lt_records(boolean,timestamptz,timestamptz,text,text,integer,integer) to authenticated;
create index lt_attempts_started on public.lt_attempts(started_at desc,id);
create index lt_visits_started on public.lt_visits(started_at desc,id);
commit;
