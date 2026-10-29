-- Existing records remain NULL: their historical serial number cannot be inferred reliably.
ALTER TABLE asset_reservations ADD COLUMN serial_at_reservation TEXT CHECK (serial_at_reservation IS NULL OR length(serial_at_reservation) BETWEEN 1 AND 120);
ALTER TABLE asset_handover_events ADD COLUMN serial_at_event TEXT CHECK (serial_at_event IS NULL OR length(serial_at_event) BETWEEN 1 AND 120);
