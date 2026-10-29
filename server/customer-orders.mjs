const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function listCustomerOrders(db,userId,params){
 const raw=params.get('offset')||'0',before=params.get('before')||'';if(!/^\d{1,7}$/.test(raw)||(before&&(!uuid(before)||Number(raw)!==0)))throw Error('invalid_input');
 if(before&&!(await db.query('SELECT 1 FROM requests WHERE id=$1 AND customer_user_id=$2',[before,userId])).rowCount)throw Error('invalid_input');
 const result=await db.query("SELECT id,order_number,created_at,status,quantity,product_snapshot_json->>'model' AS model,product_snapshot_json->'quoteProducts' AS products,tariff_snapshot_json->'quote'->'items' AS items FROM requests WHERE customer_user_id=$1 AND ($3::text='' OR (created_at,id)<(SELECT created_at,id FROM requests WHERE id=$3 AND customer_user_id=$1)) ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET $2",[userId,Number(raw),before]);
 return {orders:result.rows.slice(0,20),offset:Number(raw),hasMore:result.rows.length>20,cursorSupported:true};
}
export async function getCustomerOrderPdfRecord(db,userId,id){
 if(!uuid(id))throw Error('not_found');const row=(await db.query('SELECT id,order_number,contact_json,product_snapshot_json,tariff_snapshot_json FROM requests WHERE id=$1 AND customer_user_id=$2',[id,userId])).rows[0];
 if(!row?.tariff_snapshot_json?.quote||!Array.isArray(row.product_snapshot_json?.quoteProducts))throw Error('not_found');
 return {id:row.id,orderNumber:row.order_number,kind:'order',contact:row.contact_json,products:row.product_snapshot_json.quoteProducts,quote:row.tariff_snapshot_json.quote};
}
