import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function getRequestDealer(db,id,offset='0'){
 if(!uuid(id)||!/^\d{1,7}$/.test(offset))throw Error('invalid_input');
 const row=(await db.query('SELECT r.dealer_id,r.dealer_link_version,d.name AS dealer_name,d.active AS dealer_active FROM requests r LEFT JOIN dealers d ON d.id=r.dealer_id WHERE r.id=$1',[id])).rows[0];if(!row)throw Error('not_found');
 const history=(await db.query('SELECT h.old_name,h.new_name,h.created_at,u.email AS actor_email FROM request_dealer_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=$1 ORDER BY h.id DESC LIMIT 26 OFFSET $2',[id,Number(offset)])).rows;
 return {...row,history:history.slice(0,25),historyHasMore:history.length>25,historyOffset:Number(offset)};
}
export async function linkRequestDealer(db,actor,input){
 if(!input||!uuid(input.id)||(input.dealerId!==null&&!uuid(input.dealerId))||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);const old=(await c.query('SELECT dealer_id,dealer_link_version FROM requests WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!old)throw Error('not_found');if(old.dealer_link_version!==input.expectedVersion)throw Error('version_conflict');if(old.dealer_id===input.dealerId)throw Error('invalid_input');
 const partners=(await c.query('SELECT id,name,active FROM dealers WHERE id=ANY($1::text[]) FOR SHARE',[[old.dealer_id,input.dealerId].filter(Boolean)])).rows;const map=new Map(partners.map(d=>[d.id,d]));if(input.dealerId&&!map.has(input.dealerId))throw Error('dealer_not_found');if(input.dealerId&&!map.get(input.dealerId).active)throw Error('dealer_inactive');
 await c.query('UPDATE requests SET dealer_id=$1,dealer_link_version=dealer_link_version+1 WHERE id=$2',[input.dealerId,input.id]);await c.query('INSERT INTO request_dealer_history(request_id,old_dealer_id,old_name,new_dealer_id,new_name,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)',[input.id,old.dealer_id,map.get(old.dealer_id)?.name||null,input.dealerId,map.get(input.dealerId)?.name||null,actor]);await c.query('COMMIT');return {id:input.id};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
