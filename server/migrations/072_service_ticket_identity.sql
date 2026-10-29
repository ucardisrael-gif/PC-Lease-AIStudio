-- A service ticket remains tied to its original device and handover.
CREATE FUNCTION service_ticket_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'service ticket cannot be deleted'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.asset_id IS DISTINCT FROM OLD.asset_id
     OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'service ticket identity cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER service_ticket_identity_guard_before_change
BEFORE UPDATE OR DELETE ON service_tickets FOR EACH ROW EXECUTE FUNCTION service_ticket_identity_guard();
