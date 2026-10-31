import {commissionForPayment,defaultCommissionPeriod} from './commission-math.mjs';
import {commissionDefaultMonths} from './commission-period.mjs';

// Caller owns the finance transaction and must hold the order row lock.
// Missing facts produce a visible pending state, never a made-up zero or rate.
export async function snapshotPaymentCommission(c,paymentId,override=null){
 const prior=(await c.query('SELECT * FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId])).rows[0];
 if(prior)return {status:'recorded',snapshot:prior};
 const payment=(await c.query("SELECT e.id,e.request_id,e.kind,e.amount_minor,to_char(e.occurred_on,'YYYY-MM-DD') AS payment_on,o.dealer_id,r.tariff_snapshot_json FROM financial_entries e JOIN requests r ON r.id=e.request_id LEFT JOIN commission_payment_ownership o ON o.payment_id=e.id WHERE e.id=$1 FOR UPDATE OF r",[paymentId])).rows[0];
 const raced=(await c.query('SELECT * FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId])).rows[0];
 if(raced)return {status:'recorded',snapshot:raced};
 if(!payment||payment.kind!=='payment')throw Error('invalid_payment');
 if(!payment.dealer_id)return {status:'missing_dealer'};
 await c.query('SELECT id FROM dealers WHERE id=$1 FOR SHARE',[payment.dealer_id]);
 if(!payment.payment_on)return {status:'missing_date'};
 if((await c.query('SELECT 1 FROM financial_entries WHERE reverses_id=$1',[paymentId])).rowCount)return {status:'reversed'};
 const term=(await c.query("SELECT dealer_id,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on FROM dealer_commission_terms WHERE request_id=$1 AND dealer_id=$2 FOR SHARE",[payment.request_id,payment.dealer_id])).rows[0];
 const first=(await c.query("SELECT to_char(min(e.occurred_on),'YYYY-MM-DD') AS first_payment FROM financial_entries e WHERE e.request_id=$1 AND e.kind='payment' AND e.occurred_on IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financial_entries rev WHERE rev.reverses_id=e.id)",[payment.request_id])).rows[0].first_payment;
 if(!term?.starts_on&&(await c.query("SELECT 1 FROM financial_entries e WHERE e.request_id=$1 AND e.kind='payment' AND e.occurred_on IS NULL AND NOT EXISTS(SELECT 1 FROM financial_entries rev WHERE rev.reverses_id=e.id) LIMIT 1",[payment.request_id])).rowCount)return {status:'missing_date'};
 const start=term?.starts_on||first;
 const months=commissionDefaultMonths(payment.tariff_snapshot_json);
 const end=term?.ends_on||(months&&start?defaultCommissionPeriod(start,months).endsOn:null);
 if(!start||!end||start>end)return {status:'missing_term'};
 const rate=override?(await c.query('SELECT id,percent_hundredths FROM dealer_commission_rates WHERE dealer_id=$1 AND id=$2::bigint',[payment.dealer_id,override.rateId])).rows[0]:(await c.query("SELECT id,percent_hundredths FROM dealer_commission_rates WHERE dealer_id=$1 AND effective_on<=$2::date AND created_at<=(SELECT created_at FROM financial_entries WHERE id=$3) ORDER BY effective_on DESC,id DESC LIMIT 1",[payment.dealer_id,payment.payment_on,payment.id])).rows[0];
 if(!rate)return {status:'missing_rate'};
 const eligible=payment.payment_on>=start&&payment.payment_on<=end;
 const value=eligible?commissionForPayment(payment.amount_minor,rate.percent_hundredths):0;
 const row=(await c.query("INSERT INTO commission_payment_snapshots(payment_id,request_id,dealer_id,rate_id,percent_hundredths,payment_minor,commission_minor,payment_on,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[payment.id,payment.request_id,payment.dealer_id,rate.id,rate.percent_hundredths,payment.amount_minor,value,payment.payment_on,start,end])).rows[0];
 if(override)await c.query('INSERT INTO commission_rate_overrides(payment_id,rate_id,reason,actor_user_id) VALUES($1,$2,$3,$4)',[payment.id,rate.id,override.reason,override.actor]);
 return {status:'recorded',snapshot:row};
}

// An amount correction inherits the saved commercial terms and links the new
// immutable row to its predecessor, so earlier refunds remain attributable.
export async function snapshotCorrectedPaymentAmount(c,actor,originalId,replacementId){
 const old=(await c.query("SELECT *,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on,payment_on BETWEEN starts_on AND ends_on AS eligible FROM commission_payment_snapshots WHERE payment_id=$1 FOR UPDATE",[originalId])).rows[0];if(!old)return {status:'pending'};
 const replacement=(await c.query("SELECT id,request_id,amount_minor,to_char(occurred_on,'YYYY-MM-DD') AS payment_on FROM financial_entries WHERE id=$1 AND kind='payment'",[replacementId])).rows[0];
 if(!replacement||replacement.request_id!==old.request_id)throw Error('commission_review_required');
 const refunded=Number((await c.query(`WITH RECURSIVE ancestors AS (SELECT $1::text AS id UNION ALL SELECT s.original_payment_id FROM commission_payment_supersessions s JOIN ancestors a ON s.replacement_payment_id=a.id) SELECT COALESCE(sum(r.amount_minor),0)::text AS total FROM commission_refund_links l JOIN ancestors a ON a.id=l.payment_id JOIN financial_entries r ON r.id=l.refund_id WHERE NOT EXISTS(SELECT 1 FROM financial_entries x WHERE x.reverses_id=r.id)`,[originalId])).rows[0].total);
 if(refunded>replacement.amount_minor)throw Error('refund_exceeds_payment');
 const value=old.eligible?commissionForPayment(replacement.amount_minor,old.percent_hundredths):0;
 await c.query('INSERT INTO commission_payment_snapshots(payment_id,request_id,dealer_id,rate_id,percent_hundredths,payment_minor,commission_minor,payment_on,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[replacement.id,old.request_id,old.dealer_id,old.rate_id,old.percent_hundredths,replacement.amount_minor,value,replacement.payment_on,old.starts_on,old.ends_on]);
 await c.query('INSERT INTO commission_payment_supersessions(original_payment_id,replacement_payment_id,actor_user_id) VALUES($1,$2,$3)',[originalId,replacementId,actor]);return {status:'recorded'};
}

export async function snapshotCorrectedPaymentDate(c,actor,originalId,replacementId,manualOverride=null){
 const old=(await c.query("SELECT *,to_char(payment_on,'YYYY-MM-DD') AS payment_on,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on FROM commission_payment_snapshots WHERE payment_id=$1 FOR UPDATE",[originalId])).rows[0];if(!old)return {status:'pending'};
 const replacement=(await c.query("SELECT id,request_id,amount_minor,to_char(occurred_on,'YYYY-MM-DD') AS payment_on FROM financial_entries WHERE id=$1 AND kind='payment'",[replacementId])).rows[0];if(!replacement?.payment_on||replacement.request_id!==old.request_id)throw Error('commission_review_required');
 const earlierRefund=(await c.query(`WITH RECURSIVE ancestors AS (SELECT $1::text AS id UNION ALL SELECT s.original_payment_id FROM commission_payment_supersessions s JOIN ancestors a ON s.replacement_payment_id=a.id) SELECT 1 FROM commission_refund_links l JOIN ancestors a ON a.id=l.payment_id JOIN financial_entries r ON r.id=l.refund_id WHERE r.occurred_on<$2::date AND NOT EXISTS(SELECT 1 FROM financial_entries x WHERE x.reverses_id=r.id) LIMIT 1`,[originalId,replacement.payment_on])).rowCount;if(earlierRefund)throw Error('commission_review_required');
 const term=(await c.query("SELECT to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on FROM dealer_commission_terms WHERE request_id=$1 AND dealer_id=$2",[old.request_id,old.dealer_id])).rows[0];
 const first=(await c.query("SELECT to_char(min(e.occurred_on),'YYYY-MM-DD') AS first_payment FROM financial_entries e WHERE e.request_id=$1 AND e.kind='payment' AND e.occurred_on IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financial_entries rev WHERE rev.reverses_id=e.id)",[old.request_id])).rows[0].first_payment;
 const start=term?.starts_on||first,terms=(await c.query('SELECT tariff_snapshot_json FROM requests WHERE id=$1 FOR UPDATE',[old.request_id])).rows[0]?.tariff_snapshot_json;
 const months=commissionDefaultMonths(terms);
 const end=term?.ends_on||(start&&months?defaultCommissionPeriod(start,months).endsOn:null);if(!start||!end||start>end)return {status:'missing_term'};
 await c.query('SELECT id FROM dealers WHERE id=$1 FOR SHARE',[old.dealer_id]);
 const override=(await c.query('WITH RECURSIVE ancestors AS (SELECT $1::text AS id UNION ALL SELECT s.original_payment_id FROM commission_payment_supersessions s JOIN ancestors a ON s.replacement_payment_id=a.id) SELECT o.rate_id FROM commission_rate_overrides o JOIN ancestors a ON a.id=o.payment_id ORDER BY o.created_at DESC LIMIT 1',[originalId])).rows[0];
 const chosenRate=manualOverride?.rateId||override?.rate_id;
 const rate=chosenRate?(await c.query('SELECT id,percent_hundredths FROM dealer_commission_rates WHERE id=$1 AND dealer_id=$2',[chosenRate,old.dealer_id])).rows[0]:(await c.query('SELECT id,percent_hundredths FROM dealer_commission_rates WHERE dealer_id=$1 AND effective_on<=$2::date ORDER BY effective_on DESC,id DESC LIMIT 1',[old.dealer_id,replacement.payment_on])).rows[0];if(!rate)return {status:'missing_rate'};
 if(!chosenRate){const ambiguous=(await c.query('SELECT count(*)::int AS n FROM dealer_commission_rates WHERE dealer_id=$1 AND effective_on=$2::date',[old.dealer_id,replacement.payment_on])).rows[0].n;if(ambiguous>1)return {status:'ambiguous_rate'};}
 const value=replacement.payment_on>=start&&replacement.payment_on<=end?commissionForPayment(replacement.amount_minor,rate.percent_hundredths):0;
 await c.query('INSERT INTO commission_payment_snapshots(payment_id,request_id,dealer_id,rate_id,percent_hundredths,payment_minor,commission_minor,payment_on,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[replacement.id,old.request_id,old.dealer_id,rate.id,rate.percent_hundredths,replacement.amount_minor,value,replacement.payment_on,start,end]);
 if(manualOverride)await c.query('INSERT INTO commission_rate_overrides(payment_id,rate_id,reason,actor_user_id) VALUES($1,$2,$3,$4)',[replacement.id,rate.id,manualOverride.reason,actor]);
 await c.query('INSERT INTO commission_payment_supersessions(original_payment_id,replacement_payment_id,actor_user_id) VALUES($1,$2,$3)',[originalId,replacementId,actor]);return {status:'recorded'};
}
