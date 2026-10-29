CREATE TABLE request_internal_notes (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_internal_notes_request_order ON request_internal_notes (request_id, created_at DESC, id DESC);
CREATE FUNCTION prevent_request_note_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Internal notes cannot be changed or deleted';
END;
$$;
CREATE TRIGGER request_internal_notes_immutable BEFORE UPDATE OR DELETE ON request_internal_notes FOR EACH ROW EXECUTE FUNCTION prevent_request_note_change();
