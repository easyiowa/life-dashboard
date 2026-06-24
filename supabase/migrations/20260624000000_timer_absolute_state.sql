-- Persists the active focus-timer session so it survives page reloads/closed tabs and can be
-- driven headlessly (e.g. a Telegram bot hitting a backend route to start/stop a session) — the
-- web dashboard re-derives elapsed time from timer_started_at on load instead of relying on any
-- client-only counter, so it "catches up" to real elapsed time the instant it's opened.
--
-- timer_running + timer_started_at + timer_committed_secs together encode the same state the
-- client reducer already tracks in memory (running / startedAt / committedSecs):
--   - timer_running = false                       → fully stopped/paused, no segment in flight
--   - timer_running = true, timer_started_at = t   → currently running; elapsed = committed + (now - t)
--   - timer_committed_secs                         → accumulated seconds from prior segments of this same task
--
-- active_task_id is nullable + ON DELETE SET NULL so deleting the task a bot-started timer
-- points at can't leave an orphaned/inconsistent running state.
-- active_task_snapshot carries the display fields (title/project/sphere/estimatedMinutes) the
-- UI needs immediately on load, without an extra join, and so they survive even if the task
-- itself is later edited or removed mid-session.

ALTER TABLE user_dashboard_state
  ADD COLUMN IF NOT EXISTS active_task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_task_snapshot   JSONB,
  ADD COLUMN IF NOT EXISTS timer_running          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timer_started_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timer_committed_secs   INT NOT NULL DEFAULT 0;
