import {requireTransactionAdmin,requireLiveSession} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function getDealerAccess(db,userId){
 if(!uuid(userId))throw Error('invalid_input');
 const row=(await db.query('SELECT u.id,u.dealer_access_version,a.dealer_id,d.name AS dealer_name,d.active AS dealer_active FROM users u LEFT JOIN dealer_user_access a ON a.user_id=u.id LEFT JOIN dealers d ON d.id=a.dealer_id WHERE u.id=$1',[userId])).rows[0];
 if(!row)throw Error('not_found');return row;
}

export async function setDealerAccess(db,actor,input){
 if(!input||!uuid(input.userId)||(input.dealerId!==null&&!uuid(input.dealerId))||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[68499002]);await requireTransactionAdmin(c,actor);
  const user=(await c.query('SELECT id,role,active,dealer_access_version FROM users WHERE id=$1 FOR UPDATE',[input.userId])).rows[0];if(!user)throw Error('not_found');
  if(user.dealer_access_version!==input.expectedVersion)throw Error('version_conflict');
  if(input.dealerId&&(!user.active||user.role==='admin'))throw Error('invalid_input');
  if(input.dealerId&&(await c.query('SELECT 1 FROM staff_permissions WHERE user_id=$1 UNION ALL SELECT 1 FROM access_role_assignments WHERE user_id=$1 LIMIT 1',[input.userId])).rowCount)throw Error('dealer_has_staff_access');
  const old=(await c.query('SELECT dealer_id FROM dealer_user_access WHERE user_id=$1',[input.userId])).rows[0]?.dealer_id||null;
  if(input.dealerId){const d=(await c.query('SELECT active FROM dealers WHERE id=$1 FOR SHARE',[input.dealerId])).rows[0];if(!d)throw Error('not_found');if(!d.active)throw Error('dealer_inactive');}
  if(old!==input.dealerId){await c.query('DELETE FROM dealer_user_access WHERE user_id=$1',[input.userId]);if(input.dealerId)await c.query('INSERT INTO dealer_user_access(user_id,dealer_id) VALUES($1,$2)',[input.userId,input.dealerId]);await c.query('UPDATE users SET dealer_access_version=dealer_access_version+1 WHERE id=$1',[input.userId]);await c.query('INSERT INTO dealer_access_history(user_id,actor_id,previous_dealer_id,new_dealer_id) VALUES($1,$2,$3,$4)',[input.userId,actor,old,input.dealerId]);}
  await c.query('COMMIT');return {userId:input.userId};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

export async function listOwnDealerOrders(db,userId,params,kind='orders'){
 const before=params.get('before')||'',offset=params.get('offset')||'0';if((before&&!uuid(before))||!/^\d{1,6}$/.test(offset)||(kind==='orders'&&offset!=='0')||(kind==='clients'&&before))throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');const u=(await c.query('SELECT active FROM users WHERE id=$1 FOR SHARE',[userId])).rows[0];if(!u?.active)throw Error('forbidden');await requireLiveSession(c,userId);
  const link=(await c.query('SELECT d.id,d.name FROM dealer_user_access a JOIN dealers d ON d.id=a.dealer_id WHERE a.user_id=$1 AND d.active=true FOR SHARE OF a,d',[userId])).rows[0];if(!link)throw Error('forbidden');
  if(kind==='clients'){
   const rows=(await c.query(`SELECT contact_json->>'companyName' AS company,contact_json->>'contactName' AS contact,contact_json->>'email' AS email,contact_json->>'phone' AS phone,count(*)::int AS orders_count,max(created_at) AS latest_order
     FROM requests WHERE dealer_id=$1 GROUP BY 1,2,3,4 ORDER BY max(created_at) DESC,1,2,3,4 LIMIT 21 OFFSET $2`,[link.id,Number(offset)])).rows;
   await c.query('COMMIT');return {dealer:link,clients:rows.slice(0,20),hasMore:rows.length>20,offset:Number(offset)};
  }
  if(before&&!(await c.query('SELECT 1 FROM requests WHERE id=$1 AND dealer_id=$2',[before,link.id])).rowCount)throw Error('invalid_input');
  const result=await c.query(`SELECT id,order_number,status,created_at,quantity,
    contact_json->>'companyName' AS company,contact_json->>'contactName' AS contact,
    contact_json->>'email' AS email,contact_json->>'phone' AS phone,
    product_snapshot_json->>'model' AS model,
    product_snapshot_json->'quoteProducts' AS products,tariff_snapshot_json->'quote'->'items' AS items
    FROM requests WHERE dealer_id=$1 AND ($2::text='' OR (created_at,id)<(SELECT created_at,id FROM requests WHERE id=$2 AND dealer_id=$1)) ORDER BY created_at DESC,id DESC LIMIT 21`,[link.id,before]);
  const orders=result.rows.slice(0,20).map(row=>({...row,
    products:Array.isArray(row.products)?row.products.map(p=>({model:p.model,sku:p.sku})):[],
    items:Array.isArray(row.items)?row.items.map(i=>({mode:i.mode,quantity:i.quantity,rentalDays:i.rentalDays,termMonths:i.termMonths,period:i.period,unitAmountMinor:i.unitAmountMinor,periodTotalMinor:i.periodTotalMinor})):[]}));
  await c.query('COMMIT');return {dealer:link,orders,hasMore:result.rows.length>20};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
