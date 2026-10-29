CREATE TABLE contract_draft_reviews (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 contract_id TEXT NOT NULL REFERENCES contract_drafts(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0),
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(contract_id,version)
);
CREATE FUNCTION contract_review_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'contract reviews are append only'; END; $$;
CREATE TRIGGER contract_review_immutable BEFORE UPDATE OR DELETE ON contract_draft_reviews FOR EACH ROW EXECUTE FUNCTION contract_review_no_change();
