ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory','inventory_cost','service'));
CREATE TABLE service_tickets (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  resolution TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_tickets_asset_id ON service_tickets(asset_id);
CREATE TABLE service_ticket_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES service_tickets(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_data JSONB,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_ticket_history_ticket_id ON service_ticket_history(ticket_id,id);
