-- Dudu the otter assistant: per-row sample-data tagging + interaction metrics.
--
-- Table names here use the app's real schema names, not the literal names from
-- the request that drove this migration ("areas" -> spheres, "recurring_responsibilities"
-- -> recurring_tasks, "focus_timer" -> focus_sessions) — see DashboardContext.tsx for
-- the canonical table-name mapping.

alter table spheres            add column if not exists is_sample boolean not null default false;
alter table projects           add column if not exists is_sample boolean not null default false;
alter table tasks              add column if not exists is_sample boolean not null default false;
alter table habits             add column if not exists is_sample boolean not null default false;
alter table quick_notes        add column if not exists is_sample boolean not null default false;
alter table network_contacts   add column if not exists is_sample boolean not null default false;
alter table recurring_tasks    add column if not exists is_sample boolean not null default false;
alter table focus_sessions     add column if not exists is_sample boolean not null default false;

-- Tracks which Dudu trigger messages a user has already dismissed, so they never repeat
-- across sessions. Lives on user_dashboard_state since every account is guaranteed to
-- have exactly one row there (see onboardingSeeder.ts Step 0).
alter table user_dashboard_state
  add column if not exists dismissed_assistant_triggers text[] not null default '{}'::text[];

create table if not exists assistant_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  trigger_key  text not null,
  action_taken text not null,
  created_at   timestamptz not null default now()
);

alter table assistant_metrics enable row level security;

-- Each user can log their own interactions with Dudu.
create policy "Users insert own assistant metrics"
  on assistant_metrics for insert
  with check (auth.uid() = user_id);

-- The admin "Dudu's help" panel reads everyone's metrics.
create policy "Admins read all assistant metrics"
  on assistant_metrics for select
  using (is_admin(auth.jwt() ->> 'email'));
