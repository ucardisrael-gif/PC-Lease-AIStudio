ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN organization_link_version INTEGER NOT NULL DEFAULT 1 CHECK (organization_link_version > 0);
CREATE INDEX users_organization_id ON users(organization_id);
CREATE TABLE user_organization_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  previous_organization_name TEXT,
  new_organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  new_organization_name TEXT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_organization_history_user_id ON user_organization_history(user_id,id);
