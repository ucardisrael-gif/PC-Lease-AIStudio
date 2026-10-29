-- Prices remain tax-inclusive. Changing this setting affects only future
-- internal breakdowns, never saved quote snapshots or catalogue prices.
CREATE TABLE tax_settings (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
 vat_basis_points INTEGER NOT NULL CHECK (vat_basis_points BETWEEN 0 AND 10000),
 version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO tax_settings (id, vat_basis_points) VALUES (true, 1800);
CREATE TABLE tax_settings_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 previous_basis_points INTEGER NOT NULL,
 new_basis_points INTEGER NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE FUNCTION tax_settings_history_no_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'tax settings history is append only'; END; $$;
CREATE TRIGGER tax_settings_history_immutable BEFORE UPDATE OR DELETE ON tax_settings_history FOR EACH ROW EXECUTE FUNCTION tax_settings_history_no_change();
