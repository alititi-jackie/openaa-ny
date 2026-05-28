-- Add persistent admin-hidden markers to distinguish moderator takedowns
-- from a user's own hidden posts.

begin;

alter table public.job_postings
  add column if not exists admin_hidden boolean not null default false,
  add column if not exists admin_hidden_at timestamptz,
  add column if not exists admin_hidden_by text,
  add column if not exists admin_hidden_reason text;

alter table public.housing_posts
  add column if not exists admin_hidden boolean not null default false,
  add column if not exists admin_hidden_at timestamptz,
  add column if not exists admin_hidden_by text,
  add column if not exists admin_hidden_reason text;

alter table public.secondhand_items
  add column if not exists admin_hidden boolean not null default false,
  add column if not exists admin_hidden_at timestamptz,
  add column if not exists admin_hidden_by text,
  add column if not exists admin_hidden_reason text;

alter table public.service_posts
  add column if not exists admin_hidden boolean not null default false,
  add column if not exists admin_hidden_at timestamptz,
  add column if not exists admin_hidden_by text,
  add column if not exists admin_hidden_reason text;

create index if not exists job_postings_admin_hidden_idx
  on public.job_postings (admin_hidden);

create index if not exists housing_posts_admin_hidden_idx
  on public.housing_posts (admin_hidden);

create index if not exists secondhand_items_admin_hidden_idx
  on public.secondhand_items (admin_hidden);

create index if not exists service_posts_admin_hidden_idx
  on public.service_posts (admin_hidden);

create or replace function public.prevent_user_admin_hidden_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role / database admins may manage moderation fields.
  if coalesce(auth.role(), '') = 'service_role'
     or current_role in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.admin_hidden is distinct from false
       or new.admin_hidden_at is not null
       or new.admin_hidden_by is not null
       or new.admin_hidden_reason is not null then
      raise exception 'admin_hidden fields are managed by administrators';
    end if;

    return new;
  end if;

  if new.admin_hidden is distinct from old.admin_hidden
     or new.admin_hidden_at is distinct from old.admin_hidden_at
     or new.admin_hidden_by is distinct from old.admin_hidden_by
     or new.admin_hidden_reason is distinct from old.admin_hidden_reason then
    raise exception 'admin_hidden fields are managed by administrators';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_job_postings_admin_hidden on public.job_postings;
create trigger protect_job_postings_admin_hidden
  before insert or update on public.job_postings
  for each row execute function public.prevent_user_admin_hidden_mutation();

drop trigger if exists protect_housing_posts_admin_hidden on public.housing_posts;
create trigger protect_housing_posts_admin_hidden
  before insert or update on public.housing_posts
  for each row execute function public.prevent_user_admin_hidden_mutation();

drop trigger if exists protect_secondhand_items_admin_hidden on public.secondhand_items;
create trigger protect_secondhand_items_admin_hidden
  before insert or update on public.secondhand_items
  for each row execute function public.prevent_user_admin_hidden_mutation();

drop trigger if exists protect_service_posts_admin_hidden on public.service_posts;
create trigger protect_service_posts_admin_hidden
  before insert or update on public.service_posts
  for each row execute function public.prevent_user_admin_hidden_mutation();

commit;
