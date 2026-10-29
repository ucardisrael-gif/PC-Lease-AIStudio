-- A reservation keeps its original order, device and actor; release is final.
CREATE FUNCTION reservation_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'reservation history cannot be deleted'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.asset_id IS DISTINCT FROM OLD.asset_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.line_index IS DISTINCT FROM OLD.line_index
     OR NEW.reserved_by IS DISTINCT FROM OLD.reserved_by OR NEW.reserved_at IS DISTINCT FROM OLD.reserved_at
     OR NEW.serial_at_reservation IS DISTINCT FROM OLD.serial_at_reservation
     OR (OLD.released_at IS NOT NULL AND (NEW.released_at IS DISTINCT FROM OLD.released_at OR NEW.released_by IS DISTINCT FROM OLD.released_by)) THEN
    RAISE EXCEPTION 'reservation history cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reservation_history_guard_before_change
BEFORE UPDATE OR DELETE ON asset_reservations FOR EACH ROW EXECUTE FUNCTION reservation_history_guard();

-- A replacement keeps its original handover; return is final.
CREATE FUNCTION replacement_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'replacement history cannot be deleted'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
     OR NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.issued_by IS DISTINCT FROM OLD.issued_by
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR NEW.issue_notes IS DISTINCT FROM OLD.issue_notes
     OR NEW.serial_at_issue IS DISTINCT FROM OLD.serial_at_issue
     OR (OLD.returned_at IS NULL AND NEW.returned_at IS NULL AND NEW.return_notes IS DISTINCT FROM OLD.return_notes)
     OR (OLD.returned_at IS NOT NULL AND (NEW.returned_at IS DISTINCT FROM OLD.returned_at OR NEW.returned_by IS DISTINCT FROM OLD.returned_by OR NEW.return_notes IS DISTINCT FROM OLD.return_notes)) THEN
    RAISE EXCEPTION 'replacement history cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER replacement_history_guard_before_change
BEFORE UPDATE OR DELETE ON service_replacements FOR EACH ROW EXECUTE FUNCTION replacement_history_guard();
