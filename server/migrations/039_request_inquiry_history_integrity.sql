CREATE FUNCTION request_inquiry_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'request and inquiry history is append only';
END;
$$;
CREATE TRIGGER request_status_history_no_update_delete BEFORE UPDATE OR DELETE ON request_status_history FOR EACH ROW EXECUTE FUNCTION request_inquiry_history_no_change();
CREATE TRIGGER contact_inquiry_history_no_update_delete BEFORE UPDATE OR DELETE ON contact_inquiry_history FOR EACH ROW EXECUTE FUNCTION request_inquiry_history_no_change();
