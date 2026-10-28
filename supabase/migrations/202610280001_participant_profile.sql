-- 참여자 직장 경험(사무실 첫 팝업에서 한 번 고름)을 학습 기록(lt_events)에 저장한다.
-- 202610220001_cardnews_self_check.sql 다음에 한 번 실행. 기존 기록은 지우지 않는다.
-- 같은 방식(이름 바꾸기 + 감싸기)으로 기존 검사 규칙은 그대로 두고 'participant_profile' 만 새로 받는다.
-- experience: pre_job(취업 전) · under_1m(입사 1개월 이내) · 1m_1y(1개월 초과~1년 이내) · over_1y(1년 초과) · no_answer(응답하지 않음)
begin;

alter function public.lt_ingest(jsonb) rename to lt_ingest_before_profile;
revoke all on function public.lt_ingest_before_profile(jsonb) from public,anon,authenticated;

create function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); eid uuid := (p->>'id')::uuid; vid uuid := (p->>'visitId')::uuid;
 at_time timestamptz := (p->>'at')::timestamptz; old_event public.lt_events;
begin
 if p->>'type' is distinct from 'participant_profile' then
   perform public.lt_ingest_before_profile(p);
   return;
 end if;
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if eid is null or vid is null or at_time is null or (p->>'sequence')::bigint is null then raise exception 'Missing event identity'; end if;
 if pg_column_size(p) > 1024 then raise exception 'Event too large'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into old_event from public.lt_events where id=eid;
 if found then
   if old_event.visitor_id<>uid or old_event.payload<>p then raise exception 'Event ID conflict'; end if;
   return;
 end if;
 if not exists(select 1 from public.lt_visits where id=vid and visitor_id=uid) then raise exception 'Visit ownership mismatch'; end if;
 if coalesce(p->>'experience','') not in ('pre_job','under_1m','1m_1y','over_1y','no_answer') then raise exception 'Invalid experience'; end if;
 insert into public.lt_events values(eid,uid,vid,'participant_profile',at_time,now(),(p->>'sequence')::bigint,p);
end $$;
revoke all on function public.lt_ingest(jsonb) from public,anon;
grant execute on function public.lt_ingest(jsonb) to authenticated;

-- 관리자용: 참여자마다 가장 최근에 고른 직장 경험 (Supabase 대시보드 SQL 편집기에서 조회)
create view public.lt_participant_profiles with (security_invoker=true) as
select distinct on (visitor_id) visitor_id, payload->>'experience' as experience, occurred_at
from public.lt_events where event_type='participant_profile'
order by visitor_id, occurred_at desc;
revoke all on public.lt_participant_profiles from public,anon,authenticated;

-- 관리자용: 직장 경험별 AI 팀장 첫 시도 평균 점수 (simulation_attempts.user_id = 같은 익명 사용자)
create view public.simulation_by_experience with (security_invoker=true) as
select coalesce(p.experience,'unknown') as experience, a.scenario_id, a.category,
 count(*) as attempts, round(avg(a.total_score),1) as avg_total
from public.simulation_attempts a left join public.lt_participant_profiles p on p.visitor_id = a.user_id
where a.attempt = 1 and not a.fallback and a.total_score is not null
group by coalesce(p.experience,'unknown'), a.scenario_id, a.category;
revoke all on public.simulation_by_experience from public,anon,authenticated;

commit;
