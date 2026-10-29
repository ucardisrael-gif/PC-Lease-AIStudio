-- Existing identifiers and snapshots remain unchanged. Sequence gaps are
-- normal, including after an idempotent retry or a rolled-back transaction.
ALTER TABLE requests ADD COLUMN order_number BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE requests ADD CONSTRAINT requests_order_number_unique UNIQUE (order_number);
