-- Reversals cancel exactly one original record in the same order and amount.
-- Existing historical entries are left unchanged.
CREATE FUNCTION financial_reversal_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original financial_entries%ROWTYPE;
BEGIN
  IF NEW.kind = 'reversal' THEN
    SELECT * INTO original FROM financial_entries WHERE id = NEW.reverses_id;
    IF NOT FOUND OR original.kind = 'reversal'
       OR original.request_id IS DISTINCT FROM NEW.request_id
       OR original.amount_minor IS DISTINCT FROM NEW.amount_minor
       OR NEW.occurred_on IS NOT NULL THEN
      RAISE EXCEPTION 'financial reversal does not match original entry';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER financial_reversal_validate_before_insert
BEFORE INSERT ON financial_entries FOR EACH ROW EXECUTE FUNCTION financial_reversal_validate();
