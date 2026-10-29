import {requireTransactionPermission} from './transaction-permissions.mjs';
import {randomUUID} from 'node:crypto';
const statuses=['received','qa','available','reserved','issued','service_issued','repair','retired'];
const columns='id,serial_number,product_id,location,condition_notes,status,version,created_at,updated_at';
export async function inventoryProducts(db){return (await db.query('SELECT id,name,category FROM products ORDER BY name,id')).rows;}
export async function listInventory(db,params){
  const search=(params.get('search')||'').trim(),status=params.get('status')||'all',raw=params.get('offset')||'0',assetId=params.get('assetId')||'',before=params.get('before')||'';
  const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  if(search.length>200||!['all',...statuses].includes(status)||!/^\d{1,7}$/.test(raw)||(assetId&&!uuid(assetId))||(before&&(!uuid(before)||Number(raw)!==0)))throw new Error('invalid_input');
  const where=`($1::text='all' OR a.status=$1) AND ($4::text='' OR a.id=$4) AND (
    strpos(lower(concat_ws(' ',a.serial_number,a.location,p.name)),lower($2))>0
    OR ($2<>'' AND EXISTS(SELECT 1 FROM inventory_asset_history h WHERE h.asset_id=a.id AND strpos(lower(COALESCE(h.previous_data->>'serial_number','')),lower($2))>0))
    OR EXISTS(SELECT 1 FROM asset_reservations r JOIN requests q ON q.id=r.request_id WHERE r.asset_id=a.id AND r.released_at IS NULL AND strpos(lower(concat_ws(' ',r.request_id,q.order_number::text)),lower($2))>0)
    OR EXISTS(SELECT 1 FROM service_replacements sr JOIN service_tickets t ON t.id=sr.ticket_id JOIN asset_reservations r ON r.id=t.reservation_id JOIN requests q ON q.id=r.request_id WHERE sr.asset_id=a.id AND sr.returned_at IS NULL AND strpos(lower(concat_ws(' ',r.request_id,q.order_number::text)),lower($2))>0)
  )`,offset=Number(raw);
  const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if(before&&!(await client.query(`SELECT 1 FROM inventory_assets a JOIN products p ON p.id=a.product_id WHERE ${where.replaceAll('$4','$3')} AND a.id=$4`,[status,search,assetId,before])).rowCount)throw Error('invalid_input');
  const rows=(await client.query(`SELECT a.*,p.name AS product_name,
    ($2<>'' AND strpos(lower(a.serial_number),lower($2))=0 AND EXISTS(SELECT 1 FROM inventory_asset_history h WHERE h.asset_id=a.id AND strpos(lower(COALESCE(h.previous_data->>'serial_number','')),lower($2))>0)) AS matched_previous_serial,
    (SELECT r.request_id FROM asset_reservations r WHERE r.asset_id=a.id AND r.released_at IS NULL ORDER BY r.reserved_at DESC,r.id DESC LIMIT 1) AS active_request_id,
    (SELECT q.order_number FROM asset_reservations r JOIN requests q ON q.id=r.request_id WHERE r.asset_id=a.id AND r.released_at IS NULL ORDER BY r.reserved_at DESC,r.id DESC LIMIT 1) AS active_order_number,
    (SELECT r.request_id FROM service_replacements sr JOIN service_tickets t ON t.id=sr.ticket_id JOIN asset_reservations r ON r.id=t.reservation_id WHERE sr.asset_id=a.id AND sr.returned_at IS NULL ORDER BY sr.issued_at DESC,sr.id DESC LIMIT 1) AS replacement_request_id,
    (SELECT q.order_number FROM service_replacements sr JOIN service_tickets t ON t.id=sr.ticket_id JOIN asset_reservations r ON r.id=t.reservation_id JOIN requests q ON q.id=r.request_id WHERE sr.asset_id=a.id AND sr.returned_at IS NULL ORDER BY sr.issued_at DESC,sr.id DESC LIMIT 1) AS replacement_order_number
    FROM inventory_assets a JOIN products p ON p.id=a.product_id WHERE ${where} AND ($5::text='' OR (a.created_at,a.id)<(SELECT created_at,id FROM inventory_assets WHERE id=$5)) ORDER BY a.created_at DESC,a.id DESC LIMIT 26 OFFSET $3`,[status,search,offset,assetId,before])).rows;
  const count=(await client.query(`SELECT count(*)::integer AS total FROM inventory_assets a JOIN products p ON p.id=a.product_id WHERE ${where.replaceAll('$4','$3')}`,[status,search,assetId])).rows[0].total;
  const assets=rows.slice(0,25);
  const history=await client.query(`SELECT a.id AS asset_id,h.* FROM unnest($1::text[]) a(id) CROSS JOIN LATERAL (SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM inventory_asset_history h JOIN users u ON u.id=h.actor_user_id WHERE h.asset_id=a.id ORDER BY h.id DESC LIMIT 26) h`,[assets.map(a=>a.id)]);
  for(const a of assets){const rows=history.rows.filter(h=>h.asset_id===a.id);a.history=rows.slice(0,25);a.historyHasMore=rows.length>25;}
  await client.query('COMMIT');return {assets,total:count,hasMore:rows.length>25,offset,assetFilterSupported:true,cursorSupported:true};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function listInventoryHistory(db,params){
 const id=params.get('assetId')||'',before=params.get('before')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[1-9]\d{0,17}$/.test(before))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM inventory_assets WHERE id=$1',[id])).rowCount)throw Error('not_found');
 if(!(await db.query('SELECT 1 FROM inventory_asset_history WHERE asset_id=$1 AND id=$2::bigint',[id,before])).rowCount)throw Error('not_found');
 const rows=(await db.query('SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM inventory_asset_history h JOIN users u ON u.id=h.actor_user_id WHERE h.asset_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26',[id,before])).rows;
 return {history:rows.slice(0,25),hasMore:rows.length>25};
}
export async function saveInventoryAsset(db,actorId,input){
  const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  if(!input||typeof input.serialNumber!=='string'||!input.serialNumber.trim()||input.serialNumber.length>120||typeof input.productId!=='string'||!input.productId||input.productId.length>120||typeof input.location!=='string'||input.location.length>200||typeof input.conditionNotes!=='string'||input.conditionNotes.length>2000||[input.serialNumber,input.productId,input.location,input.conditionNotes].some(v=>/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))||!statuses.includes(input.status)||['reserved','issued','service_issued'].includes(input.status))throw new Error('invalid_input');
  if(input.id&&(!uuid(input.id)||!Number.isInteger(input.version)||input.version<1))throw new Error('invalid_input');
  if(input.createId!==undefined&&(input.id||!uuid(input.createId)))throw new Error('invalid_input');
  if(!input.id&&input.status!=='received')throw new Error('invalid_input');
  const client=await db.connect();
  try{await client.query('BEGIN');await requireTransactionPermission(client,actorId,'inventory');
    if(input.createId){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.createId]);const existing=(await client.query('SELECT h.actor_user_id,h.new_data AS original FROM inventory_assets a LEFT JOIN LATERAL (SELECT actor_user_id,new_data FROM inventory_asset_history WHERE asset_id=a.id ORDER BY id LIMIT 1) h ON true WHERE a.id=$1',[input.createId])).rows[0];if(existing){const original=existing.original;if(existing.actor_user_id!==actorId||!original||original.serial_number!==input.serialNumber.trim()||original.product_id!==input.productId||original.location!==input.location.trim()||original.condition_notes!==input.conditionNotes.trim()||original.status!==input.status)throw Error('create_conflict');await client.query('COMMIT');return original;}}
    const product=await client.query('SELECT id FROM products WHERE id=$1 FOR SHARE',[input.productId]);if(!product.rowCount)throw new Error('product_not_found');
    let previous=null;if(input.id){const found=await client.query(`SELECT ${columns} FROM inventory_assets WHERE id=$1 FOR UPDATE`,[input.id]);if(!found.rowCount)throw new Error('not_found');previous=found.rows[0];if(previous.version!==input.version)throw new Error('version_conflict');if(['reserved','issued','service_issued'].includes(previous.status))throw new Error('asset_reserved');}
    const values=[input.serialNumber.trim(),input.productId,input.location.trim(),input.conditionNotes.trim(),input.status];
    const result=input.id?await client.query(`UPDATE inventory_assets SET serial_number=$1,product_id=$2,location=$3,condition_notes=$4,status=$5,version=version+1,updated_at=now() WHERE id=$6 RETURNING ${columns}`,[...values,input.id]):await client.query(`INSERT INTO inventory_assets(serial_number,product_id,location,condition_notes,status,id) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${columns}`,[...values,input.createId||randomUUID()]);
    const asset=result.rows[0];await client.query('INSERT INTO inventory_asset_history(asset_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[asset.id,actorId,previous?JSON.stringify(previous):null,JSON.stringify(asset)]);await client.query('COMMIT');return asset;
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw new Error('duplicate_serial');throw error;}finally{client.release();}
}
