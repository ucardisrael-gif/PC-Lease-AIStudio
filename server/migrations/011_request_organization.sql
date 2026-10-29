ALTER TABLE requests ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE requests ADD COLUMN organization_link_version INTEGER NOT NULL DEFAULT 1 CHECK (organization_link_version > 0);
CREATE INDEX requests_organization_id ON requests(organization_id);
CREATE TABLE request_organization_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  previous_organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  previous_organization_name TEXT,
  new_organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  new_organization_name TEXT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_organization_history_request_id ON request_organization_history(request_id,id);
