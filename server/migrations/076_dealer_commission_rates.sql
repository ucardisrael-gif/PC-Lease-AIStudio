-- Rates are historical configuration only. They do not create commission accruals.
CREATE TABLE dealer_commission_rates (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
 percent_hundredths INTEGER NOT NULL CHECK (percent_hundredths BETWEEN 0 AND 10000),
 effective_on DATE NOT NULL,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (dealer_id,effective_on)
);
CREATE FUNCTION dealer_commission_rates_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'commission rate history is append only'; END; $$;
CREATE TRIGGER dealer_commission_rates_no_change BEFORE UPDATE OR DELETE ON dealer_commission_rates FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
