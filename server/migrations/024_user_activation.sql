ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE user_activation_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 old_active BOOLEAN NOT NULL,
 new_active BOOLEAN NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_activation_history_user ON user_activation_history(user_id,created_at DESC,id DESC);
