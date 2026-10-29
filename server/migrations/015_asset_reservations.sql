ALTER TABLE inventory_assets DROP CONSTRAINT inventory_assets_status_check;
ALTER TABLE inventory_assets ADD CONSTRAINT inventory_assets_status_check CHECK (status IN ('received','qa','available','reserved','repair','retired'));
CREATE TABLE asset_reservations (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  line_index INTEGER NOT NULL CHECK (line_index >= 0),
  reserved_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  released_at TIMESTAMPTZ,
  CHECK ((released_by IS NULL) = (released_at IS NULL))
);
CREATE UNIQUE INDEX asset_reservations_one_active ON asset_reservations(asset_id) WHERE released_at IS NULL;
CREATE INDEX asset_reservations_request ON asset_reservations(request_id,line_index) WHERE released_at IS NULL;
