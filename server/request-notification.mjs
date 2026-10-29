import {requireTransactionPermission} from './transaction-permissions.mjs';
import {notifyMultiQuote} from './multi-quote.mjs';
import {notifyRequest} from './requests.mjs';
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function sendInitialRequestNotification(db,mailer,record,kind,adminOrigin=null){
 const c=await db.connect();try{
  await c.query('BEGIN');const row=(await c.query('SELECT notification_status,notification_pending_at FROM requests WHERE id=$1 FOR UPDATE',[record.id])).rows[0];
  if(!row)throw Error('not_found');if(row.notification_status!=='pending'||row.notification_pending_at){await c.query('COMMIT');return row.notification_status;}
  const status=kind==='order'?await notifyMultiQuote(c,mailer,record,adminOrigin):await notifyRequest(c,mailer,record);
  await c.query('COMMIT');return status;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function resolvePendingRequestNotification(db,actor,input){
 if(!input||!uuid(input.id)||input.checkedMailbox!==true)throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const row=(await c.query("SELECT notification_status,COALESCE(notification_pending_at,created_at)<=now()-interval '5 minutes' AS old_enough FROM requests WHERE id=$1 FOR UPDATE",[input.id])).rows[0];
  if(!row)throw Error('not_found');if(row.notification_status!=='pending'||!row.old_enough)throw Error('not_resolvable');
  await c.query("UPDATE requests SET notification_status='failed' WHERE id=$1",[input.id]);
  await c.query('INSERT INTO request_notification_resolutions(request_id,actor_user_id) VALUES($1,$2)',[input.id,actor]);
  await c.query('COMMIT');return {id:input.id,notification:'failed'};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function retryRequestNotification(db,mailer,actor,id,adminOrigin=null){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const claim=(await c.query('SELECT notification_status FROM requests WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!claim)throw Error('not_found');if(claim.notification_status!=='failed')throw Error('not_retryable');
 const pending=(await c.query("UPDATE requests SET notification_status='pending',notification_pending_at=clock_timestamp() WHERE id=$1 RETURNING notification_pending_at::text AS marker",[id])).rows[0].marker;await c.query('COMMIT');
 await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const row=(await c.query("SELECT * FROM requests WHERE id=$1 AND notification_status='pending' AND notification_pending_at=$2::timestamptz FOR UPDATE",[id,pending])).rows[0];if(!row)throw Error('not_retryable');
 const terms=row.tariff_snapshot_json,product=row.product_snapshot_json,contact=row.contact_json;
 const status=terms.kind==='order'&&terms.quote?await notifyMultiQuote(c,mailer,{id,orderNumber:row.order_number,quote:terms.quote,products:product.quoteProducts,contact},adminOrigin):await notifyRequest(c,mailer,{id,details:{product:product.title?.en||product.model||'—',mode:terms.mode,quantity:row.quantity,rentalDays:terms.rentalDays??terms.price?.rentalDays,price:terms.price,...contact}});
 await c.query('INSERT INTO request_notification_attempts(request_id,actor_user_id,result) VALUES($1,$2,$3)',[id,actor,status]);await c.query('COMMIT');return {id,notification:status};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
