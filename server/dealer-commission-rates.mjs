import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export async function listCommissionRates(db,id){
 if(!uuid(id))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM dealers WHERE id=$1',[id])).rowCount)throw Error('not_found');
 return (await db.query("SELECT r.id::text,r.percent_hundredths,to_char(r.effective_on,'YYYY-MM-DD') AS effective_on,r.created_at,u.email AS actor_email FROM dealer_commission_rates r JOIN users u ON u.id=r.actor_user_id WHERE r.dealer_id=$1 ORDER BY r.effective_on DESC,r.id DESC LIMIT 100",[id])).rows;
}
export async function saveCommissionRate(db,actor,input){
 if(!input||!uuid(input.dealerId)||(input.operationId!=null&&!uuid(input.operationId))||!Number.isInteger(input.percentHundredths)||input.percentHundredths<0||input.percentHundredths>10000||!date(input.effectiveOn))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);
  if(!(await c.query('SELECT 1 FROM dealers WHERE id=$1 FOR UPDATE',[input.dealerId])).rowCount)throw Error('not_found');
  if(input.operationId){const existing=(await c.query("SELECT id::text,dealer_id,percent_hundredths,to_char(effective_on,'YYYY-MM-DD') AS effective_on,actor_user_id FROM dealer_commission_rates WHERE operation_id=$1",[input.operationId])).rows[0];if(existing){if(existing.dealer_id!==input.dealerId||existing.percent_hundredths!==input.percentHundredths||existing.effective_on!==input.effectiveOn||existing.actor_user_id!==actor)throw Error('operation_conflict');await c.query('COMMIT');return existing;}}
  else if((await c.query('SELECT 1 FROM dealer_commission_rates WHERE dealer_id=$1 AND effective_on=$2',[input.dealerId,input.effectiveOn])).rowCount)throw Error('date_conflict');
  const today=(await c.query("SELECT to_char(now() AT TIME ZONE 'Asia/Jerusalem','YYYY-MM-DD') AS today")).rows[0].today;
  if(input.effectiveOn<today)throw Error('past_date');
  const row=(await c.query("INSERT INTO dealer_commission_rates(dealer_id,percent_hundredths,effective_on,actor_user_id,operation_id) VALUES($1,$2,$3,$4,$5) RETURNING id::text,percent_hundredths,to_char(effective_on,'YYYY-MM-DD') AS effective_on",[input.dealerId,input.percentHundredths,input.effectiveOn,actor,input.operationId||null])).rows[0];
  await c.query('COMMIT');return row;
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw Error('date_conflict');throw e;}finally{c.release();}
}
