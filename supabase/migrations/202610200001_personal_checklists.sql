begin;

create function public.valid_personal_items(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := '{}';
begin
  if jsonb_typeof(value) <> 'array' then return false; end if;
  if jsonb_array_length(value) not between 1 and 100 or octet_length(value::text) > 250000 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or (item->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'text') is distinct from 'string'
      or length(btrim(item->>'text')) not between 1 and 500
      or jsonb_typeof(item->'checked') is distinct from 'boolean'
      or (item->>'id') = any(ids) then return false; end if;
    ids := array_append(ids, item->>'id');
  end loop;
  return true;
end $$;

create table public.personal_checklists (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  items jsonb not null check (public.valid_personal_items(items)),
  pinned boolean not null default false,
  position jsonb check (position is null or (
    jsonb_typeof(position) = 'object' and
    jsonb_typeof(position->'x') = 'number' and jsonb_typeof(position->'y') = 'number' and
    (position->>'x')::numeric between 0 and 1 and (position->>'y')::numeric between 0 and 1
    and position ? 'x' and position ? 'y')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index personal_checklists_owner_idx on public.personal_checklists(user_id, updated_at desc, id) where deleted_at is null;
create function public.touch_personal_checklist() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id then raise exception 'Checklist identity is immutable'; end if;
  new.created_at := old.created_at;
  new.revision := old.revision + 1; new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger personal_checklist_updated before update on public.personal_checklists
  for each row execute function public.touch_personal_checklist();
alter table public.personal_checklists enable row level security;
alter table public.personal_checklists force row level security;
revoke all on public.personal_checklists from public, anon;
grant select, insert, update, delete on public.personal_checklists to authenticated;
create policy "Read own personal checklists" on public.personal_checklists for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own personal checklists" on public.personal_checklists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own personal checklists" on public.personal_checklists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own personal checklists" on public.personal_checklists for delete to authenticated using ((select auth.uid()) = user_id);
commit;
