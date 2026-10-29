CREATE FUNCTION contract_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'contract draft history is append only';
END;
$$;
CREATE TRIGGER contract_history_no_update_delete BEFORE UPDATE OR DELETE ON contract_draft_history FOR EACH ROW EXECUTE FUNCTION contract_history_no_change();

CREATE FUNCTION contract_snapshot_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_snapshot IS DISTINCT FROM OLD.order_snapshot OR NEW.request_id IS DISTINCT FROM OLD.request_id THEN
    RAISE EXCEPTION 'contract order snapshot cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER contract_snapshot_no_update BEFORE UPDATE ON contract_drafts FOR EACH ROW EXECUTE FUNCTION contract_snapshot_no_change();
