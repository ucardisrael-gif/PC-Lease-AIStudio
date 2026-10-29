CREATE INDEX IF NOT EXISTS service_tickets_order_idx
  ON service_tickets (created_at DESC, id DESC);
