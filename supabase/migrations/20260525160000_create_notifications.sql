begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null default 'user',
  type text not null,
  title text not null,
  body text not null,
  link_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id),

  constraint notifications_audience_check
    check (audience in ('user')),

  constraint notifications_type_check
    check (type in ('system', 'announcement', 'account', 'content', 'favorite', 'dmv')),

  constraint notifications_title_length_check
    check (char_length(title) <= 200),

  constraint notifications_body_length_check
    check (char_length(body) <= 1000),

  constraint notifications_link_url_length_check
    check (link_url is null or char_length(link_url) <= 2048)
);

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_at_idx
  on public.notifications (user_id, read_at);

create index if not exists notifications_user_type_created_at_idx
  on public.notifications (user_id, type, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
revoke update (
  id,
  user_id,
  audience,
  type,
  title,
  body,
  link_url,
  metadata,
  created_at,
  expires_at,
  created_by
) on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

commit;
