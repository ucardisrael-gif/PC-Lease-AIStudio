CREATE TABLE staff_permissions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  permission TEXT NOT NULL CHECK (permission IN ('orders','catalog','content')),
  PRIMARY KEY (user_id,permission)
);
CREATE TABLE staff_permission_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_permissions JSONB NOT NULL,
  new_permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
