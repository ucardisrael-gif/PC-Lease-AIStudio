ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory','inventory_cost','service','contracts'));
CREATE TABLE contract_drafts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  order_snapshot JSONB NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status='draft'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contract_drafts_request_id ON contract_drafts(request_id);
CREATE TABLE contract_draft_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contract_drafts(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_data JSONB,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contract_draft_history_contract_id ON contract_draft_history(contract_id,id);
