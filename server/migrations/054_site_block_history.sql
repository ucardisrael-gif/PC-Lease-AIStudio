CREATE TABLE site_block_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 block_key TEXT NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_content JSONB NOT NULL,
 new_content JSONB NOT NULL,
 new_version INTEGER NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX site_block_history_key ON site_block_history(block_key,id DESC);
CREATE TRIGGER site_block_history_no_update_delete BEFORE UPDATE OR DELETE ON site_block_history FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
