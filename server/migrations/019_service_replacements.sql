ALTER TABLE service_tickets ADD COLUMN reservation_id TEXT REFERENCES asset_reservations(id) ON DELETE RESTRICT;
ALTER TABLE inventory_assets DROP CONSTRAINT inventory_assets_status_check;
ALTER TABLE inventory_assets ADD CONSTRAINT inventory_assets_status_check CHECK (status IN ('received','qa','available','reserved','issued','service_issued','repair','retired'));
CREATE TABLE service_replacements (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES service_tickets(id) ON DELETE RESTRICT,
  asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  issued_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  returned_at TIMESTAMPTZ,
  issue_notes TEXT NOT NULL DEFAULT '',
  return_notes TEXT NOT NULL DEFAULT '',
  CHECK ((returned_by IS NULL) = (returned_at IS NULL))
);
CREATE UNIQUE INDEX service_replacement_one_asset ON service_replacements(asset_id) WHERE returned_at IS NULL;
CREATE UNIQUE INDEX service_replacement_one_ticket ON service_replacements(ticket_id) WHERE returned_at IS NULL;
