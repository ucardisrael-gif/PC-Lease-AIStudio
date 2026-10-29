CREATE FUNCTION purchase_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'purchase history is append only';
END;
$$;
CREATE TRIGGER purchase_history_no_update_delete BEFORE UPDATE OR DELETE ON asset_purchase_history FOR EACH ROW EXECUTE FUNCTION purchase_history_no_change();
