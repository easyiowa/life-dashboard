-- Workbench feedback submitted from the WorkbenchBeacon drawer
create table if not exists workbench_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_nickname text,
  message       text        not null,
  created_at    timestamptz not null default now(),
  is_resolved   boolean     not null default false
);

-- Build update posts authored by the founder and shown in the drawer
create table if not exists workbench_updates (
  id         uuid primary key default gen_random_uuid(),
  title      text        not null,
  content    text        not null,
  status     text        not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

-- Only the service role (or a future founder-scoped policy) should write here.
-- Public read is intentionally open so the beacon drawer can fetch without auth.
alter table workbench_updates  enable row level security;
alter table workbench_feedback enable row level security;

-- Anyone can read published updates
create policy "Public read published updates"
  on workbench_updates for select
  using (status = 'published');

-- Anyone can insert feedback (anonymous submissions from the drawer)
create policy "Public insert feedback"
  on workbench_feedback for insert
  with check (true);

-- Founder reads all feedback and updates via service-role key (admin panel uses that key)
