import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export async function listCommissionManualEntries(db,dealerId){
 if(!uuid(dealerId))throw Error('invalid_input');if(!(await db.query('SELECT 1 FROM dealers WHERE id=$1',[dealerId])).rowCount)throw Error('not_found');
 return (await db.query("SELECT e.id,e.kind,e.amount_minor,to_char(e.occurred_on,'YYYY-MM-DD') AS occurred_on,e.reason,e.created_at,u.email AS actor_email FROM dealer_commission_manual_entries e JOIN users u ON u.id=e.actor_user_id WHERE e.dealer_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 100",[dealerId])).rows;
}
export async function saveCommissionManualEntry(db,actor,input){
 if(!input||!uuid(input.id)||!uuid(input.dealerId)||!['adjustment','payout'].includes(input.kind)||!Number.isSafeInteger(input.amountMinor)||!input.amountMinor||Math.abs(input.amountMinor)>1e9||(input.kind==='payout'&&input.amountMinor<0)||!date(input.occurredOn)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000||/[\u0000-\u001f\u007f]/.test(input.reason))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.id]);
  const old=(await c.query("SELECT *,to_char(occurred_on,'YYYY-MM-DD') AS day FROM dealer_commission_manual_entries WHERE id=$1",[input.id])).rows[0];
  if(old){if(old.actor_user_id!==actor||old.dealer_id!==input.dealerId||old.kind!==input.kind||old.amount_minor!==input.amountMinor||old.day!==input.occurredOn||old.reason!==input.reason.trim())throw Error('operation_conflict');await c.query('COMMIT');return {id:old.id};}
  if(!(await c.query('SELECT 1 FROM dealers WHERE id=$1 FOR SHARE',[input.dealerId])).rowCount)throw Error('not_found');
  await c.query('INSERT INTO dealer_commission_manual_entries(id,dealer_id,kind,amount_minor,occurred_on,reason,actor_user_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[input.id,input.dealerId,input.kind,input.amountMinor,input.occurredOn,input.reason.trim(),actor]);await c.query('COMMIT');return {id:input.id};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
