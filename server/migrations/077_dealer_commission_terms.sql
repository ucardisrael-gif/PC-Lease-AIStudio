-- An agreement is a separate, auditable link; changing an order's dealer must
-- never silently reassign commission already earned by a previous dealer.
CREATE TABLE dealer_commission_terms (
 request_id TEXT PRIMARY KEY REFERENCES requests(id) ON DELETE RESTRICT,
 dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
 starts_on DATE,
 ends_on DATE,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(starts_on IS NULL OR ends_on IS NULL OR starts_on<=ends_on)
);
CREATE TABLE dealer_commission_terms_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_data JSONB,
 new_data JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER dealer_commission_terms_history_no_change BEFORE UPDATE OR DELETE ON dealer_commission_terms_history FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
