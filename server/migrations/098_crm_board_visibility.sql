-- Board-specific card visibility falls back to the existing global setting.
CREATE TABLE crm_work_board_visibility (
 board_id TEXT NOT NULL REFERENCES crm_work_boards(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 scope TEXT NOT NULL CHECK (scope IN ('inherit','all','own')),
 updated_by TEXT NOT NULL REFERENCES users(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (board_id,user_id)
);
CREATE TABLE crm_work_board_visibility_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 board_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 old_scope TEXT NOT NULL CHECK (old_scope IN ('inherit','all','own')),
 new_scope TEXT NOT NULL CHECK (new_scope IN ('inherit','all','own')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER crm_work_board_visibility_history_no_change BEFORE UPDATE OR DELETE ON crm_work_board_visibility_history FOR EACH ROW EXECUTE FUNCTION crm_work_events_immutable();
