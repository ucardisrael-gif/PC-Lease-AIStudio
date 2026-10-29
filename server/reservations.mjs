import {requireTransactionPermission} from './transaction-permissions.mjs';
import {randomUUID,createHash} from 'node:crypto';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function readHandoverPage(db,requestId,before=null){
  const large=(await db.query('SELECT EXISTS(SELECT 1 FROM asset_reservations WHERE request_id=$1 OFFSET 500 LIMIT 1) AS large',[requestId])).rows[0].large;
  const values=before===null?[requestId]:[requestId,before];
  if(large){const condition=before===null?'':' AND h.id<$2::bigint';return (await db.query(`SELECT h.id::text,h.action,h.notes,h.created_at,u.email AS actor_email,a.serial_number,h.serial_at_event,r.line_index FROM asset_handover_events h JOIN asset_reservations r ON r.id=h.reservation_id JOIN inventory_assets a ON a.id=r.asset_id JOIN users u ON u.id=h.actor_user_id WHERE r.request_id=$1${condition} ORDER BY h.id DESC LIMIT 26`,values)).rows;}
  const condition=before===null?'':' AND e.id<$2::bigint';
  return (await db.query(`SELECT h.id::text,h.action,h.notes,h.created_at,u.email AS actor_email,a.serial_number,h.serial_at_event,r.line_index FROM asset_reservations r CROSS JOIN LATERAL (SELECT e.id,e.action,e.notes,e.created_at,e.actor_user_id,e.serial_at_event FROM asset_handover_events e WHERE e.reservation_id=r.id${condition} ORDER BY e.id DESC LIMIT 26) h JOIN inventory_assets a ON a.id=r.asset_id JOIN users u ON u.id=h.actor_user_id WHERE r.request_id=$1 ORDER BY h.id DESC LIMIT 26`,values)).rows;
}
function lines(row){
  const items=row.tariff_snapshot_json?.quote?.items, products=row.product_snapshot_json?.quoteProducts;
  if(row.tariff_snapshot_json?.quote){const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);if(!Array.isArray(items)||!Array.isArray(products)||items.length!==products.length||!items.length||items.length>25||!items.every(record)||!products.every(record))throw Error('invalid_order_snapshot');return items.map((item,i)=>({index:i,slug:products[i]?.slug,model:products[i]?.model,sku:products[i]?.sku||'',quantity:item?.quantity,mode:item?.mode,rentalDays:item?.rentalDays??null,termMonths:item?.termMonths??null}));}
  return [{index:0,slug:row.product_slug,model:row.product_snapshot_json?.model,quantity:row.quantity,mode:row.tariff_snapshot_json?.mode??null,rentalDays:row.tariff_snapshot_json?.rentalDays??row.tariff_snapshot_json?.price?.rentalDays??null,termMonths:row.tariff_snapshot_json?.price?.termMonths??null}];
}
async function readRequest(db,id,lock=''){
  const result=await db.query(`SELECT r.id,r.order_number,r.status,r.quantity,r.product_snapshot_json,r.tariff_snapshot_json,p.slug AS product_slug FROM requests r LEFT JOIN products p ON p.id=r.product_id WHERE r.id=$1 ${lock}`,[id]);
  if(!result.rowCount)throw new Error('request_not_found');return result.rows[0];
}
export async function getReservations(db,id){
  const client=await db.connect();
  try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if(!uuid(id)){if(typeof id!=='string'||!/^\d{1,19}$/.test(id))throw new Error('invalid_input');const match=await client.query('SELECT id FROM requests WHERE order_number::text=$1',[id]);if(!match.rowCount)throw new Error('request_not_found');id=match.rows[0].id;}const request=await readRequest(client,id);
  const reservations=(await client.query('SELECT r.id,r.line_index,r.reserved_at,a.serial_number,a.id AS asset_id,a.status FROM asset_reservations r JOIN inventory_assets a ON a.id=r.asset_id WHERE r.request_id=$1 AND r.released_at IS NULL ORDER BY r.line_index,r.reserved_at,r.id',[id])).rows;
  const reservationHistory=(await client.query(`SELECT r.id,r.line_index,r.reserved_at,r.released_at,a.serial_number,r.serial_at_reservation,creator.email AS reserved_by,releaser.email AS released_by FROM asset_reservations r JOIN inventory_assets a ON a.id=r.asset_id JOIN users creator ON creator.id=r.reserved_by LEFT JOIN users releaser ON releaser.id=r.released_by WHERE r.request_id=$1 ORDER BY r.reserved_at DESC,r.id DESC LIMIT 26`,[id])).rows;
  const events=await readHandoverPage(client,id);
  const replacements=(await client.query('SELECT sr.id,sr.ticket_id,sr.issued_at,a.serial_number,original.serial_number AS original_serial_number FROM service_replacements sr JOIN service_tickets t ON t.id=sr.ticket_id JOIN asset_reservations r ON r.id=t.reservation_id JOIN inventory_assets a ON a.id=sr.asset_id JOIN inventory_assets original ON original.id=t.asset_id WHERE r.request_id=$1 AND sr.returned_at IS NULL ORDER BY sr.issued_at,sr.id',[id])).rows;
  let orderLines,snapshotInvalid=false;try{orderLines=lines(request);}catch(error){if(error.message!=='invalid_order_snapshot')throw error;orderLines=[];snapshotInvalid=true;}
  await client.query('COMMIT');return {request:{id:request.id,order_number:request.order_number,status:request.status,lines:orderLines,snapshotInvalid},reservations,reservationHistory:reservationHistory.slice(0,25),reservationHistoryHasMore:reservationHistory.length>25,events:events.slice(0,25),eventsHasMore:events.length>25,replacements};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function getReservationHistoryPage(db,params){
  const requestId=params.get('requestId')||'',kind=params.get('kind')||'',before=params.get('before')||'';
  if(!uuid(requestId)||!['reservation','handover'].includes(kind)||(kind==='reservation'?!uuid(before):!/^[1-9]\d{0,17}$/.test(before)))throw Error('invalid_input');
  if(!(await db.query('SELECT 1 FROM requests WHERE id=$1',[requestId])).rowCount)throw Error('request_not_found');
  let history;
  if(kind==='reservation'){
    const anchor=(await db.query('SELECT reserved_at,id FROM asset_reservations WHERE id=$1 AND request_id=$2',[before,requestId])).rows[0];if(!anchor)throw Error('not_found');
    history=(await db.query(`SELECT r.id,r.line_index,r.reserved_at,r.released_at,a.serial_number,r.serial_at_reservation,creator.email AS reserved_by,releaser.email AS released_by FROM asset_reservations r JOIN inventory_assets a ON a.id=r.asset_id JOIN users creator ON creator.id=r.reserved_by LEFT JOIN users releaser ON releaser.id=r.released_by WHERE r.request_id=$1 AND (r.reserved_at,r.id)<((SELECT reserved_at FROM asset_reservations WHERE id=$2),$2::text) ORDER BY r.reserved_at DESC,r.id DESC LIMIT 26`,[requestId,anchor.id])).rows;
  }else {
    if(!(await db.query('SELECT 1 FROM asset_handover_events h JOIN asset_reservations r ON r.id=h.reservation_id WHERE h.id=$1::bigint AND r.request_id=$2',[before,requestId])).rowCount)throw Error('not_found');
    history=await readHandoverPage(db,requestId,before);
  }
  return {history:history.slice(0,25),hasMore:history.length>25};
}
export async function changeReservation(db,actorId,input){
  if(!input||!uuid(input.requestId)||!['reserve','release','issue','return'].includes(input.action)||(input.action==='reserve'&&(!Number.isInteger(input.lineIndex)||input.lineIndex<0||input.lineIndex>24||typeof input.serialNumber!=='string'||!input.serialNumber.trim()||input.serialNumber.length>120))||(input.action!=='reserve'&&!uuid(input.reservationId))||(['issue','return'].includes(input.action)&&(typeof input.notes!=='string'||input.notes.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.notes))))throw new Error('invalid_input');
  if(input.operationId!==undefined&&!uuid(input.operationId))throw new Error('invalid_input');
  const data=input.action==='reserve'?{action:input.action,requestId:input.requestId,lineIndex:input.lineIndex,serialNumber:input.serialNumber.trim()}:{action:input.action,requestId:input.requestId,reservationId:input.reservationId,...(['issue','return'].includes(input.action)?{notes:input.notes.trim()}: {})};
  const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const client=await db.connect();
  try{await client.query('BEGIN');await requireTransactionPermission(client,actorId,'inventory');
    if(input.operationId){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.operationId]);const previous=(await client.query('SELECT * FROM reservation_operations WHERE id=$1',[input.operationId])).rows[0];if(previous){if(previous.actor_user_id!==actorId||previous.payload_hash!==hash)throw Error('operation_conflict');await client.query('COMMIT');return{id:previous.reservation_id,assetId:previous.asset_id};}}
    const request=await readRequest(client,input.requestId,'FOR UPDATE OF r');
    let asset,reservation;
    if(input.action==='reserve'){
      if(request.status==='closed')throw new Error('request_closed');
      const line=lines(request)[input.lineIndex];if(!line||!line.slug||!Number.isInteger(line.quantity)||line.quantity<1)throw new Error('invalid_line');
      const found=await client.query('SELECT a.*,p.slug FROM inventory_assets a JOIN products p ON p.id=a.product_id WHERE lower(trim(a.serial_number))=lower(trim($1)) FOR UPDATE OF a',[input.serialNumber]);
      if(!found.rowCount)throw new Error('asset_not_found');asset=found.rows[0];
      if(asset.status!=='available')throw new Error('asset_unavailable');if(asset.slug!==line.slug)throw new Error('model_mismatch');
      const count=await client.query('SELECT count(*)::integer AS count FROM asset_reservations WHERE request_id=$1 AND line_index=$2 AND released_at IS NULL',[request.id,input.lineIndex]);
      if(count.rows[0].count>=line.quantity)throw new Error('quantity_filled');
      reservation=(await client.query('INSERT INTO asset_reservations(id,asset_id,request_id,line_index,reserved_by,serial_at_reservation) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),asset.id,request.id,input.lineIndex,actorId,asset.serial_number])).rows[0];
    }else{
      const found=await client.query('SELECT r.*,a.status,a.serial_number FROM asset_reservations r JOIN inventory_assets a ON a.id=r.asset_id WHERE r.id=$1 AND r.request_id=$2 AND r.released_at IS NULL FOR UPDATE OF r,a',[input.reservationId,request.id]);
      if(!found.rowCount)throw new Error('reservation_not_found');reservation=found.rows[0];if(reservation.status!==(input.action==='return'?'issued':'reserved'))throw new Error('asset_unavailable');
      if(input.action==='issue'){if(request.status==='closed')throw new Error('request_closed');lines(request);}
      asset=(await client.query('SELECT * FROM inventory_assets WHERE id=$1',[reservation.asset_id])).rows[0];
      if(input.action==='release'||input.action==='return')await client.query('UPDATE asset_reservations SET released_at=now(),released_by=$1 WHERE id=$2',[actorId,reservation.id]);
      if(input.action==='issue'||input.action==='return')await client.query('INSERT INTO asset_handover_events(reservation_id,action,actor_user_id,notes,serial_at_event) VALUES($1,$2,$3,$4,$5)',[reservation.id,input.action==='issue'?'issued':'returned',actorId,input.notes.trim(),asset.serial_number]);
    }
    const newStatus=input.action==='reserve'?'reserved':input.action==='issue'?'issued':input.action==='return'?'qa':'available';
    const updated=(await client.query('UPDATE inventory_assets SET status=$1,version=version+1,updated_at=now() WHERE id=$2 RETURNING *',[newStatus,asset.id])).rows[0];
    await client.query('INSERT INTO inventory_asset_history(asset_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[asset.id,actorId,JSON.stringify(asset),JSON.stringify(updated)]);
    if(input.operationId)await client.query('INSERT INTO reservation_operations(id,actor_user_id,request_id,payload_hash,reservation_id,asset_id) VALUES($1,$2,$3,$4,$5,$6)',[input.operationId,actorId,request.id,hash,reservation.id,asset.id]);
    await client.query('COMMIT');return {id:reservation.id,assetId:asset.id};
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw new Error('asset_unavailable');throw error;}finally{client.release();}
}
