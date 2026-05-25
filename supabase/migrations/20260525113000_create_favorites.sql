begin;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  target_url text not null,
  title text not null,
  image_url text,
  summary text,
  created_at timestamptz not null default now(),

  constraint favorites_target_type_check
    check (target_type in ('jobs', 'housing', 'secondhand', 'services', 'news', 'dmv')),

  constraint favorites_user_target_unique
    unique (user_id, target_type, target_id)
);

create index if not exists favorites_user_created_at_idx
  on public.favorites (user_id, created_at desc);

create index if not exists favorites_user_type_created_at_idx
  on public.favorites (user_id, target_type, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites"
on public.favorites
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites"
on public.favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
on public.favorites
for delete
using (auth.uid() = user_id);

commit;
