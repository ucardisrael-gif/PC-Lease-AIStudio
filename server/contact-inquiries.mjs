import {requireTransactionPermission} from './transaction-permissions.mjs';
import {createHash} from 'node:crypto';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const statuses=['new','reviewed','closed'];
export async function saveContactInquiry(db,input,{existingOnly=false}={}){
 if(!input||!uuid(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>200||typeof input.email!=='string'||input.email.length>200||(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))||typeof input.phone!=='string'||input.phone.length>80||/[\u0000-\u001f\u007f]/.test(input.phone)||(!input.email.trim()&&!input.phone.trim())||typeof input.message!=='string'||!input.message.trim()||input.message.length>4000)throw Error('invalid_contact');
 if(/[\u0000-\u001f\u007f]/.test(input.name)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.message))throw Error('invalid_contact');
 const company=input.company??'',quantity=input.quantity??null;
 if(typeof company!=='string'||company.length>200||/[\u0000-\u001f\u007f]/.test(company)||(quantity!==null&&(!Number.isInteger(quantity)||quantity<1||quantity>100000)))throw Error('invalid_contact');
 const source=input.source??null,slug=input.productSlug??null;
 if((source!==null&&!['contact','product'].includes(source))||(source==='product'?(typeof slug!=='string'||slug.length>160||!/^[-a-z0-9]+$/.test(slug)):slug!==null))throw Error('invalid_contact');
 const data={name:input.name.trim(),email:input.email.trim(),phone:input.phone.trim(),message:input.message.trim()};
 if(company.trim())data.company=company.trim();if(quantity!==null)data.quantity=quantity;
 if(source!==null)data.source=source;if(slug!==null)data.productSlug=slug;
 const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 const existing=(await db.query('SELECT * FROM contact_inquiries WHERE id=$1',[input.id])).rows[0];if(existing){if(existing.payload_hash!==hash)throw Error('contact_conflict');return {inquiry:existing,created:false};}
 if(existingOnly)throw Error('contact_unavailable');
 let product=null;if(slug){product=(await db.query('SELECT name,details_json FROM products WHERE slug=$1 AND published=true',[slug])).rows[0];if(!product)throw Error('invalid_contact');}
 const row=await db.query('INSERT INTO contact_inquiries(id,payload_hash,name,email,phone,message,company,desired_quantity,source,product_slug,product_model,product_sku) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING RETURNING *',[input.id,hash,data.name,data.email,data.phone,data.message,data.company||'',data.quantity??null,source,slug,product?.name??null,product?.details_json?.sku||null]);
 if(row.rowCount)return {inquiry:row.rows[0],created:true};
 const concurrent=(await db.query('SELECT * FROM contact_inquiries WHERE id=$1',[input.id])).rows[0];if(!concurrent||concurrent.payload_hash!==hash)throw Error('contact_conflict');return {inquiry:concurrent,created:false};
}
export async function listContactInquiries(db,params){
 const status=params.get('status')||'all',notification=params.get('notification')||'all',search=(params.get('search')||'').trim(),offset=params.get('offset')||'0',before=params.get('before')||'';
 if(!['all',...statuses].includes(status)||!['all','pending','sent','failed'].includes(notification)||search.length>200||!/^\d{1,7}$/.test(offset)||(before&&(!uuid(before)||Number(offset)!==0)))throw Error('invalid_input');
 const where="($1='all' OR status=$1) AND strpos(lower(concat_ws(' ',id,name,email,phone,message,company,product_model,product_sku)),lower($2))>0 AND ($4='all' OR notification_status=$4)";
 const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 if(before&&!(await client.query('SELECT 1 FROM contact_inquiries WHERE id=$1',[before])).rowCount)throw Error('invalid_input');
 const rows=(await client.query(`SELECT id,name,email,phone,message,company,desired_quantity,source,product_slug,product_model,product_sku,status,COALESCE((SELECT max(h.id) FROM contact_inquiry_history h WHERE h.inquiry_id=contact_inquiries.id),0)::text AS status_revision,notification_status,created_at FROM contact_inquiries WHERE ${where} AND ($5::text='' OR (created_at,id)<(SELECT created_at,id FROM contact_inquiries WHERE id=$5)) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $3`,[status,search,Number(offset),notification,before])).rows;
 const inquiries=rows.slice(0,25);
 const ids=inquiries.map(x=>x.id);
 for(const [property,table,fields] of [['history','contact_inquiry_history','h.old_status,h.new_status'],['notification_attempts','inquiry_notification_attempts','h.result'],['notification_resolutions','inquiry_notification_resolutions','']]){
  const events=(await client.query(`SELECT x.inquiry_id,h.* FROM unnest($1::text[]) x(inquiry_id) CROSS JOIN LATERAL (SELECT h.id::text,${fields?fields+',':''}h.created_at,u.email AS actor_email FROM ${table} h JOIN users u ON u.id=h.actor_user_id WHERE h.inquiry_id=x.inquiry_id ORDER BY h.id DESC LIMIT 26) h`,[ids])).rows;
  for(const inquiry of inquiries){const selected=events.filter(event=>event.inquiry_id===inquiry.id);inquiry[property]=selected.slice(0,25);inquiry[property+'_has_more']=selected.length>25;}
 }
 await client.query('COMMIT');return {inquiries,hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function listInquiryHistory(db,params){
 const id=params.get('inquiryId')||'',before=params.get('before')||'',kind=params.get('kind')||'';
 const configs={status:['contact_inquiry_history','h.old_status,h.new_status'],attempt:['inquiry_notification_attempts','h.result'],resolution:['inquiry_notification_resolutions','']};
 if(!uuid(id)||!/^[1-9]\d{0,17}$/.test(before)||!Object.hasOwn(configs,kind))throw Error('invalid_input');
 const [table,fields]=configs[kind];if(!(await db.query(`SELECT 1 FROM ${table} WHERE inquiry_id=$1 AND id=$2::bigint`,[id,before])).rowCount)throw Error('not_found');
 const events=(await db.query(`SELECT h.id::text,${fields?fields+',':''}h.created_at,u.email AS actor_email FROM ${table} h JOIN users u ON u.id=h.actor_user_id WHERE h.inquiry_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26`,[id,before])).rows;
 return {history:events.slice(0,25),hasMore:events.length>25};
}
export async function changeContactStatus(db,actor,input){
 if(!input||!uuid(input.id)||!statuses.includes(input.expectedStatus)||!statuses.includes(input.status)||input.expectedStatus===input.status||typeof input.expectedRevision!=='string'||!/^(0|[1-9]\d{0,18})$/.test(input.expectedRevision))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionPermission(c,actor,'orders');const old=(await c.query('SELECT status FROM contact_inquiries WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!old)throw Error('not_found');const revision=(await c.query('SELECT COALESCE(max(id),0)::text AS revision FROM contact_inquiry_history WHERE inquiry_id=$1',[input.id])).rows[0].revision;if(old.status!==input.expectedStatus||revision!==input.expectedRevision)throw Error('status_conflict');await c.query('UPDATE contact_inquiries SET status=$2 WHERE id=$1',[input.id,input.status]);await c.query('INSERT INTO contact_inquiry_history(inquiry_id,actor_user_id,old_status,new_status) VALUES($1,$2,$3,$4)',[input.id,actor,old.status,input.status]);await c.query('COMMIT');return {id:input.id,status:input.status};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
