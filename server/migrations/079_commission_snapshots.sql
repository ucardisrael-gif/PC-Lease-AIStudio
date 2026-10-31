-- Snapshotting prevents later rate or assignment changes rewriting a payment.
CREATE TABLE commission_payment_snapshots (
 payment_id TEXT PRIMARY KEY REFERENCES financial_entries(id) ON DELETE RESTRICT,
 request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
 dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
 rate_id BIGINT NOT NULL REFERENCES dealer_commission_rates(id) ON DELETE RESTRICT,
 percent_hundredths INTEGER NOT NULL CHECK(percent_hundredths BETWEEN 0 AND 10000),
 payment_minor INTEGER NOT NULL CHECK(payment_minor>0),
 commission_minor INTEGER NOT NULL CHECK(commission_minor>=0),
 payment_on DATE NOT NULL,
 starts_on DATE NOT NULL,
 ends_on DATE NOT NULL CHECK(ends_on>=starts_on),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX commission_payment_snapshots_dealer ON commission_payment_snapshots(dealer_id,payment_on,payment_id);
CREATE TRIGGER commission_payment_snapshots_no_change BEFORE UPDATE OR DELETE ON commission_payment_snapshots FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
