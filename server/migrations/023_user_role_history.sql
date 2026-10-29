CREATE TABLE user_role_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 old_role TEXT NOT NULL CHECK (old_role IN ('admin','customer')),
 new_role TEXT NOT NULL CHECK (new_role IN ('admin','customer')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_role_history_user ON user_role_history(user_id,created_at DESC,id DESC);
