-- Applied only when CRM is explicitly enabled or in isolated test mode. Retain immutable, value-free event records
-- after a card or board is permanently removed.
ALTER TABLE crm_work_card_events DROP CONSTRAINT crm_work_card_events_board_id_fkey;
ALTER TABLE crm_work_card_events DROP CONSTRAINT crm_work_card_events_board_id_card_id_fkey;
ALTER TABLE crm_work_board_events DROP CONSTRAINT crm_work_board_events_board_id_fkey;
