-- 1. Rename any old "Random" projects to "Simple Tasks"
UPDATE public.projects
SET name = 'Simple Tasks', emoji = '📝'
WHERE name = 'Random';

-- 2. Backfill a "Simple Tasks" project for any area that is missing one
INSERT INTO public.projects (id, user_id, sphere_id, name, emoji, status, created_at, updated_at, sort_order)
SELECT
  gen_random_uuid(),
  s.user_id,
  s.id AS sphere_id,
  'Simple Tasks',
  '📝',
  'on-track',
  now(),
  now(),
  0
FROM public.spheres s
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.sphere_id = s.id AND p.name = 'Simple Tasks'
);
