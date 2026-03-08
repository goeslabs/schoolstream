-- Run in Supabase SQL Editor.
-- Required so logged-in users can read their own profile status/role.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Optional: allow users to update only their year_groups.
drop policy if exists "profiles_update_own_year_groups" on public.profiles;
create policy "profiles_update_own_year_groups"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
