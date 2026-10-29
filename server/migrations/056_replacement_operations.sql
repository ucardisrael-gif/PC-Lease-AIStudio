CREATE TABLE replacement_operations (
 id TEXT PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 ticket_id TEXT NOT NULL REFERENCES service_tickets(id) ON DELETE RESTRICT,
 payload_hash TEXT NOT NULL,
 replacement_id TEXT NOT NULL REFERENCES service_replacements(id) ON DELETE RESTRICT,
 asset_id TEXT NOT NULL REFERENCES inventory_assets(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER replacement_operations_no_update_delete BEFORE UPDATE OR DELETE ON replacement_operations FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
