ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory'));
CREATE TABLE inventory_assets (
  id TEXT PRIMARY KEY,
  serial_number TEXT NOT NULL CHECK (length(trim(serial_number)) > 0),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location TEXT NOT NULL DEFAULT '',
  condition_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','qa','available','repair','retired')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX inventory_assets_serial_unique ON inventory_assets (lower(trim(serial_number)));
CREATE TABLE inventory_asset_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_data JSONB,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inventory_asset_history_asset_id ON inventory_asset_history(asset_id,id);
