-- Add optional motivation / "why statement" column to habits.
-- Nullable TEXT so existing rows are unaffected and the field can remain empty.
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS motivation_why TEXT;
