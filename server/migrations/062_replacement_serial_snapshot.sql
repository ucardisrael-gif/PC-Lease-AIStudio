-- Existing replacements have no reliable serial snapshot and remain NULL.
ALTER TABLE service_replacements ADD COLUMN serial_at_issue TEXT CHECK (serial_at_issue IS NULL OR length(serial_at_issue) BETWEEN 1 AND 120);
