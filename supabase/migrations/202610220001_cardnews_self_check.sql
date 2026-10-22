-- 카드뉴스 학습 전 · 후 자기평가(1~5점)를 학습 기록(lt_events)에 저장한다.
-- 202610200002_quiz_progress.sql 다음에 한 번 실행. 기존 기록은 지우지 않는다.
-- 같은 방식(이름 바꾸기 + 감싸기)으로 기존 검사 규칙은 그대로 두고 'cardnews_self_check' 만 새로 받는다.
begin;

alter function public.lt_ingest(jsonb) rename to lt_ingest_before_self_check;
revoke all on function public.lt_ingest_before_self_check(jsonb) from public,anon,authenticated;

create function public.lt_ingest(p jsonb) returns void language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); eid uuid := (p->>'id')::uuid; vid uuid := (p->>'visitId')::uuid;
 at_time timestamptz := (p->>'at')::timestamptz; old_event public.lt_events; score integer;
begin
 if p->>'type' is distinct from 'cardnews_self_check' then
   perform public.lt_ingest_before_self_check(p);
   return;
 end if;
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if eid is null or vid is null or at_time is null or (p->>'sequence')::bigint is null then raise exception 'Missing event identity'; end if;
 if pg_column_size(p) > 2048 then raise exception 'Event too large'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into old_event from public.lt_events where id=eid;
 if found then
   if old_event.visitor_id<>uid or old_event.payload<>p then raise exception 'Event ID conflict'; end if;
   return;
 end if;
 if not exists(select 1 from public.lt_visits where id=vid and visitor_id=uid) then raise exception 'Visit ownership mismatch'; end if;
 if coalesce(p->>'contentId','') !~ '^[a-z0-9-]{1,80}$' then raise exception 'Invalid content id'; end if;
 if p->>'phase' not in ('before','after') then raise exception 'Invalid phase'; end if;
 score := (p->>'score')::integer;
 if score is null or score not between 1 and 5 then raise exception 'Invalid score'; end if;
 insert into public.lt_events values(eid,uid,vid,'cardnews_self_check',at_time,now(),(p->>'sequence')::bigint,p);
end $$;
revoke all on function public.lt_ingest(jsonb) from public,anon;
grant execute on function public.lt_ingest(jsonb) to authenticated;

-- 관리자용: 카드뉴스별 학습 전 → 학습 후 평균 점수 (Supabase 대시보드 SQL 편집기에서 조회)
create view public.lt_cardnews_self_check_summary with (security_invoker=true) as
select payload->>'contentId' as content_id,
 count(*) filter (where payload->>'phase'='before') as before_count,
 round(avg((payload->>'score')::integer) filter (where payload->>'phase'='before'),2) as before_avg,
 count(*) filter (where payload->>'phase'='after') as after_count,
 round(avg((payload->>'score')::integer) filter (where payload->>'phase'='after'),2) as after_avg
from public.lt_events where event_type='cardnews_self_check'
group by payload->>'contentId';
revoke all on public.lt_cardnews_self_check_summary from public,anon,authenticated;

commit;
