CREATE FUNCTION user_access_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'user access history is append only';
END;
$$;
CREATE TRIGGER user_organization_history_no_update_delete BEFORE UPDATE OR DELETE ON user_organization_history FOR EACH ROW EXECUTE FUNCTION user_access_history_no_change();
CREATE TRIGGER staff_permission_history_no_update_delete BEFORE UPDATE OR DELETE ON staff_permission_history FOR EACH ROW EXECUTE FUNCTION user_access_history_no_change();
CREATE TRIGGER user_role_history_no_update_delete BEFORE UPDATE OR DELETE ON user_role_history FOR EACH ROW EXECUTE FUNCTION user_access_history_no_change();
CREATE TRIGGER user_activation_history_no_update_delete BEFORE UPDATE OR DELETE ON user_activation_history FOR EACH ROW EXECUTE FUNCTION user_access_history_no_change();
