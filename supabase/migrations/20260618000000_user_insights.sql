-- Per-user onboarding selections, used by the Founder Dashboard's
-- "User Insights Overview" tab.
create table if not exists user_insights (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  intents          text[]      not null default '{}',
  industries       text[]      not null default '{}',
  custom_industry  text,
  selected_widgets text[]      not null default '{}',
  updated_at       timestamptz not null default now()
);

alter table user_insights enable row level security;

-- Each user can only write their own row (id must match their auth uuid).
create policy "Users insert own insights row"
  on user_insights for insert
  with check (auth.uid() = id);

create policy "Users update own insights row"
  on user_insights for update
  using (auth.uid() = id);

-- Cross-user reads are restricted to the founder account — this table holds
-- every user's name, intent and industry selections, so it must not be
-- readable by other authenticated users via the anon key.
create policy "Founder reads all insights"
  on user_insights for select
  using (auth.jwt() ->> 'email' = 'iowa.olaf@googlemail.com');
