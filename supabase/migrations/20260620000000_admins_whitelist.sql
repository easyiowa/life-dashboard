-- Admin whitelist backing the "Manage Admins" screen. Replaces the
-- single-hardcoded-email checks previously baked into RLS policies.
create table if not exists admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- security definer so policies that call this can check membership without
-- needing their own broad SELECT grant on `admins` (avoids RLS recursion).
create or replace function is_admin(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where email = check_email);
$$;

-- Anyone can check whether their own email is on the list — used by the
-- client to decide whether to show admin-only UI at all.
create policy "Users check own admin status"
  on admins for select
  using (auth.jwt() ->> 'email' = email);

-- Existing admins can see the full roster (Manage Admins screen).
create policy "Admins read full list"
  on admins for select
  using (is_admin(auth.jwt() ->> 'email'));

-- Only existing admins can add new admins — prevents arbitrary privilege escalation.
create policy "Admins add admins"
  on admins for insert
  with check (is_admin(auth.jwt() ->> 'email'));

-- Seed the owner so the system can never be locked out of itself.
insert into admins (email) values ('iowa.olaf@googlemail.com')
  on conflict (email) do nothing;

-- Swap every hardcoded-email policy (applied directly to this project before
-- migrations existed for it) for whitelist-membership checks via is_admin().

-- user_insights
drop policy if exists "Founder reads all insights" on user_insights;
drop policy if exists "Allow founder email to read all insights" on user_insights;

create policy "Admins read all insights"
  on user_insights for select
  using (is_admin(auth.jwt() ->> 'email'));

-- workbench_feedback
drop policy if exists "Founder reads feedback" on workbench_feedback;
drop policy if exists "Founder updates feedback" on workbench_feedback;

create policy "Admins read feedback"
  on workbench_feedback for select
  using (is_admin(auth.jwt() ->> 'email'));

create policy "Admins update feedback"
  on workbench_feedback for update
  using (is_admin(auth.jwt() ->> 'email'));

-- workbench_updates
drop policy if exists "Founder inserts updates" on workbench_updates;
drop policy if exists "Founder reads all updates" on workbench_updates;
drop policy if exists "Founder updates updates" on workbench_updates;

create policy "Admins insert updates"
  on workbench_updates for insert
  with check (is_admin(auth.jwt() ->> 'email'));

create policy "Admins read all updates"
  on workbench_updates for select
  using (is_admin(auth.jwt() ->> 'email'));

create policy "Admins update updates"
  on workbench_updates for update
  using (is_admin(auth.jwt() ->> 'email'));
