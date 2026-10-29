import {requireTransactionAdmin} from './transaction-permissions.mjs';
export async function getOrderNotificationSettings(db){
 const result=await db.query('SELECT recipient_email,version FROM order_notification_settings WHERE id=true');
 if(!result.rowCount)throw Error('unavailable');return result.rows[0];
}
export async function listOrderNotificationSettingsHistory(db,params){
 const raw=params.get('offset')||'0',before=params.get('before')||'';if(!/^\d{1,7}$/.test(raw)||(before&&(!/^[1-9]\d{0,17}$/.test(before)||Number(raw)!==0)))throw Error('invalid_input');
 if(before&&!(await db.query('SELECT 1 FROM order_notification_settings_history WHERE id=$1::bigint',[before])).rowCount)throw Error('invalid_input');
 const rows=(await db.query("SELECT h.id::text,h.previous_email,h.new_email,h.created_at,u.email AS actor_email FROM order_notification_settings_history h JOIN users u ON u.id=h.actor_user_id WHERE ($2::text='' OR h.id<NULLIF($2,'')::bigint) ORDER BY h.id DESC LIMIT 26 OFFSET $1",[Number(raw),before])).rows;
 return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(raw),cursorSupported:true};
}
export async function saveOrderNotificationSettings(db,actor,input){
 if(!input||typeof input.email!=='string'||input.email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||!Number.isSafeInteger(input.version)||input.version<1)throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);const old=(await c.query('SELECT * FROM order_notification_settings WHERE id=true FOR UPDATE')).rows[0];if(!old)throw Error('unavailable');if(old.version!==input.version)throw Error('version_conflict');
 const result=(await c.query('UPDATE order_notification_settings SET recipient_email=$1,version=version+1,updated_at=now() WHERE id=true RETURNING recipient_email,version',[input.email.trim()])).rows[0];await c.query('INSERT INTO order_notification_settings_history(actor_user_id,previous_email,new_email) VALUES($1,$2,$3)',[actor,old.recipient_email,result.recipient_email]);await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
