begin;

create table public.checklist_completions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  record_key text not null check (record_key ~ '^[0-9a-f]{64}$'),
  completion_id text not null check (length(completion_id) between 1 and 100000),
  category text not null check (length(category) between 1 and 500),
  completed_at timestamptz not null,
  groups jsonb not null check (jsonb_typeof(groups) = 'array' and jsonb_array_length(groups) between 1 and 100 and octet_length(groups::text) <= 1000000),
  -- Keep a deletion tombstone so retrying a legacy import cannot resurrect it.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, record_key),
  constraint checklist_completions_matching_key check (record_key = encode(sha256(convert_to(completion_id, 'UTF8')), 'hex'))
);

create index checklist_completions_history_idx on public.checklist_completions (user_id, completed_at desc, record_key) where deleted_at is null;

alter table public.checklist_completions enable row level security;
alter table public.checklist_completions force row level security;

revoke all on public.checklist_completions from public, anon;
grant select, insert, update, delete on public.checklist_completions to authenticated;

create policy "Read own completions" on public.checklist_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own completions" on public.checklist_completions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own completions" on public.checklist_completions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own completions" on public.checklist_completions
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
