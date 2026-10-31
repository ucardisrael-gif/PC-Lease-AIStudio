import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// A date/amount correction creates a new immutable financial row. Carry its
// existing allocation forward atomically, while excluding the reversed original.
export async function propagateRefundLink(c,actor,originalId,replacementId){
 const link=(await c.query('SELECT payment_id FROM commission_refund_links WHERE refund_id=$1',[originalId])).rows[0];if(!link)return;
 const latest=(await c.query('WITH RECURSIVE lineage AS (SELECT $1::text AS id,0 AS depth UNION ALL SELECT s.replacement_payment_id,l.depth+1 FROM commission_payment_supersessions s JOIN lineage l ON s.original_payment_id=l.id) SELECT id FROM lineage ORDER BY depth DESC LIMIT 1',[link.payment_id])).rows[0].id;
 const refund=(await c.query("SELECT request_id,amount_minor,to_char(occurred_on,'YYYY-MM-DD') AS day FROM financial_entries WHERE id=$1 AND kind=$2",[replacementId,'refund'])).rows[0];
 await c.query('SELECT id FROM financial_entries WHERE id=$1 FOR UPDATE',[latest]);
 const payment=(await c.query("SELECT request_id,payment_minor,to_char(payment_on,'YYYY-MM-DD') AS day FROM commission_payment_snapshots WHERE payment_id=$1 FOR UPDATE",[latest])).rows[0];
 if(!refund||!payment||refund.request_id!==payment.request_id)throw Error('commission_review_required');
 if(refund.day&&refund.day<payment.day)throw Error('commission_review_required');
 if((await c.query('SELECT 1 FROM financial_entries WHERE reverses_id=$1',[latest])).rowCount)throw Error('commission_review_required');
 const total=Number((await c.query('WITH RECURSIVE ancestors AS (SELECT $1::text AS id UNION ALL SELECT s.original_payment_id FROM commission_payment_supersessions s JOIN ancestors a ON s.replacement_payment_id=a.id) SELECT COALESCE(sum(r.amount_minor),0)::text AS total FROM commission_refund_links l JOIN ancestors a ON a.id=l.payment_id JOIN financial_entries r ON r.id=l.refund_id WHERE NOT EXISTS(SELECT 1 FROM financial_entries x WHERE x.reverses_id=r.id)',[latest])).rows[0].total);
 if(total+refund.amount_minor>payment.payment_minor)throw Error('refund_exceeds_payment');
 await c.query('INSERT INTO commission_refund_links(refund_id,payment_id,actor_user_id) VALUES($1,$2,$3)',[replacementId,latest,actor]);
}
export async function attachCommissionRefund(db,actor,input){
 if(!input||!uuid(input.refundId)||!uuid(input.paymentId))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);
  const refund=(await c.query("SELECT id,kind,request_id,amount_minor,to_char(occurred_on,'YYYY-MM-DD') AS day FROM financial_entries WHERE id=$1 FOR UPDATE",[input.refundId])).rows[0];
  if(!refund||refund.kind!=='refund')throw Error('not_found');
  const old=(await c.query('SELECT payment_id,actor_user_id FROM commission_refund_links WHERE refund_id=$1',[input.refundId])).rows[0];
  if(old){if(old.payment_id!==input.paymentId||old.actor_user_id!==actor)throw Error('link_conflict');await c.query('COMMIT');return {refundId:input.refundId,paymentId:input.paymentId};}
  await c.query('SELECT id FROM financial_entries WHERE id=$1 FOR UPDATE',[input.paymentId]);
  const payment=(await c.query("SELECT s.payment_id,s.request_id,s.payment_minor,to_char(s.payment_on,'YYYY-MM-DD') AS day FROM commission_payment_snapshots s WHERE s.payment_id=$1 FOR UPDATE",[input.paymentId])).rows[0];
  if(!payment)throw Error('payment_not_found');if(payment.request_id!==refund.request_id)throw Error('order_mismatch');
  if(refund.day&&refund.day<payment.day)throw Error('invalid_refund_date');
  if((await c.query('SELECT 1 FROM financial_entries WHERE reverses_id=ANY($1::text[])',[[input.paymentId,input.refundId]])).rowCount)throw Error('already_reversed');
  const sum=Number((await c.query('WITH RECURSIVE ancestors AS (SELECT $1::text AS id UNION ALL SELECT s.original_payment_id FROM commission_payment_supersessions s JOIN ancestors a ON s.replacement_payment_id=a.id) SELECT COALESCE(sum(r.amount_minor),0)::text AS total FROM commission_refund_links l JOIN ancestors a ON a.id=l.payment_id JOIN financial_entries r ON r.id=l.refund_id WHERE NOT EXISTS(SELECT 1 FROM financial_entries x WHERE x.reverses_id=r.id)',[input.paymentId])).rows[0].total);
  if(sum+refund.amount_minor>payment.payment_minor)throw Error('refund_exceeds_payment');
  await c.query('INSERT INTO commission_refund_links(refund_id,payment_id,actor_user_id) VALUES($1,$2,$3)',[input.refundId,input.paymentId,actor]);await c.query('COMMIT');return {refundId:input.refundId,paymentId:input.paymentId};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
