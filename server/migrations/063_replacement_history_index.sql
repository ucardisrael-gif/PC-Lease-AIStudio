CREATE INDEX service_replacements_history_order ON service_replacements(ticket_id,issued_at DESC,id DESC) WHERE returned_at IS NOT NULL;
