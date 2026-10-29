import {requireTransactionPermission} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const dateOk=v=>v===null||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith('0000-')&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v);
const cols="asset_id,supplier_name,purchase_reference,purchase_cost_minor,to_char(purchase_date,'YYYY-MM-DD') AS purchase_date,to_char(warranty_start,'YYYY-MM-DD') AS warranty_start,to_char(warranty_end,'YYYY-MM-DD') AS warranty_end,version";
export async function findPurchaseAsset(db,serial,limitedHistory=false){
  if(typeof serial!=='string'||!serial.trim()||serial.length>120)throw new Error('invalid_input');
  const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const asset=(await client.query('SELECT a.id,a.serial_number,p.name AS product_name FROM inventory_assets a JOIN products p ON p.id=a.product_id WHERE lower(trim(a.serial_number))=lower(trim($1))',[serial])).rows[0];
  if(!asset)throw new Error('not_found');
  const details=(await client.query(`SELECT ${cols} FROM asset_purchase_details WHERE asset_id=$1`,[asset.id])).rows[0]||null;
  const history=(await client.query('SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM asset_purchase_history h JOIN users u ON u.id=h.actor_user_id WHERE h.asset_id=$1 ORDER BY h.id DESC LIMIT $2',[asset.id,limitedHistory?26:null])).rows;
  await client.query('COMMIT');return {asset,details,history:limitedHistory?history.slice(0,25):history,...(limitedHistory?{historyHasMore:history.length>25}: {})};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function listPurchaseHistory(db,assetId,before){
  if(!uuid(assetId)||typeof before!=='string'||!/^[1-9]\d{0,17}$/.test(before))throw Error('invalid_input');
  if(!(await db.query('SELECT 1 FROM asset_purchase_history WHERE asset_id=$1 AND id=$2::bigint',[assetId,before])).rowCount)throw Error('not_found');
  const rows=(await db.query('SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM asset_purchase_history h JOIN users u ON u.id=h.actor_user_id WHERE h.asset_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26',[assetId,before])).rows;
  return {history:rows.slice(0,25),hasMore:rows.length>25};
}
export async function savePurchaseDetails(db,actorId,input){
  if(!input||!uuid(input.assetId)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<0||[input.supplierName,input.purchaseReference].some(v=>typeof v!=='string'||v.length>200||/[\u0000-\u001f\u007f]/.test(v))||(input.purchaseCostMinor!==null&&(!Number.isSafeInteger(input.purchaseCostMinor)||input.purchaseCostMinor<0||input.purchaseCostMinor>100000000000))||![input.purchaseDate,input.warrantyStart,input.warrantyEnd].every(dateOk)||(input.warrantyStart&&input.warrantyEnd&&input.warrantyEnd<input.warrantyStart))throw new Error('invalid_input');
  const client=await db.connect();
  try{await client.query('BEGIN');await requireTransactionPermission(client,actorId,'inventory_cost');const asset=await client.query('SELECT id FROM inventory_assets WHERE id=$1 FOR UPDATE',[input.assetId]);if(!asset.rowCount)throw new Error('not_found');
    const previous=(await client.query(`SELECT ${cols} FROM asset_purchase_details WHERE asset_id=$1 FOR UPDATE`,[input.assetId])).rows[0]||null;
    if((previous?.version||0)!==input.expectedVersion)throw new Error('version_conflict');
    const values=[input.assetId,input.supplierName.trim(),input.purchaseReference.trim(),input.purchaseCostMinor,input.purchaseDate,input.warrantyStart,input.warrantyEnd];
    const saved=(await client.query(`INSERT INTO asset_purchase_details(asset_id,supplier_name,purchase_reference,purchase_cost_minor,purchase_date,warranty_start,warranty_end) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(asset_id) DO UPDATE SET supplier_name=EXCLUDED.supplier_name,purchase_reference=EXCLUDED.purchase_reference,purchase_cost_minor=EXCLUDED.purchase_cost_minor,purchase_date=EXCLUDED.purchase_date,warranty_start=EXCLUDED.warranty_start,warranty_end=EXCLUDED.warranty_end,version=asset_purchase_details.version+1 RETURNING ${cols}`,values)).rows[0];
    await client.query('INSERT INTO asset_purchase_history(asset_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[input.assetId,actorId,previous?JSON.stringify(previous):null,JSON.stringify(saved)]);await client.query('COMMIT');return saved;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
