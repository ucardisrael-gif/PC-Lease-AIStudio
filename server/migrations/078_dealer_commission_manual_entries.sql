-- Accounting records are informational; creating one does not transfer money.
CREATE TABLE dealer_commission_manual_entries (
 id TEXT PRIMARY KEY,
 dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('adjustment','payout')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor BETWEEN -1000000000 AND 1000000000 AND amount_minor<>0),
 occurred_on DATE NOT NULL,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(kind<>'payout' OR amount_minor>0)
);
CREATE INDEX dealer_commission_manual_entries_dealer ON dealer_commission_manual_entries(dealer_id,created_at DESC,id DESC);
CREATE TRIGGER dealer_commission_manual_entries_no_change BEFORE UPDATE OR DELETE ON dealer_commission_manual_entries FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
