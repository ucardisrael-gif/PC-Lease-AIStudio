ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory','inventory_cost','service','contracts','finance'));
CREATE TABLE financial_entries (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK (kind IN ('payment','refund','reversal')),
 amount_minor INTEGER NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 1000000000),
 reference TEXT NOT NULL CHECK (length(reference) <= 200),
 notes TEXT NOT NULL CHECK (length(notes) <= 1000),
 reverses_id TEXT UNIQUE REFERENCES financial_entries(id) ON DELETE RESTRICT,
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK ((kind='reversal') = (reverses_id IS NOT NULL))
);
CREATE INDEX financial_entries_request_id ON financial_entries(request_id,created_at DESC);
CREATE FUNCTION financial_entries_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'financial entries are append only'; END $$;
CREATE TRIGGER financial_entries_no_update_delete BEFORE UPDATE OR DELETE ON financial_entries FOR EACH ROW EXECUTE FUNCTION financial_entries_no_change();
