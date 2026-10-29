ALTER TABLE inventory_assets DROP CONSTRAINT inventory_assets_status_check;
ALTER TABLE inventory_assets ADD CONSTRAINT inventory_assets_status_check CHECK (status IN ('received','qa','available','reserved','issued','repair','retired'));
CREATE TABLE asset_handover_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES asset_reservations(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('issued','returned')),
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX asset_handover_events_reservation_id ON asset_handover_events(reservation_id,id);
