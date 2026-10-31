import {requireTransactionAdmin} from './transaction-permissions.mjs';
import {commissionDefaultMonths} from './commission-period.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const date=v=>v===null||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
export async function getCommissionTerms(db,requestId){
 if(!uuid(requestId))throw Error('invalid_input');
 const r=await db.query("SELECT r.id,r.order_number,r.dealer_id,d.name AS dealer_name,r.tariff_snapshot_json,t.version,to_char(t.starts_on,'YYYY-MM-DD') AS starts_on,to_char(t.ends_on,'YYYY-MM-DD') AS ends_on,t.dealer_id AS terms_dealer_id FROM requests r LEFT JOIN dealers d ON d.id=r.dealer_id LEFT JOIN dealer_commission_terms t ON t.request_id=r.id AND t.dealer_id=r.dealer_id WHERE r.id=$1",[requestId]);
 if(!r.rowCount)throw Error('not_found');
 const row=r.rows[0];const months=commissionDefaultMonths(row.tariff_snapshot_json);
 delete row.tariff_snapshot_json;
 const history=(await db.query('SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM dealer_commission_terms_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=$1 ORDER BY h.id DESC LIMIT 100',[requestId])).rows;
 return {...row,default_months:months,history};
}
export async function saveCommissionTerms(db,actor,input){
 if(!input||!uuid(input.requestId)||!uuid(input.dealerId)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<0||!date(input.startsOn)||!date(input.endsOn)||(input.startsOn&&input.endsOn&&input.startsOn>input.endsOn))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);
  const order=(await c.query('SELECT dealer_id FROM requests WHERE id=$1 FOR UPDATE',[input.requestId])).rows[0];if(!order)throw Error('not_found');
  if(order.dealer_id!==input.dealerId)throw Error('dealer_conflict');
  const dealer=(await c.query('SELECT active FROM dealers WHERE id=$1 FOR SHARE',[input.dealerId])).rows[0];if(!dealer?.active)throw Error('dealer_inactive');
  const old=(await c.query("SELECT request_id,dealer_id,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on,version FROM dealer_commission_terms WHERE request_id=$1 AND dealer_id=$2 FOR UPDATE",[input.requestId,input.dealerId])).rows[0];
  if((old?.version||0)!==input.expectedVersion)throw Error('version_conflict');
  const row=old?(await c.query("UPDATE dealer_commission_terms SET starts_on=$1,ends_on=$2,version=version+1,updated_at=now() WHERE request_id=$3 AND dealer_id=$4 RETURNING request_id,dealer_id,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on,version",[input.startsOn,input.endsOn,input.requestId,input.dealerId])).rows[0]:(await c.query("INSERT INTO dealer_commission_terms(request_id,dealer_id,starts_on,ends_on) VALUES($1,$2,$3,$4) RETURNING request_id,dealer_id,to_char(starts_on,'YYYY-MM-DD') AS starts_on,to_char(ends_on,'YYYY-MM-DD') AS ends_on,version",[input.requestId,input.dealerId,input.startsOn,input.endsOn])).rows[0];
  await c.query('INSERT INTO dealer_commission_terms_history(request_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[input.requestId,actor,old?JSON.stringify(old):null,JSON.stringify(row)]);await c.query('COMMIT');return row;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
