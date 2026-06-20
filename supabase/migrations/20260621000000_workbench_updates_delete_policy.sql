-- workbench_updates was missing a DELETE policy, so RLS silently
-- blocked admin deletes (0 rows affected, no error).
create policy "Admins delete updates"
  on workbench_updates for delete
  using (is_admin(auth.jwt() ->> 'email'));
