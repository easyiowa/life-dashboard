-- =============================================================================
-- Life Dashboard — Phase 1 Initial Schema
-- Generated: 2026-06-13
-- Maps exactly to DashboardContext.tsx type definitions.
-- =============================================================================

-- ── Prerequisites ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
-- TABLES (ordered to satisfy FK constraints)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. spheres  (life areas / "Life Spheres")
--    TypeScript: Sphere { id, name, labelColor, description? }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spheres (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  label_color  TEXT NOT NULL DEFAULT 'violet',
  description  TEXT,
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. tags  (project classification labels)
--    TypeScript: Tag { id, label, color }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'violet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. projects  (belong to a sphere; decorated with emoji and status)
--    TypeScript: Project { id, sphere, name, emoji?, tagIds[], status, milestone }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id  UUID REFERENCES spheres(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '📁',
  status     TEXT NOT NULL DEFAULT 'on-track'
             CHECK (status IN ('ahead', 'on-track', 'at-risk')),
  milestone  TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. project_tags  (many-to-many: projects ↔ tags)
--    TypeScript: Project.tagIds string[]
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tags (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. tasks
--    TypeScript: Task { id, sphere, project, title, priority, energy, urgency,
--                       done, deadline, notes, manualMinutes, queuedDate,
--                       timeSpentMinutes, intent, dailyTargetMinutes,
--                       rolloverCount, dailyTracking }
--
--    daily_tracking stores Record<YYYY-MM-DD, DailyTrackingEntry> as JSONB.
--    Schema: { timeSpentMinutes: number, intent: string, dailyTargetMinutes: number|null }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id            UUID REFERENCES spheres(id)  ON DELETE SET NULL,
  project_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  priority             TEXT NOT NULL DEFAULT 'Med'
                       CHECK (priority IN ('High', 'Med', 'Low')),
  energy               TEXT NOT NULL DEFAULT 'Flow'
                       CHECK (energy IN ('Flow', 'Quick', 'Easy')),
  urgency              TEXT NOT NULL DEFAULT 'not-urgent'
                       CHECK (urgency IN ('urgent', 'not-urgent')),
  done                 BOOLEAN NOT NULL DEFAULT false,
  deadline             DATE,
  notes                TEXT NOT NULL DEFAULT '',
  manual_minutes       INT  NOT NULL DEFAULT 0,
  queued_date          DATE,
  time_spent_minutes   INT  NOT NULL DEFAULT 0,
  intent               TEXT DEFAULT 'finish'
                       CHECK (intent IN ('finish', 'time', 'maybe')),
  daily_target_minutes INT,
  rollover_count       INT  NOT NULL DEFAULT 0,
  -- Per-date isolated tracking: { "YYYY-MM-DD": { timeSpentMinutes, intent, dailyTargetMinutes } }
  daily_tracking       JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. focus_sessions  (completed Pomodoro/focus blocks)
--    TypeScript: FocusSession { id, taskName, project?, sphere?,
--                               durationSeconds, completedAt, completedAtDateString, isManual? }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_sessions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id                   UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_name                 TEXT NOT NULL,
  project_name              TEXT,
  sphere_name               TEXT,
  duration_seconds          INT  NOT NULL CHECK (duration_seconds >= 0),
  is_manual                 BOOLEAN NOT NULL DEFAULT false,
  completed_at              TIMESTAMPTZ NOT NULL,
  completed_at_date_string  DATE NOT NULL   -- local-timezone date for day-grouping
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. habits
--    TypeScript: Habit { id, title, type, routine?, frequency, targetCount, emoji, notes, history }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('start', 'stop')),
  routine      TEXT NOT NULL DEFAULT 'day'
               CHECK (routine IN ('morning', 'day', 'evening')),
  frequency    TEXT NOT NULL
               CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  target_count INT  NOT NULL DEFAULT 1 CHECK (target_count >= 1),
  emoji        TEXT NOT NULL DEFAULT '⭐',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. habit_completions  (normalized from Habit.history Record<YYYY-MM-DD, boolean>)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_completions (
  habit_id     UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_on DATE NOT NULL,
  PRIMARY KEY (habit_id, completed_on)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. quick_notes
--    TypeScript: QuickNote { id, text, sphere, projectId?, createdAt, isImportant? }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id    UUID REFERENCES spheres(id)  ON DELETE SET NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  text         TEXT NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. relationship_groups  (network contact categories)
--     TypeScript: RelationshipGroup { id, label, emoji, color: GroupColor }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relationship_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '👥',
  color      TEXT NOT NULL DEFAULT 'violet'
             CHECK (color IN ('rose','sky','amber','emerald','violet','teal','orange','pink')),
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. network_contacts
--     TypeScript: NetworkContact { id, name, relationshipType, birthday,
--                                  notes, lastTouchpoint, events[], cycleCompleted }
--     Note: relationshipType is denormalized as group_label for display;
--           relationship_group_id is the canonical FK.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  relationship_group_id UUID REFERENCES relationship_groups(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  birthday              DATE,
  notes                 TEXT NOT NULL DEFAULT '',
  last_touchpoint       DATE,
  cycle_completed       BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. contact_events  (normalized from NetworkContact.events ContactEvent[])
--     TypeScript: ContactEvent { id, title, date, notes, completed }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID NOT NULL REFERENCES network_contacts(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT '',
  event_date   DATE,
  notes        TEXT NOT NULL DEFAULT '',
  completed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. recurring_tasks
--     TypeScript: RecurringTask { id, title, notes, intervalDays, intervalLabel,
--                                 anchorDay?, startDate?, sphere, lastDoneDate,
--                                 completionCount, history[] }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id        UUID REFERENCES spheres(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  notes            TEXT NOT NULL DEFAULT '',
  interval_days    INT  NOT NULL CHECK (interval_days > 0),
  interval_label   TEXT NOT NULL,
  anchor_day       INT  CHECK (anchor_day BETWEEN 1 AND 28),  -- legacy field
  start_date       DATE,                                       -- primary cycle anchor
  last_done_date   DATE,
  completion_count INT  NOT NULL DEFAULT 0 CHECK (completion_count >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. recurring_task_history  (normalized from RecurringTask.history)
--     TypeScript: RecurringHistoryEntry { id, completedAt: string }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_task_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_task_id UUID NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  completed_at      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. historical_logs  (nightly day-lock summaries)
--     TypeScript: HistoricalLog { date, dayVelocity, recap,
--                                 completedTasks[], rolledOverTasks[],
--                                 taskMeta?, mindStateClosure? }
--     task_meta:          Record<taskId, TaskArchiveMeta>
--     mind_state_closure: MindStateClosure | null
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historical_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  day_velocity         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  recap                TEXT NOT NULL DEFAULT '',
  completed_tasks      TEXT[] NOT NULL DEFAULT '{}',
  rolled_over_tasks    TEXT[] NOT NULL DEFAULT '{}',
  -- { taskId: { intent, target, minutes, goalMet } }
  task_meta            JSONB NOT NULL DEFAULT '{}',
  -- { morningMoodKey, morningMood, morningTags[], morningNote, endDelta, closureNote }
  mind_state_closure   JSONB,
  UNIQUE (user_id, date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. daily_check_ins  (mood / mindset tracking per day)
--     TypeScript: DailyCheckIn { date, moodKey, mood, tags[], note }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_check_ins (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  mood_key TEXT NOT NULL,
  mood     TEXT NOT NULL,
  tags     TEXT[] NOT NULL DEFAULT '{}',
  note     TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. user_dashboard_state  (per-user operational state that isn't entity data)
--     Mirrors: State.currentTrackingDate, State.yesterdayRecap
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_dashboard_state (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  yesterday_recap       TEXT NOT NULL DEFAULT '',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- INDEXES  (cover the most common read patterns)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_spheres_user          ON spheres           (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user             ON tags              (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user         ON projects          (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_sphere       ON projects          (sphere_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user            ON tasks             (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sphere          ON tasks             (sphere_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project         ON tasks             (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_queued_date     ON tasks             (user_id, queued_date) WHERE queued_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_done            ON tasks             (user_id, done);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user   ON focus_sessions    (user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date   ON focus_sessions    (user_id, completed_at_date_string);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task   ON focus_sessions    (task_id);
CREATE INDEX IF NOT EXISTS idx_habits_user           ON habits            (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions     ON habit_completions (habit_id, completed_on);
CREATE INDEX IF NOT EXISTS idx_quick_notes_user      ON quick_notes       (user_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_sphere    ON quick_notes       (sphere_id);
CREATE INDEX IF NOT EXISTS idx_rel_groups_user       ON relationship_groups (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user         ON network_contacts  (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_group        ON network_contacts  (relationship_group_id);
CREATE INDEX IF NOT EXISTS idx_contact_events        ON contact_events    (contact_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user        ON recurring_tasks   (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_history     ON recurring_task_history (recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_historical_logs_user  ON historical_logs   (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_user        ON daily_check_ins   (user_id, date DESC);


-- =============================================================================
-- ROW-LEVEL SECURITY
-- Every table is locked to its owner via auth.uid() = user_id.
-- The Supabase service_role key bypasses RLS — never expose it client-side.
-- =============================================================================

-- Helper macro: repeated policy pattern (SELECT / INSERT / UPDATE / DELETE)
-- Applied manually per table below for clarity and auditability.

-- ── spheres ──────────────────────────────────────────────────────────────────
ALTER TABLE spheres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spheres: owner select"
  ON spheres FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "spheres: owner insert"
  ON spheres FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spheres: owner update"
  ON spheres FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spheres: owner delete"
  ON spheres FOR DELETE
  USING (auth.uid() = user_id);

-- ── tags ─────────────────────────────────────────────────────────────────────
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: owner select" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tags: owner insert" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tags: owner update" ON tags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tags: owner delete" ON tags FOR DELETE USING (auth.uid() = user_id);

-- ── projects ─────────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: owner select" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects: owner insert" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects: owner update" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects: owner delete" ON projects FOR DELETE USING (auth.uid() = user_id);

-- ── project_tags  (no user_id column — derive ownership through projects) ────
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_tags: owner select"
  ON project_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_tags.project_id
      AND projects.user_id = auth.uid()
  ));

CREATE POLICY "project_tags: owner insert"
  ON project_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_tags.project_id
      AND projects.user_id = auth.uid()
  ));

CREATE POLICY "project_tags: owner delete"
  ON project_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_tags.project_id
      AND projects.user_id = auth.uid()
  ));

-- ── tasks ─────────────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: owner select" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks: owner insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks: owner update" ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks: owner delete" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- ── focus_sessions ────────────────────────────────────────────────────────────
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_sessions: owner select" ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_sessions: owner insert" ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_sessions: owner update" ON focus_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_sessions: owner delete" ON focus_sessions FOR DELETE USING (auth.uid() = user_id);

-- ── habits ────────────────────────────────────────────────────────────────────
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits: owner select" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits: owner insert" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits: owner update" ON habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits: owner delete" ON habits FOR DELETE USING (auth.uid() = user_id);

-- ── habit_completions  (derive ownership through habits) ──────────────────────
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_completions: owner select"
  ON habit_completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()));

CREATE POLICY "habit_completions: owner insert"
  ON habit_completions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()));

CREATE POLICY "habit_completions: owner delete"
  ON habit_completions FOR DELETE
  USING (EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()));

-- ── quick_notes ───────────────────────────────────────────────────────────────
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_notes: owner select" ON quick_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quick_notes: owner insert" ON quick_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quick_notes: owner update" ON quick_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quick_notes: owner delete" ON quick_notes FOR DELETE USING (auth.uid() = user_id);

-- ── relationship_groups ───────────────────────────────────────────────────────
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relationship_groups: owner select" ON relationship_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "relationship_groups: owner insert" ON relationship_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relationship_groups: owner update" ON relationship_groups FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relationship_groups: owner delete" ON relationship_groups FOR DELETE USING (auth.uid() = user_id);

-- ── network_contacts ──────────────────────────────────────────────────────────
ALTER TABLE network_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "network_contacts: owner select" ON network_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "network_contacts: owner insert" ON network_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "network_contacts: owner update" ON network_contacts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "network_contacts: owner delete" ON network_contacts FOR DELETE USING (auth.uid() = user_id);

-- ── contact_events  (derive ownership through network_contacts) ───────────────
ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_events: owner select"
  ON contact_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM network_contacts WHERE network_contacts.id = contact_events.contact_id AND network_contacts.user_id = auth.uid()));

CREATE POLICY "contact_events: owner insert"
  ON contact_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM network_contacts WHERE network_contacts.id = contact_events.contact_id AND network_contacts.user_id = auth.uid()));

CREATE POLICY "contact_events: owner update"
  ON contact_events FOR UPDATE
  USING (EXISTS (SELECT 1 FROM network_contacts WHERE network_contacts.id = contact_events.contact_id AND network_contacts.user_id = auth.uid()));

CREATE POLICY "contact_events: owner delete"
  ON contact_events FOR DELETE
  USING (EXISTS (SELECT 1 FROM network_contacts WHERE network_contacts.id = contact_events.contact_id AND network_contacts.user_id = auth.uid()));

-- ── recurring_tasks ───────────────────────────────────────────────────────────
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_tasks: owner select" ON recurring_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_tasks: owner insert" ON recurring_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_tasks: owner update" ON recurring_tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_tasks: owner delete" ON recurring_tasks FOR DELETE USING (auth.uid() = user_id);

-- ── recurring_task_history  (derive through recurring_tasks) ──────────────────
ALTER TABLE recurring_task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_task_history: owner select"
  ON recurring_task_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM recurring_tasks WHERE recurring_tasks.id = recurring_task_history.recurring_task_id AND recurring_tasks.user_id = auth.uid()));

CREATE POLICY "recurring_task_history: owner insert"
  ON recurring_task_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM recurring_tasks WHERE recurring_tasks.id = recurring_task_history.recurring_task_id AND recurring_tasks.user_id = auth.uid()));

CREATE POLICY "recurring_task_history: owner delete"
  ON recurring_task_history FOR DELETE
  USING (EXISTS (SELECT 1 FROM recurring_tasks WHERE recurring_tasks.id = recurring_task_history.recurring_task_id AND recurring_tasks.user_id = auth.uid()));

-- ── historical_logs ───────────────────────────────────────────────────────────
ALTER TABLE historical_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historical_logs: owner select" ON historical_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "historical_logs: owner insert" ON historical_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "historical_logs: owner update" ON historical_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "historical_logs: owner delete" ON historical_logs FOR DELETE USING (auth.uid() = user_id);

-- ── daily_check_ins ───────────────────────────────────────────────────────────
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_check_ins: owner select" ON daily_check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_check_ins: owner insert" ON daily_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_check_ins: owner update" ON daily_check_ins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_check_ins: owner delete" ON daily_check_ins FOR DELETE USING (auth.uid() = user_id);

-- ── user_dashboard_state ──────────────────────────────────────────────────────
ALTER TABLE user_dashboard_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_dashboard_state: owner select" ON user_dashboard_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_dashboard_state: owner insert" ON user_dashboard_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_dashboard_state: owner update" ON user_dashboard_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- TRIGGER: auto-update updated_at columns
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_spheres_updated_at
  BEFORE UPDATE ON spheres
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_network_contacts_updated_at
  BEFORE UPDATE ON network_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_dashboard_state_updated_at
  BEFORE UPDATE ON user_dashboard_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- TRIGGER: auto-provision user_dashboard_state on first sign-up
-- =============================================================================

CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_dashboard_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();
