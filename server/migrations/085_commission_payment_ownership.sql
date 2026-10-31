-- Record attribution at payment entry time; reassignment of an order later must
-- never silently move an unresolved historical payment to the new dealer.
CREATE TABLE commission_payment_ownership (
 payment_id TEXT PRIMARY KEY REFERENCES financial_entries(id) ON DELETE RESTRICT,
 dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 source TEXT NOT NULL CHECK(source IN ('entry','inherited','migration','manual')),
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO commission_payment_ownership(payment_id,dealer_id,actor_user_id,source,reason)
 SELECT s.payment_id,s.dealer_id,e.created_by,'migration','Existing commission snapshot' FROM commission_payment_snapshots s JOIN financial_entries e ON e.id=s.payment_id;
CREATE TRIGGER commission_payment_ownership_no_change BEFORE UPDATE OR DELETE ON commission_payment_ownership FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
