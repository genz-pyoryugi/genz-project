-- Run once AFTER 202610200001_learning_history.sql. No existing learning data is removed.
begin;
create table public.lt_quiz_progress (
 attempt_id uuid primary key references public.lt_attempts(id),
 visitor_id uuid not null references auth.users(id),
 quiz_version_id uuid not null references public.lt_quiz_versions(id),
 status text not null check(status in ('active','completed','abandoned')),
 snapshot jsonb not null, client_sequence bigint not null,
 updated_at timestamptz not null default now(), abandoned_at timestamptz
);
alter table public.lt_quiz_progress enable row level security;
revoke all on public.lt_quiz_progress from public,anon,authenticated;
grant select on public.lt_quiz_progress to authenticated;
create policy lt_own_progress on public.lt_quiz_progress for select to authenticated using(visitor_id=(select auth.uid()));
create index lt_progress_owner on public.lt_quiz_progress(visitor_id,updated_at desc);
create function public.lt_progress_version() returns integer language sql stable set search_path='' as $$ select 1 $$;
revoke all on function public.lt_progress_version() from public,anon;
grant execute on function public.lt_progress_version() to authenticated;

-- Keep the validated ingestion rules; add an abandonment guard and prevent direct access to the delegate.
alter function public.lt_ingest(jsonb) rename to lt_ingest_before_progress;
revoke all on function public.lt_ingest_before_progress(jsonb) from public,anon,authenticated;
create function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.lt_quiz_progress where attempt_id=(p->>'attemptId')::uuid and status='abandoned') then
   raise exception 'Attempt was abandoned';
 end if;
 perform public.lt_ingest_before_progress(p);
end $$;
revoke all on function public.lt_ingest(jsonb) from public,anon;
grant execute on function public.lt_ingest(jsonb) to authenticated;

create function public.lt_save_progress(p jsonb) returns void language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); aid uuid:=(p->>'attemptId')::uuid; seq bigint:=(p->>'sequence')::bigint;
 a public.lt_attempts; v public.lt_quiz_versions; old public.lt_quiz_progress;
 s jsonb:=p->'snapshot'; r jsonb:=p->'snapshot'->'run'; n integer; idx integer; graded boolean;
 all_ids jsonb; revisions jsonb; run_ids jsonb; current_q public.lt_question_versions;
 picked jsonb; selected text[]; stored_answers jsonb; wrong jsonb; canonical jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if aid is null or seq is null or seq<1 or pg_column_size(p)>65536 or jsonb_typeof(s)<>'object' then raise exception 'Invalid progress'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into a from public.lt_attempts where id=aid and visitor_id=uid for update;
 if not found or a.visit_id<>(p->>'visitId')::uuid then raise exception 'Progress ownership mismatch'; end if;
 select * into old from public.lt_quiz_progress where attempt_id=aid;
 if found and (old.status='abandoned' or seq<=old.client_sequence) then return; end if;
 select * into v from public.lt_quiz_versions where id=a.quiz_version_id;
 select jsonb_agg(q.id order by i.position),jsonb_agg(q.revision order by i.position)
 into all_ids,revisions from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id where i.quiz_version_id=v.id;
 select jsonb_agg(i.question_version_id order by i.position),count(*) into run_ids,n from public.lt_quiz_items i
 where i.quiz_version_id=v.id and (a.mode='full' or exists(select 1 from public.lt_attempt_items ai where ai.attempt_id=aid and ai.question_version_id=i.question_version_id));
 if (s->>'quizId')::uuid is distinct from v.id or (s->>'quizRevision')::integer is distinct from v.revision
 or s->'questionIds' is distinct from all_ids or s->'questionRevisions' is distinct from revisions
 or (s->'attempt'->>'id')::uuid is distinct from aid or (s->'attempt'->>'quizId')::uuid is distinct from v.id
 or (s->'attempt'->>'visitId')::uuid is distinct from a.visit_id then raise exception 'Progress version mismatch'; end if;
 if (a.mode='full' and r->'reviewIds' is distinct from 'null'::jsonb)
 or (a.mode='review' and r->'reviewIds' is distinct from run_ids)
 or nullif(r->>'sourceAttemptId','')::uuid is distinct from a.source_attempt_id then raise exception 'Progress membership mismatch'; end if;
 idx:=(r->>'index')::integer; graded:=(r->>'graded')::boolean; picked:=r->'picked';
 -- A draft parked while SQL was unavailable may precede answers already stored in the DB.
 if idx is not null and graded is not null and idx<a.answered_count-(case when graded then 1 else 0 end) then return; end if;
 if idx is null or idx<0 or idx>n or graded is null or jsonb_typeof(picked)<>'array'
 or (idx=n and (graded or jsonb_array_length(picked)<>0))
 or not ((idx=a.answered_count and not graded) or (idx=a.answered_count-1 and graded)) then raise exception 'Progress position mismatch'; end if;
 -- Submitted positions must form a prefix. A draft never creates or edits official answers.
 if exists(select 1 from jsonb_array_elements_text(run_ids) with ordinality x(id,pos)
 where (pos<=a.answered_count) is distinct from exists(select 1 from public.lt_answers ans where ans.attempt_id=aid and ans.question_version_id=x.id::uuid)) then
 raise exception 'Progress answers out of order'; end if;
 if idx<n then
   select * into current_q from public.lt_question_versions where id=(run_ids->>idx)::uuid;
   if exists(select 1 from jsonb_array_elements_text(picked) x where x!~'^[0-9]+$' or x::integer>=jsonb_array_length(current_q.options))
   or (select count(*)<>count(distinct x) from jsonb_array_elements_text(picked) x)
   or (current_q.kind='single_choice' and jsonb_array_length(picked)>1) then raise exception 'Invalid progress selection'; end if;
   select array_agg(current_q.options->(x::integer)->>'id' order by current_q.options->(x::integer)->>'id') into selected from jsonb_array_elements_text(picked) x;
   if graded and not exists(select 1 from public.lt_answers ans where ans.attempt_id=aid and ans.question_version_id=current_q.id and ans.selected_option=array_to_string(selected,',')) then
     raise exception 'Submitted answer is immutable'; end if;
 end if;
 select coalesce(jsonb_object_agg(ans.question_version_id::text,jsonb_build_object('selectedOptions',string_to_array(ans.selected_option,','),'correct',ans.is_correct)),'{}'::jsonb)
 into stored_answers from public.lt_answers ans where ans.attempt_id=aid;
 select coalesce(jsonb_agg(i.question_version_id order by i.position),'[]'::jsonb) into wrong
 from public.lt_quiz_items i join public.lt_answers ans on ans.question_version_id=i.question_version_id and ans.attempt_id=aid
 where i.quiz_version_id=v.id and not ans.is_correct;
 canonical:=jsonb_build_object('quizId',v.id,'quizKey',v.quiz_key,'quizRevision',v.revision,'questionIds',all_ids,'questionRevisions',revisions,
 'attempt',jsonb_build_object('id',aid,'quizId',v.id,'visitId',a.visit_id),'changedAt',p->>'at',
 'state',case when idx=n and a.completed then 'completed' else 'active' end,
 'run',r||jsonb_build_object('answers',stored_answers,'score',a.correct_count,'wrongIds',wrong));
 insert into public.lt_quiz_progress(attempt_id,visitor_id,quiz_version_id,status,snapshot,client_sequence)
 values(aid,uid,v.id,canonical->>'state',canonical,seq)
 on conflict(attempt_id) do update set status=excluded.status,snapshot=excluded.snapshot,client_sequence=excluded.client_sequence,updated_at=now();
end $$;
revoke all on function public.lt_save_progress(jsonb) from public,anon;
grant execute on function public.lt_save_progress(jsonb) to authenticated;

create function public.lt_abandon_progress(p jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a public.lt_attempts; uid uuid:=auth.uid(); aid uuid:=(p->>'attemptId')::uuid;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into a from public.lt_attempts where id=aid and visitor_id=uid for update;
 if not found or a.visit_id<>(p->>'visitId')::uuid then raise exception 'Progress ownership mismatch'; end if;
 if pg_column_size(p)>65536 then raise exception 'Invalid progress'; end if;
 insert into public.lt_quiz_progress(attempt_id,visitor_id,quiz_version_id,status,snapshot,client_sequence,abandoned_at)
 values(aid,uid,a.quiz_version_id,case when a.completed then 'completed' else 'abandoned' end,
 jsonb_set(coalesce(p->'snapshot','{}'::jsonb),'{state}',to_jsonb(case when a.completed then 'completed' else 'abandoned' end::text)),
 (p->>'sequence')::bigint,case when a.completed then null else now() end)
 on conflict(attempt_id) do update set status=excluded.status,
 snapshot=jsonb_set(lt_quiz_progress.snapshot,'{state}',to_jsonb(excluded.status)),
 abandoned_at=coalesce(lt_quiz_progress.abandoned_at,excluded.abandoned_at),updated_at=now(),
 client_sequence=greatest(lt_quiz_progress.client_sequence,excluded.client_sequence);
end $$;
revoke all on function public.lt_abandon_progress(jsonb) from public,anon;
grant execute on function public.lt_abandon_progress(jsonb) to authenticated;

create function public.lt_resume_progress() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x.snapshot order by x.updated_at desc),'[]'::jsonb) from (
 select distinct on(v.quiz_key) p.snapshot,p.updated_at from public.lt_quiz_progress p
 join public.lt_quiz_versions v on v.id=p.quiz_version_id
 where p.visitor_id=auth.uid() and p.status<>'abandoned'
 order by v.quiz_key,p.updated_at desc,p.attempt_id desc) x
$$;
revoke all on function public.lt_resume_progress() from public,anon;
grant execute on function public.lt_resume_progress() to authenticated;

-- Stable part keys let the browser explain why a changed revision cannot be resumed.
create or replace function public.lt_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'quizKey',v.quiz_key,'title',v.title,'isTest',v.is_test,'revision',v.revision,
 'questions',(select jsonb_agg(jsonb_build_object('id',q.id,'questionKey',q.question_key,'revision',q.revision,'kind',q.kind,
 'question',q.prompt,'options',q.options,'correctOption',q.correct_option,'correctOptions',q.correct_options,
 'hint',q.hint,'feedback',q.feedback,'explanation',q.explanation,'points',q.points) order by i.position)
 from public.lt_quiz_items i join public.lt_question_versions q on q.id=i.question_version_id where i.quiz_version_id=v.id)) order by v.quiz_key),'[]'::jsonb)
 from public.lt_quiz_versions v where v.published and v.listed
 and v.revision=(select max(x.revision) from public.lt_quiz_versions x where x.quiz_key=v.quiz_key and x.published)
$$;
notify pgrst,'reload schema';
commit;
