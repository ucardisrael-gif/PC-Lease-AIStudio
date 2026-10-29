CREATE FUNCTION inventory_service_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'inventory and service history is append only';
END;
$$;
CREATE TRIGGER inventory_history_no_update_delete BEFORE UPDATE OR DELETE ON inventory_asset_history FOR EACH ROW EXECUTE FUNCTION inventory_service_history_no_change();
CREATE TRIGGER service_history_no_update_delete BEFORE UPDATE OR DELETE ON service_ticket_history FOR EACH ROW EXECUTE FUNCTION inventory_service_history_no_change();
CREATE TRIGGER handover_history_no_update_delete BEFORE UPDATE OR DELETE ON asset_handover_events FOR EACH ROW EXECUTE FUNCTION inventory_service_history_no_change();
