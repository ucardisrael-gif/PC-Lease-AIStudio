CREATE TABLE commission_refund_links (
 refund_id TEXT PRIMARY KEY REFERENCES financial_entries(id) ON DELETE RESTRICT,
 payment_id TEXT NOT NULL REFERENCES commission_payment_snapshots(payment_id) ON DELETE RESTRICT,
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX commission_refund_links_payment ON commission_refund_links(payment_id,refund_id);
CREATE TRIGGER commission_refund_links_no_change BEFORE UPDATE OR DELETE ON commission_refund_links FOR EACH ROW EXECUTE FUNCTION dealer_commission_rates_immutable();
