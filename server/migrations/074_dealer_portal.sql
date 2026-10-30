CREATE TABLE dealer_user_access (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN dealer_access_version INTEGER NOT NULL DEFAULT 1 CHECK(dealer_access_version>0);
CREATE TABLE dealer_access_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
  new_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE FUNCTION dealer_access_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'dealer access history is append only'; END; $$;
CREATE TRIGGER dealer_access_history_no_change BEFORE UPDATE OR DELETE ON dealer_access_history FOR EACH ROW EXECUTE FUNCTION dealer_access_history_immutable();
