-- Applied only when CRM is explicitly enabled or in isolated test mode. Existing cards start their timer at migration.
ALTER TABLE crm_work_cards ADD COLUMN column_entered_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE crm_work_columns ADD COLUMN archive_rule_by TEXT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE crm_work_columns ADD CONSTRAINT crm_work_archive_rule_actor CHECK ((archive_after_days IS NULL)=(archive_rule_by IS NULL));
CREATE FUNCTION crm_work_reset_column_timer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.column_id IS DISTINCT FROM OLD.column_id OR (OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL) THEN NEW.column_entered_at := now(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_work_column_timer BEFORE UPDATE OF column_id,archived_at ON crm_work_cards FOR EACH ROW EXECUTE FUNCTION crm_work_reset_column_timer();
CREATE INDEX crm_work_due_archive_idx ON crm_work_cards(column_id,column_entered_at) WHERE archived_at IS NULL;
