CREATE FUNCTION notification_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'notification history is append only';
END;
$$;
CREATE TRIGGER inquiry_notification_attempts_no_update_delete BEFORE UPDATE OR DELETE ON inquiry_notification_attempts FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
CREATE TRIGGER request_notification_attempts_no_update_delete BEFORE UPDATE OR DELETE ON request_notification_attempts FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
CREATE TRIGGER order_notification_settings_history_no_update_delete BEFORE UPDATE OR DELETE ON order_notification_settings_history FOR EACH ROW EXECUTE FUNCTION notification_history_no_change();
