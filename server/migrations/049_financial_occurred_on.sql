-- Older records have no verified transaction date; keep it unknown.
ALTER TABLE financial_entries ADD COLUMN occurred_on DATE;
