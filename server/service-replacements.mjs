import {requireTransactionPermission} from './transaction-permissions.mjs';
import {randomUUID,createHash} from 'node:crypto';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function changeServiceReplacement(db,actorId,input){
 if(!input||!uuid(input.ticketId)||!['issue','return'].includes(input.action)||typeof input.notes!=='string'||input.notes.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.notes)||(input.action==='issue'&&(typeof input.serialNumber!=='string'||!input.serialNumber.trim()||input.serialNumber.length>120))||(input.action==='return'&&!uuid(input.replacementId)))throw new Error('invalid_input');
 if(input.operationId!==undefined&&!uuid(input.operationId))throw Error('invalid_input');
 const data=input.action==='issue'?{ticketId:input.ticketId,action:input.action,serialNumber:input.serialNumber.trim(),notes:input.notes.trim()}:{ticketId:input.ticketId,action:input.action,replacementId:input.replacementId,notes:input.notes.trim()};
 const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 const client=await db.connect();
 try{await client.query('BEGIN');await requireTransactionPermission(client,actorId,'service');await requireTransactionPermission(client,actorId,'inventory');
  if(input.operationId){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.operationId]);const prior=(await client.query('SELECT * FROM replacement_operations WHERE id=$1',[input.operationId])).rows[0];if(prior){if(prior.actor_user_id!==actorId||prior.payload_hash!==hash)throw Error('operation_conflict');await client.query('COMMIT');return{id:prior.replacement_id,assetId:prior.asset_id};}}
  const lookup=(await client.query('SELECT asset_id FROM service_tickets WHERE id=$1',[input.ticketId])).rows[0];if(!lookup)throw new Error('ticket_not_found');
  const original=(await client.query('SELECT id,status FROM inventory_assets WHERE id=$1 FOR UPDATE',[lookup.asset_id])).rows[0];
  const ticket=(await client.query('SELECT id,asset_id,reservation_id,status FROM service_tickets WHERE id=$1 FOR UPDATE',[input.ticketId])).rows[0];if(!ticket||ticket.asset_id!==original.id)throw new Error('ticket_not_found');
  let replacement,asset;
  if(input.action==='issue'){
    if(ticket.status==='closed')throw new Error('ticket_closed');
    if(!ticket.reservation_id||original.status!=='issued'||!(await client.query('SELECT 1 FROM asset_reservations WHERE id=$1 AND asset_id=$2 AND released_at IS NULL',[ticket.reservation_id,original.id])).rowCount)throw new Error('order_not_active');
    if((await client.query('SELECT 1 FROM service_replacements sr JOIN service_tickets st ON st.id=sr.ticket_id WHERE st.reservation_id=$1 AND sr.returned_at IS NULL',[ticket.reservation_id])).rowCount)throw new Error('replacement_active');
    asset=(await client.query('SELECT * FROM inventory_assets WHERE lower(trim(serial_number))=lower(trim($1)) FOR UPDATE',[input.serialNumber])).rows[0];
    if(!asset)throw new Error('asset_not_found');if(asset.id===original.id||asset.status!=='available')throw new Error('asset_unavailable');
    replacement=(await client.query('INSERT INTO service_replacements(id,ticket_id,asset_id,issued_by,issue_notes,serial_at_issue) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),ticket.id,asset.id,actorId,input.notes.trim(),asset.serial_number])).rows[0];
  }else{
    replacement=(await client.query('SELECT * FROM service_replacements WHERE id=$1 AND ticket_id=$2 AND returned_at IS NULL FOR UPDATE',[input.replacementId,ticket.id])).rows[0];if(!replacement)throw new Error('replacement_not_found');
    asset=(await client.query('SELECT * FROM inventory_assets WHERE id=$1 FOR UPDATE',[replacement.asset_id])).rows[0];if(!asset||asset.status!=='service_issued')throw new Error('asset_unavailable');
    await client.query('UPDATE service_replacements SET returned_at=now(),returned_by=$1,return_notes=$2 WHERE id=$3',[actorId,input.notes.trim(),replacement.id]);
  }
  const updated=(await client.query('UPDATE inventory_assets SET status=$1,version=version+1,updated_at=now() WHERE id=$2 RETURNING *',[input.action==='issue'?'service_issued':'qa',asset.id])).rows[0];
  await client.query('INSERT INTO inventory_asset_history(asset_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[asset.id,actorId,JSON.stringify(asset),JSON.stringify(updated)]);
  if(input.operationId)await client.query('INSERT INTO replacement_operations(id,actor_user_id,ticket_id,payload_hash,replacement_id,asset_id) VALUES($1,$2,$3,$4,$5,$6)',[input.operationId,actorId,ticket.id,hash,replacement.id,asset.id]);
  await client.query('COMMIT');return{id:replacement.id,assetId:asset.id};
 }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw new Error('replacement_active');throw error;}finally{client.release();}
}
