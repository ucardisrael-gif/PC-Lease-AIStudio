CREATE TABLE reservation_operations (
 id TEXT PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 payload_hash TEXT NOT NULL,
 reservation_id TEXT NOT NULL REFERENCES asset_reservations(id) ON DELETE RESTRICT,
 asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER reservation_operations_no_update_delete BEFORE UPDATE OR DELETE ON reservation_operations FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
