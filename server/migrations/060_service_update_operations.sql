CREATE TABLE service_update_operations (
 id TEXT PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 ticket_id TEXT NOT NULL REFERENCES service_tickets(id) ON DELETE RESTRICT,
 payload_hash TEXT NOT NULL,
 result_data JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER service_update_operations_no_update_delete BEFORE UPDATE OR DELETE ON service_update_operations FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
