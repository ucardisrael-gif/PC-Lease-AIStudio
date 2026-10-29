CREATE FUNCTION request_link_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'request link history is append only';
END;
$$;
CREATE TRIGGER request_organization_history_no_update_delete BEFORE UPDATE OR DELETE ON request_organization_history FOR EACH ROW EXECUTE FUNCTION request_link_history_no_change();
CREATE TRIGGER request_customer_history_no_update_delete BEFORE UPDATE OR DELETE ON request_customer_history FOR EACH ROW EXECUTE FUNCTION request_link_history_no_change();
