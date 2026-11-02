-- Per-board restrictions never grant rights absent from the platform role.
ALTER TABLE crm_work_board_visibility ADD COLUMN allow_edit BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE crm_work_board_visibility ADD COLUMN allow_archive BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE crm_work_board_visibility ADD COLUMN allow_manage BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE crm_work_board_action_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 board_id TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 actor_id TEXT NOT NULL REFERENCES users(id),
 old_permissions JSONB NOT NULL,
 new_permissions JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER crm_work_board_action_history_no_change BEFORE UPDATE OR DELETE ON crm_work_board_action_history FOR EACH ROW EXECUTE FUNCTION crm_work_events_immutable();
