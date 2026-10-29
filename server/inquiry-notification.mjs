import {requireTransactionPermission} from './transaction-permissions.mjs';
import {sendContactMessage} from './contact.mjs';
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function sendInitialInquiryNotification(db,mailer,id){
 const c=await db.connect();try{
  await c.query('BEGIN');const inquiry=(await c.query('SELECT * FROM contact_inquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!inquiry)throw Error('not_found');if(inquiry.notification_status!=='pending'||inquiry.notification_pending_at){await c.query('COMMIT');return inquiry.notification_status;}
  let result='failed';try{await sendContactMessage(c,mailer,inquiry);result='sent';}catch(error){if(error.message==='notification_uncertain')result='pending';}
  await c.query("UPDATE contact_inquiries SET notification_status=$2,notification_pending_at=CASE WHEN $2='pending' THEN COALESCE(notification_pending_at,clock_timestamp()) ELSE NULL END WHERE id=$1",[id,result]);await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function resolvePendingInquiryNotification(db,actor,input){
 if(!input||!uuid(input.id)||input.checkedMailbox!==true)throw Error('invalid_input');
 const c=await db.connect();try{
  await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const row=(await c.query("SELECT notification_status,COALESCE(notification_pending_at,created_at)<=now()-interval '5 minutes' AS old_enough FROM contact_inquiries WHERE id=$1 FOR UPDATE",[input.id])).rows[0];
  if(!row)throw Error('not_found');if(row.notification_status!=='pending'||!row.old_enough)throw Error('not_resolvable');
  await c.query("UPDATE contact_inquiries SET notification_status='failed' WHERE id=$1",[input.id]);
  await c.query('INSERT INTO inquiry_notification_resolutions(inquiry_id,actor_user_id) VALUES($1,$2)',[input.id,actor]);
  await c.query('COMMIT');return {id:input.id,notification:'failed'};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function retryInquiryNotification(db,mailer,actor,id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const claim=(await c.query('SELECT notification_status FROM contact_inquiries WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!claim)throw Error('not_found');if(claim.notification_status!=='failed')throw Error('not_retryable');
 const pending=(await c.query("UPDATE contact_inquiries SET notification_status='pending',notification_pending_at=clock_timestamp() WHERE id=$1 RETURNING notification_pending_at::text AS marker",[id])).rows[0].marker;await c.query('COMMIT');
 await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const inquiry=(await c.query("SELECT * FROM contact_inquiries WHERE id=$1 AND notification_status='pending' AND notification_pending_at=$2::timestamptz FOR UPDATE",[id,pending])).rows[0];if(!inquiry)throw Error('not_retryable');
 let result='failed';try{await sendContactMessage(c,mailer,inquiry);result='sent';}catch(error){if(error.message==='notification_uncertain')result='pending';}
 await c.query("UPDATE contact_inquiries SET notification_status=$2,notification_pending_at=CASE WHEN $2='pending' THEN notification_pending_at ELSE NULL END WHERE id=$1",[id,result]);await c.query('INSERT INTO inquiry_notification_attempts(inquiry_id,actor_user_id,result) VALUES($1,$2,$3)',[id,actor,result]);await c.query('COMMIT');return {id,notification:result};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
