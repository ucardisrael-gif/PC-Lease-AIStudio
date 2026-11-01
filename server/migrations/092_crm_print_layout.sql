-- Applied only when CRM is explicitly enabled or in isolated test mode.
ALTER TABLE crm_work_print_templates ADD COLUMN orientation TEXT NOT NULL DEFAULT 'portrait' CHECK(orientation IN ('portrait','landscape'));
ALTER TABLE crm_work_print_templates ADD COLUMN footer TEXT NOT NULL DEFAULT '' CHECK(length(footer)<=2000);
