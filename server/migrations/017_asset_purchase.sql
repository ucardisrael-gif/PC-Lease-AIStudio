ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory','inventory_cost'));
CREATE TABLE asset_purchase_details (
  asset_id TEXT PRIMARY KEY REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL DEFAULT '',
  purchase_reference TEXT NOT NULL DEFAULT '',
  purchase_cost_minor BIGINT CHECK (purchase_cost_minor IS NULL OR purchase_cost_minor >= 0),
  purchase_date DATE,
  warranty_start DATE,
  warranty_end DATE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (warranty_start IS NULL OR warranty_end IS NULL OR warranty_end >= warranty_start)
);
CREATE TABLE asset_purchase_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_data JSONB,
  new_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX asset_purchase_history_asset_id ON asset_purchase_history(asset_id,id);
