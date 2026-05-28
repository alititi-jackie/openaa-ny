-- Allow authors to read their own non-deleted posts in management pages.
-- Public read policies remain limited to published/active content.

begin;

drop policy if exists "Users can read own job postings" on public.job_postings;
create policy "Users can read own job postings"
  on public.job_postings
  for select
  to authenticated
  using (auth.uid() = user_id and status <> 'deleted');

drop policy if exists "Users can read own housing posts" on public.housing_posts;
create policy "Users can read own housing posts"
  on public.housing_posts
  for select
  to authenticated
  using (auth.uid() = user_id and status <> 'deleted');

drop policy if exists "Users can read own secondhand items" on public.secondhand_items;
create policy "Users can read own secondhand items"
  on public.secondhand_items
  for select
  to authenticated
  using (auth.uid() = user_id and status <> 'deleted');

commit;
