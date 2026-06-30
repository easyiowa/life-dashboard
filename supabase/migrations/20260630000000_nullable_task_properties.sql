-- Make priority and energy fully optional: nullable AND no column default.
-- Dropping NOT NULL alone isn't enough — Postgres still substitutes the DEFAULT
-- value ('Med'/'Flow') when a row is inserted without specifying those columns.
-- Dropping the DEFAULT too means the only way a non-null value lands in these
-- columns is if the caller explicitly provides one, giving the UI full control.
-- urgency is left NOT NULL / DEFAULT 'not-urgent' (no pill; always has a value).

ALTER TABLE public.tasks ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN priority DROP DEFAULT;

ALTER TABLE public.tasks ALTER COLUMN energy  DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN energy  DROP DEFAULT;
