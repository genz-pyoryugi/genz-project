-- Additive migration. Does not read, modify or remove the old quizzes table.
begin;
create table public.lt_question_versions (
 id uuid primary key default gen_random_uuid(), question_key text not null, revision integer not null check(revision > 0),
 kind text not null check(kind in ('single_choice')), prompt text not null,
 options jsonb not null check(jsonb_array_length(options) between 2 and 8),
 correct_option text not null, explanation text not null, points integer not null default 1 check(points > 0),
 unique(question_key, revision)
);
create table public.lt_quiz_versions (
 id uuid primary key default gen_random_uuid(), quiz_key text not null, revision integer not null check(revision > 0),
 title text not null, is_test boolean not null default false, published boolean not null default false,
 scoring text not null default 'single-choice-v1' check(scoring = 'single-choice-v1'),
 created_at timestamptz not null default now(), unique(quiz_key, revision)
);
create table public.lt_quiz_items (
 quiz_version_id uuid not null references public.lt_quiz_versions(id),
 question_version_id uuid not null references public.lt_question_versions(id),
 position integer not null check(position > 0), primary key(quiz_version_id,question_version_id), unique(quiz_version_id,position)
);
create table public.lt_visits (
 id uuid primary key, visitor_id uuid not null references auth.users(id),
 started_at timestamptz not null, received_at timestamptz not null default now(), first_choice text
);
create index on public.lt_visits(visitor_id,started_at);
create table public.lt_attempts (
 id uuid primary key, visitor_id uuid not null references auth.users(id), visit_id uuid not null references public.lt_visits(id),
 quiz_version_id uuid not null references public.lt_quiz_versions(id),
 started_at timestamptz not null, completed_at timestamptz, received_at timestamptz not null default now(),
 question_count integer not null, answered_count integer not null default 0,
 correct_count integer not null default 0, wrong_count integer not null default 0, score integer not null default 0,
 completed boolean not null default false
);
create index on public.lt_attempts(visitor_id,quiz_version_id,started_at);
create table public.lt_answers (
 attempt_id uuid not null references public.lt_attempts(id), question_version_id uuid not null references public.lt_question_versions(id),
 visitor_id uuid not null references auth.users(id), selected_option text not null, is_correct boolean not null,
 points integer not null, submitted_at timestamptz not null, received_at timestamptz not null default now(),
 primary key(attempt_id,question_version_id)
);
create table public.lt_events (
 id uuid primary key, visitor_id uuid not null references auth.users(id), visit_id uuid not null references public.lt_visits(id),
 event_type text not null, occurred_at timestamptz not null, received_at timestamptz not null default now(),
 client_sequence bigint not null, payload jsonb not null
);
create index on public.lt_events(visit_id,client_sequence);

-- Published content is immutable. Publish a new revision instead of editing historical content.
create function public.lt_guard_content() returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_TABLE_NAME = 'lt_quiz_versions' then
   if old.published then raise exception 'Published quiz versions are immutable'; end if;
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
create trigger lt_freeze_quiz before update or delete on public.lt_quiz_versions for each row execute function public.lt_guard_content();
create trigger lt_freeze_question before update or delete on public.lt_question_versions for each row execute function public.lt_guard_content();
create trigger lt_freeze_items before insert or update or delete on public.lt_quiz_items for each row execute function public.lt_guard_content();

-- Content is delivered through a narrow catalog RPC, not general table access.
create function public.lt_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'isTest',v.is_test,'revision',v.revision,
 'questions',(select jsonb_agg(jsonb_build_object('id',q.id,'questionKey',q.question_key,'revision',q.revision,
 'question',q.prompt,'options',q.options,'correctOption',q.correct_option,'explanation',q.explanation,'points',q.points) order by i.position)
 from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id where i.quiz_version_id=v.id)) order by v.quiz_key),'[]'::jsonb)
 from public.lt_quiz_versions v where v.published and v.revision=(select max(x.revision) from public.lt_quiz_versions x where x.quiz_key=v.quiz_key and x.published)
$$;

-- One transaction per durable queue item. Duplicate IDs are acknowledged, altered retries rejected.
create function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); eid uuid := (p->>'id')::uuid; vid uuid := (p->>'visitId')::uuid;
 aid uuid := (p->>'attemptId')::uuid; kind text := p->>'type'; at_time timestamptz := (p->>'at')::timestamptz;
 a public.lt_attempts; q public.lt_question_versions; old_event public.lt_events;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if eid is null or vid is null or at_time is null or (p->>'sequence')::bigint is null then raise exception 'Missing event identity'; end if;
 if pg_column_size(p) > 2048 then raise exception 'Event too large'; end if;
 -- Serialize per visitor, including simultaneous retries from tabs.
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
     if not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id'=p->>'selectedOption') then raise exception 'Invalid option'; end if;
     insert into public.lt_answers values(aid,q.id,uid,p->>'selectedOption',p->>'selectedOption'=q.correct_option,
       case when p->>'selectedOption'=q.correct_option then q.points else 0 end,at_time,now())
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

-- No direct writes, even to one's own score. Only the validated RPC can write.
alter table public.lt_question_versions enable row level security;
alter table public.lt_quiz_versions enable row level security;
alter table public.lt_quiz_items enable row level security;
alter table public.lt_visits enable row level security;
alter table public.lt_attempts enable row level security;
alter table public.lt_answers enable row level security;
alter table public.lt_events enable row level security;
revoke all on public.lt_question_versions,public.lt_quiz_versions,public.lt_quiz_items,public.lt_visits,public.lt_attempts,public.lt_answers,public.lt_events from anon,authenticated;
grant select on public.lt_visits,public.lt_attempts,public.lt_answers,public.lt_events to authenticated;
create policy lt_own_visits on public.lt_visits for select to authenticated using(visitor_id=(select auth.uid()));
create policy lt_own_attempts on public.lt_attempts for select to authenticated using(visitor_id=(select auth.uid()));
create policy lt_own_answers on public.lt_answers for select to authenticated using(visitor_id=(select auth.uid()));
create policy lt_own_events on public.lt_events for select to authenticated using(visitor_id=(select auth.uid()));
revoke all on function public.lt_ingest(jsonb),public.lt_catalog(),public.lt_guard_content() from public,anon,authenticated;
grant execute on function public.lt_ingest(jsonb) to authenticated;
grant execute on function public.lt_catalog() to anon,authenticated;

-- ---------------------------------------------------------------------------------------------
-- Analysis views (read in the Supabase SQL editor / dashboard; not exposed to anon/authenticated).
-- ---------------------------------------------------------------------------------------------
-- One row per visit: first pressed button and the order in which areas were used.
create view public.lt_visit_paths as
select v.id as visit_id, v.visitor_id, v.started_at, v.first_choice,
 row_number() over (partition by v.visitor_id order by v.started_at) as visit_number,
 (array_agg(a.area order by a.occurred_at, a.client_sequence) filter (where a.area is not null))[1] as first_area,
 coalesce(string_agg(a.area, ' > ' order by a.occurred_at, a.client_sequence) filter (where a.area is not null), '') as area_path
from public.lt_visits v
left join (
 select e.visit_id, e.occurred_at, e.client_sequence,
  case e.event_type when 'office_entered' then 'office' when 'office_object_opened' then 'office'
   when 'cardnews_opened' then 'cardnews' when 'quiz_opened' then 'quiz' end as area
 from public.lt_events e where e.event_type in ('office_entered','office_object_opened','cardnews_opened','quiz_opened')
) a on a.visit_id = v.id
group by v.id, v.visitor_id, v.started_at, v.first_choice;

-- One row per quiz attempt, with first-vs-retake numbering per visitor and quiz.
-- Compare only rows with the same quiz_key + revision (same content).
create view public.lt_attempt_report as
select t.id as attempt_id, t.visitor_id, t.visit_id, qv.quiz_key, qv.revision, qv.title, qv.is_test,
 row_number() over (partition by t.visitor_id, t.quiz_version_id order by t.started_at, t.id) as attempt_number,
 (row_number() over (partition by t.visitor_id, t.quiz_version_id order by t.started_at, t.id)) = 1 as is_first_attempt,
 vp.visit_number, vp.first_choice, vp.first_area, vp.area_path,
 t.question_count, t.answered_count, t.correct_count, t.wrong_count, t.score, t.completed, t.started_at, t.completed_at
from public.lt_attempts t
join public.lt_quiz_versions qv on qv.id = t.quiz_version_id
join public.lt_visit_paths vp on vp.visit_id = t.visit_id;

-- Per answer detail (question key + revision keep the same wording comparable across attempts).
create view public.lt_answer_report as
select a.attempt_id, a.visitor_id, qv.quiz_key, qv.revision as quiz_revision, q.question_key, q.revision as question_revision,
 i.position, a.selected_option, a.is_correct, a.points, a.submitted_at
from public.lt_answers a
join public.lt_attempts t on t.id = a.attempt_id
join public.lt_quiz_versions qv on qv.id = t.quiz_version_id
join public.lt_question_versions q on q.id = a.question_version_id
join public.lt_quiz_items i on i.quiz_version_id = t.quiz_version_id and i.question_version_id = a.question_version_id;

alter view public.lt_visit_paths set (security_invoker = true);
alter view public.lt_attempt_report set (security_invoker = true);
alter view public.lt_answer_report set (security_invoker = true);
revoke all on public.lt_visit_paths, public.lt_attempt_report, public.lt_answer_report from anon, authenticated;
commit;
