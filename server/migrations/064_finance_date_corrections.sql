CREATE TABLE financial_date_corrections (
 id TEXT PRIMARY KEY,
 original_entry_id TEXT NOT NULL UNIQUE REFERENCES financial_entries(id) ON DELETE RESTRICT,
 reversal_entry_id TEXT NOT NULL UNIQUE REFERENCES financial_entries(id) ON DELETE RESTRICT,
 replacement_entry_id TEXT NOT NULL UNIQUE REFERENCES financial_entries(id) ON DELETE RESTRICT,
 occurred_on DATE NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER financial_date_corrections_no_update_delete BEFORE UPDATE OR DELETE ON financial_date_corrections FOR EACH ROW EXECUTE FUNCTION financial_entries_no_change();
