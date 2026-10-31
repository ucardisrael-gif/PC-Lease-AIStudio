-- Explicitly chosen exceptions for older payments, with mandatory audit reason.
CREATE TABLE commission_rate_overrides (
 payment_id TEXT PRIMARY KEY REFERENCES commission_payment_snapshots(payment_id) ON DELETE RESTRICT,
 rate_id BIGINT NOT NULL REFERENCES dealer_commission_rates(id) ON DELETE RESTRICT,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER commission_rate_overrides_no_change BEFORE UPDATE OR DELETE ON commission_rate_overrides FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
