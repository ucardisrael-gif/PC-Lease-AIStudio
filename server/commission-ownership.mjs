// Called in the same transaction as creating a financial payment. Null dealer
// is intentionally not guessed later; an administrator must explicitly assign it.
export async function capturePaymentOwner(c,paymentId,actor){
 await c.query("INSERT INTO commission_payment_ownership(payment_id,dealer_id,actor_user_id,source,reason) SELECT e.id,r.dealer_id,$2,'entry','Order dealer at payment entry' FROM financial_entries e JOIN requests r ON r.id=e.request_id WHERE e.id=$1 AND e.kind='payment' AND r.dealer_id IS NOT NULL ON CONFLICT(payment_id) DO NOTHING",[paymentId,actor]);
}
export async function inheritPaymentOwner(c,originalId,replacementId,actor){
 await c.query("INSERT INTO commission_payment_ownership(payment_id,dealer_id,actor_user_id,source,reason) SELECT $2,dealer_id,$3,'inherited','Inherited from corrected payment' FROM commission_payment_ownership WHERE payment_id=$1 ON CONFLICT(payment_id) DO NOTHING",[originalId,replacementId,actor]);
}
