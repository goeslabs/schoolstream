-- Run in Supabase SQL Editor.
-- Ensures every new auth user gets a profile row.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  status text not null default 'pending',
  role text not null default 'parent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists status text not null default 'pending',
  add column if not exists role text not null default 'parent',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles alter column email set not null;

create unique index if not exists profiles_email_key on public.profiles (email);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, status, role)
    values (new.id, new.email, 'pending', 'parent')
    on conflict (id) do update set
      email = excluded.email,
      status = excluded.status,
      role = excluded.role,
      updated_at = now();
  exception
    when unique_violation then
      -- Handles cases where a stale profile row with the same email already exists.
      update public.profiles
      set
        id = new.id,
        status = 'pending',
        role = 'parent',
        updated_at = now()
      where lower(email) = lower(new.email);
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
