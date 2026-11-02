-- Existing crm_cards_edit continues to grant creation, editing and movement.
-- New permissions allow narrower roles without changing existing assignments.
ALTER TABLE staff_permissions DROP CONSTRAINT staff_permissions_permission_check;
ALTER TABLE staff_permissions ADD CONSTRAINT staff_permissions_permission_check CHECK (permission IN ('orders','catalog','content','inventory','inventory_cost','service','contracts','finance','crm_boards_view','crm_cards_edit','crm_cards_create','crm_cards_update','crm_cards_move','crm_boards_manage','crm_cards_archive','crm_history_view','crm_cards_view_all'));
ALTER TABLE access_roles DROP CONSTRAINT access_roles_permissions_check;
ALTER TABLE access_roles ADD CONSTRAINT access_roles_permissions_check CHECK (permissions <@ ARRAY['orders','catalog','content','inventory','inventory_cost','service','contracts','finance','crm_boards_view','crm_cards_edit','crm_cards_create','crm_cards_update','crm_cards_move','crm_boards_manage','crm_cards_archive','crm_history_view','crm_cards_view_all']::text[]);
