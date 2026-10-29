import {requireTransactionAdmin} from './transaction-permissions.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fields=['name','contactName','email','phone','notes'];
export async function listDealerOrders(db,params){
 const id=params.get('id')||'',offset=params.get('offset')||'0',before=params.get('before')||'';
 if(!uuid(id)||!/^\d{1,7}$/.test(offset)||(before&&(!uuid(before)||Number(offset)!==0)))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM dealers WHERE id=$1',[id])).rowCount)throw Error('not_found');
 if(before&&!(await db.query('SELECT 1 FROM requests WHERE id=$1',[before])).rowCount)throw Error('invalid_input');
 const rows=(await db.query("SELECT id,order_number,status,created_at,contact_json->>'companyName' AS company,contact_json->>'contactName' AS contact FROM requests WHERE dealer_id=$1 AND ($3::text='' OR (created_at,id)<(SELECT created_at,id FROM requests WHERE id=$3)) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $2",[id,Number(offset),before])).rows;
 return {orders:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
}
export async function listDealerHistory(db,params){
 const id=params.get('id')||'',offset=params.get('offset')||'0',before=params.get('before')||'';
 if(!uuid(id)||!/^\d{1,7}$/.test(offset)||(before&&(!/^[1-9]\d{0,17}$/.test(before)||Number(offset)!==0)))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM dealers WHERE id=$1',[id])).rowCount)throw Error('not_found');
 if(before&&!(await db.query('SELECT 1 FROM dealer_history WHERE dealer_id=$1 AND id=$2::bigint',[id,before])).rowCount)throw Error('invalid_input');
 const rows=(await db.query("SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM dealer_history h JOIN users u ON u.id=h.actor_user_id WHERE h.dealer_id=$1 AND ($3::text='' OR h.id<NULLIF($3,'')::bigint) ORDER BY h.id DESC LIMIT 26 OFFSET $2",[id,Number(offset),before])).rows;
 return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
}
export async function listDealers(db,params){
 const search=(params.get('search')||'').trim(),offset=params.get('offset')||'0',before=params.get('before')||'';
 if(search.length>200||!/^\d{1,7}$/.test(offset)||(before&&(!uuid(before)||Number(offset)!==0)))throw Error('invalid_input');
 if(before&&!(await db.query('SELECT 1 FROM dealers WHERE id=$1',[before])).rowCount)throw Error('invalid_input');
 const where="strpos(lower(concat_ws(' ',name,contact_name,email,phone)),lower($1))>0";
 const rows=(await db.query(`SELECT * FROM dealers WHERE ${where} AND ($3::text='' OR (created_at,id)<(SELECT created_at,id FROM dealers WHERE id=$3)) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $2`,[search,Number(offset),before])).rows;
 return {dealers:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
}
export async function saveDealer(db,actor,input){
 if(!input||!uuid(input.id)||!Number.isInteger(input.version)||input.version<0||typeof input.active!=='boolean'||fields.some(f=>typeof input[f]!=='string'||input[f].length>(f==='notes'?2000:200)||/[\u0000-\u001f\u007f]/.test(input[f]))||!input.name.trim()||(input.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())))throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionAdmin(c,actor);await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.id]);
  const old=(await c.query('SELECT * FROM dealers WHERE id=$1 FOR UPDATE',[input.id])).rows[0];
  const vals=[input.name.trim(),input.contactName.trim(),input.email.trim(),input.phone.trim(),input.notes.trim(),input.active];
  if(input.version===0&&old){const first=(await c.query('SELECT actor_user_id,new_data FROM dealer_history WHERE dealer_id=$1 ORDER BY id LIMIT 1',[input.id])).rows[0];const d=first?.new_data;if(first?.actor_user_id!==actor||!d||JSON.stringify([d.name,d.contact_name,d.email,d.phone,d.notes,d.active])!==JSON.stringify(vals))throw Error('create_conflict');await c.query('COMMIT');return old;}
  if(input.version!==0&&(!old||old.version!==input.version))throw Error(old?'version_conflict':'not_found');
  const row=input.version===0?(await c.query('INSERT INTO dealers(id,name,contact_name,email,phone,notes,active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[input.id,...vals])).rows[0]:(await c.query('UPDATE dealers SET name=$1,contact_name=$2,email=$3,phone=$4,notes=$5,active=$6,version=version+1,updated_at=now() WHERE id=$7 RETURNING *',[...vals,input.id])).rows[0];
  await c.query('INSERT INTO dealer_history(dealer_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[row.id,actor,old?JSON.stringify(old):null,JSON.stringify(row)]);await c.query('COMMIT');return row;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
