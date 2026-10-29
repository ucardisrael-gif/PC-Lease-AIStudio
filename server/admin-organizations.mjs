import {requireTransactionAdmin} from './transaction-permissions.mjs';
import { randomUUID } from 'node:crypto';
function pagination(params){const raw=params.get('offset')||'0',before=params.get('before')||'';if(!/^\d{1,7}$/.test(raw)||(before&&(Number(raw)!==0||before.length>2048||!/^[A-Za-z0-9_-]+$/.test(before))))throw Error('invalid_input');let anchor=null;if(before){try{anchor=JSON.parse(Buffer.from(before,'base64url').toString('utf8'));}catch{throw Error('invalid_input');}if(!Array.isArray(anchor)||anchor.length!==2||typeof anchor[0]!=='string'||anchor[0].length>200||typeof anchor[1]!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(anchor[1]))throw Error('invalid_input');}return {offset:Number(raw),anchor};}
function pageResult(rows){const page=rows.slice(0,25),last=page.at(-1);return {organizations:page.map(({_sort_name,...row})=>row),hasMore:rows.length>25,cursorSupported:true,nextCursor:last?Buffer.from(JSON.stringify([last._sort_name,last.id]),'utf8').toString('base64url'):null};}
export async function listOrganizations(db, params) {
  const search=(params.get('search')||'').trim(),{offset,anchor}=pagination(params);if(search.length>200)throw Error('invalid_input');
  const where="strpos(lower(concat_ws(' ',name,registration_number,contact_name,email,phone)),lower($1))>0";
  const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows=(await client.query(`SELECT *,lower(name) AS _sort_name FROM organizations WHERE ${where} AND ($3::text IS NULL OR (lower(name),id)>($3::text,$4::text)) ORDER BY lower(name),id LIMIT 26 OFFSET $2`,[search,offset,anchor?.[0]??null,anchor?.[1]??null])).rows;
    const total=(await client.query(`SELECT count(*)::integer AS total FROM organizations WHERE ${where}`,[search])).rows[0].total;
    await client.query('COMMIT');return {...pageResult(rows),total,offset};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function searchOrderCompanies(db,params){
  const search=(params.get('search')||'').trim(),{offset,anchor}=pagination(params);if(search.length>200)throw Error('invalid_input');
  const rows=(await db.query("SELECT id,name,registration_number,lower(name) AS _sort_name FROM organizations WHERE strpos(lower(concat_ws(' ',name,registration_number)),lower($1))>0 AND ($3::text IS NULL OR (lower(name),id)>($3::text,$4::text)) ORDER BY lower(name),id LIMIT 26 OFFSET $2",[search,offset,anchor?.[0]??null,anchor?.[1]??null])).rows;
  return {...pageResult(rows),offset};
}
export async function saveOrganization(db,input,actorId) {
  const fields=['name','registrationNumber','contactName','email','phone','address'];
  if(!input||fields.some(f=>typeof input[f]!=='string'||input[f].length>200||/[\u0000-\u001f\u007f]/.test(input[f]))||!input.name.trim()||input.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new Error('invalid_input');
  const values=fields.map(f=>input[f].trim());
  if(input.id&&(typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||!Number.isInteger(input.version)||input.version<1)) throw new Error('invalid_input');
  if(input.createId!==undefined&&(input.id||typeof input.createId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.createId)))throw Error('invalid_input');
  const client=await db.connect();try{await client.query('BEGIN');await requireTransactionAdmin(client,actorId);
    if(input.createId){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.createId]);const old=(await client.query('SELECT o.*,h.actor_user_id,h.new_data AS original FROM organizations o LEFT JOIN LATERAL (SELECT actor_user_id,new_data FROM organization_history WHERE organization_id=o.id ORDER BY id LIMIT 1) h ON true WHERE o.id=$1',[input.createId])).rows[0];if(old){const keys=['name','registration_number','contact_name','email','phone','address'];if(old.actor_user_id!==actorId||!old.original||keys.some((key,i)=>old.original[key]!==values[i]))throw Error('create_conflict');delete old.actor_user_id;delete old.original;await client.query('COMMIT');return old;}}
    let previous=null;
    if(input.id){previous=(await client.query('SELECT * FROM organizations WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!previous)throw Error('not_found');if(previous.version!==input.version)throw Error('version_conflict');}
    const row=(input.id?await client.query('UPDATE organizations SET name=$1,registration_number=$2,contact_name=$3,email=$4,phone=$5,address=$6,version=version+1,updated_at=now() WHERE id=$7 RETURNING *',[...values,input.id]):await client.query('INSERT INTO organizations (id,name,registration_number,contact_name,email,phone,address) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[input.createId||randomUUID(),...values])).rows[0];
    await client.query('INSERT INTO organization_history(organization_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[row.id,actorId,previous?JSON.stringify(previous):null,JSON.stringify(row)]);await client.query('COMMIT');return row;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function listOrganizationHistory(db,params){
 const id=params.get('id')||'',raw=params.get('offset')||'0',before=params.get('before')||'';if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^\d{1,7}$/.test(raw)||(before&&(!/^[1-9]\d{0,17}$/.test(before)||Number(raw)!==0)))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM organizations WHERE id=$1',[id])).rowCount)throw Error('not_found');
 if(before&&!(await db.query('SELECT 1 FROM organization_history WHERE organization_id=$1 AND id=$2::bigint',[id,before])).rowCount)throw Error('not_found');
 const rows=(await db.query("SELECT h.id::text,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM organization_history h JOIN users u ON u.id=h.actor_user_id WHERE h.organization_id=$1 AND ($3::text='' OR h.id<NULLIF($3::text,'')::bigint) ORDER BY h.id DESC LIMIT 26 OFFSET $2",[id,Number(raw),before])).rows;
 return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(raw),cursorSupported:true};
}
