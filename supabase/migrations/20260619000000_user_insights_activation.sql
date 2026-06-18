-- Per-widget activation tracking, used by the "newly added widget" indicator
-- in the Founder Dashboard's User Insights view.
alter table user_insights
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists widget_activated_at jsonb       not null default '{}'::jsonb;

-- Users need to read their own row back when merging activation timestamps
-- on save (e.g. adding a widget later from Settings). The existing founder
-- policy still covers the cross-user admin view.
create policy "Users read own insights row"
  on user_insights for select
  using (auth.uid() = id);
