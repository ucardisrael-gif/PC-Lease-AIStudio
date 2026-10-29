-- Preserve the commercial terms captured when a request was submitted.
-- Status, customer, company, dealer, and notification state remain editable.
CREATE FUNCTION request_snapshot_no_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.product_snapshot_json IS DISTINCT FROM OLD.product_snapshot_json
     OR NEW.tariff_snapshot_json IS DISTINCT FROM OLD.tariff_snapshot_json
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.request_hash IS DISTINCT FROM OLD.request_hash THEN
    RAISE EXCEPTION 'request commercial snapshot cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER request_snapshot_no_update BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION request_snapshot_no_change();
