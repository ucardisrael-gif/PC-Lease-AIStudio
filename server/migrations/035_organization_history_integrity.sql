CREATE FUNCTION organization_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'organization history is append only';
END;
$$;
CREATE TRIGGER organization_history_no_update_delete BEFORE UPDATE OR DELETE ON organization_history FOR EACH ROW EXECUTE FUNCTION organization_history_no_change();
