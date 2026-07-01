-- Fix: admins were missing a DELETE policy on workbench_feedback, causing
-- silent no-ops (0 rows affected, no error) when resolving feedback items.
create policy "Admins delete feedback"
  on workbench_feedback for delete
  using (is_admin(auth.jwt() ->> 'email'));

-- Text-only archive of resolved feedback.
-- Screenshot URLs are intentionally excluded to conserve storage space.
create table if not exists workbench_feedback_archive (
  id                  uuid primary key default gen_random_uuid(),
  original_id         uuid,
  user_nickname       text,
  message             text        not null,
  original_created_at timestamptz,
  archived_at         timestamptz not null default now()
);

alter table workbench_feedback_archive enable row level security;

create policy "Admins insert archive"
  on workbench_feedback_archive for insert
  with check (is_admin(auth.jwt() ->> 'email'));

create policy "Admins read archive"
  on workbench_feedback_archive for select
  using (is_admin(auth.jwt() ->> 'email'));
