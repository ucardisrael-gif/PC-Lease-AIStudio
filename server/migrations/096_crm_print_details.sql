-- Applied only when CRM is explicitly enabled or in isolated test mode.
ALTER TABLE crm_work_boards ADD COLUMN print_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE crm_work_print_templates ADD COLUMN show_logo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_work_print_templates ADD COLUMN show_company_details BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_work_print_templates ADD COLUMN company_details TEXT NOT NULL DEFAULT '' CHECK(length(company_details)<=2000);
ALTER TABLE crm_work_print_templates ADD COLUMN show_card_metadata BOOLEAN NOT NULL DEFAULT false;
