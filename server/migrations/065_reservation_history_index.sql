CREATE INDEX IF NOT EXISTS asset_reservations_request_history
  ON asset_reservations (request_id, reserved_at DESC, id DESC);
