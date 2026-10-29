CREATE TABLE organization_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_data JSONB,
 new_data JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX organization_history_org ON organization_history(organization_id,id DESC);
