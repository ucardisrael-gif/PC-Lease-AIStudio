import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const tableFor=kind=>kind==='user'?'users':kind==='organization'?'organizations':null;

export async function getDealerClientLink(db,params){
 const kind=params.get('kind'),id=params.get('id'),table=tableFor(kind);if(!table||!uuid(id))throw Error('invalid_input');
 const row=(await db.query(`SELECT e.client_dealer_id,e.client_dealer_version,d.name AS dealer_name,d.active AS dealer_active FROM ${table} e LEFT JOIN dealers d ON d.id=e.client_dealer_id WHERE e.id=$1`,[id])).rows[0];
 if(!row)throw Error('not_found');return row;
}

export async function saveDealerClientLink(db,actor,input){
 const table=tableFor(input?.kind);if(!table||!uuid(input.id)||(input.dealerId!==null&&!uuid(input.dealerId))||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[68499002]);await requireTransactionAdmin(c,actor);
  const entity=(await c.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[input.id])).rows[0];if(!entity)throw Error('not_found');
  if(entity.client_dealer_version!==input.expectedVersion)throw Error('version_conflict');
  if(input.dealerId&&input.kind==='user'){
   if(entity.role!=='customer'||!entity.active||(await c.query('SELECT 1 FROM staff_permissions WHERE user_id=$1 UNION ALL SELECT 1 FROM access_role_assignments WHERE user_id=$1 UNION ALL SELECT 1 FROM dealer_user_access WHERE user_id=$1 LIMIT 1',[input.id])).rowCount)throw Error('not_customer');
  }
  if(input.dealerId){const dealer=(await c.query('SELECT active FROM dealers WHERE id=$1 FOR SHARE',[input.dealerId])).rows[0];if(!dealer)throw Error('not_found');if(!dealer.active)throw Error('dealer_inactive');}
  if(entity.client_dealer_id!==input.dealerId){await c.query(`UPDATE ${table} SET client_dealer_id=$1,client_dealer_version=client_dealer_version+1 WHERE id=$2`,[input.dealerId,input.id]);await c.query('INSERT INTO dealer_client_history(entity_type,user_id,organization_id,old_dealer_id,new_dealer_id,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)',[input.kind,input.kind==='user'?input.id:null,input.kind==='organization'?input.id:null,entity.client_dealer_id,input.dealerId,actor]);}
  await c.query('COMMIT');return {ok:true};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
