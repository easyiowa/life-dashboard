-- agent_actions_queue: durable action dispatch from the Benicio Telegram agent.
-- Replaces file-based agent-pending.json. Service role key bypasses RLS on insert;
-- frontend (authenticated users) reads and deletes its own processed rows.

CREATE TABLE IF NOT EXISTS agent_actions_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}',
  is_sample     BOOLEAN     NOT NULL DEFAULT false,
  queued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_actions_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_agent_actions"
  ON agent_actions_queue FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_agent_actions"
  ON agent_actions_queue FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
