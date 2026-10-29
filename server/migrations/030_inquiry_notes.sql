CREATE TABLE inquiry_internal_notes (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inquiry_notes_inquiry_order ON inquiry_internal_notes(inquiry_id,created_at DESC,id DESC);
CREATE TRIGGER inquiry_notes_immutable BEFORE UPDATE OR DELETE ON inquiry_internal_notes FOR EACH ROW EXECUTE FUNCTION prevent_request_note_change();
