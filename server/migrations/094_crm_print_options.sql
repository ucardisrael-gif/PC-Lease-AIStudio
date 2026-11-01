-- Applied only in the isolated CRM test database.
ALTER TABLE crm_work_print_templates ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE crm_work_print_templates ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_work_print_templates ADD COLUMN direction TEXT NOT NULL DEFAULT 'rtl' CHECK(direction IN ('rtl','ltr'));
ALTER TABLE crm_work_print_templates ADD COLUMN hide_empty BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_work_print_templates ADD CONSTRAINT crm_work_print_default_enabled CHECK(NOT is_default OR enabled);
CREATE UNIQUE INDEX crm_work_print_default_per_board ON crm_work_print_templates(board_id) WHERE is_default;
