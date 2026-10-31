-- Correction lineage preserves which original payment a refund was allocated to.
CREATE TABLE commission_payment_supersessions (
 original_payment_id TEXT PRIMARY KEY REFERENCES commission_payment_snapshots(payment_id) ON DELETE RESTRICT,
 replacement_payment_id TEXT NOT NULL UNIQUE REFERENCES commission_payment_snapshots(payment_id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(original_payment_id<>replacement_payment_id)
);
CREATE TRIGGER commission_payment_supersessions_no_change BEFORE UPDATE OR DELETE ON commission_payment_supersessions FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
