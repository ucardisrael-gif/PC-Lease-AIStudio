ALTER TABLE users ADD COLUMN client_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN client_dealer_version INTEGER NOT NULL DEFAULT 1 CHECK(client_dealer_version>0);
ALTER TABLE organizations ADD COLUMN client_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT;
ALTER TABLE organizations ADD COLUMN client_dealer_version INTEGER NOT NULL DEFAULT 1 CHECK(client_dealer_version>0);
CREATE INDEX users_client_dealer_idx ON users(client_dealer_id,id) WHERE client_dealer_id IS NOT NULL;
CREATE INDEX organizations_client_dealer_idx ON organizations(client_dealer_id,id) WHERE client_dealer_id IS NOT NULL;
CREATE TABLE dealer_client_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('user','organization')),
 user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
 organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
 old_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
 new_dealer_id TEXT REFERENCES dealers(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK ((entity_type='user' AND user_id IS NOT NULL AND organization_id IS NULL) OR (entity_type='organization' AND organization_id IS NOT NULL AND user_id IS NULL))
);
CREATE FUNCTION dealer_client_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'dealer client history is append only'; END; $$;
CREATE TRIGGER dealer_client_history_no_change BEFORE UPDATE OR DELETE ON dealer_client_history FOR EACH ROW EXECUTE FUNCTION dealer_client_history_immutable();
