ALTER TABLE requests ADD COLUMN dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT;
ALTER TABLE requests ADD COLUMN dealer_link_version INTEGER NOT NULL DEFAULT 1 CHECK(dealer_link_version>0);
CREATE INDEX requests_dealer_id ON requests(dealer_id);
CREATE TABLE request_dealer_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 old_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
 old_name TEXT,
 new_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
 new_name TEXT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_dealer_history_request ON request_dealer_history(request_id,id DESC);
CREATE FUNCTION request_dealer_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'dealer link history is append only'; END; $$;
CREATE TRIGGER request_dealer_history_immutable BEFORE UPDATE OR DELETE ON request_dealer_history FOR EACH ROW EXECUTE FUNCTION request_dealer_history_no_change();
