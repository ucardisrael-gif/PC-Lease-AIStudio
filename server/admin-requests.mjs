import {requireTransactionPermission} from './transaction-permissions.mjs';
export async function listRequests(db, params, {includeInventory=false}={}) {
  const search = (params.get('search') || '').trim();
  const status = params.get('status') || 'all';
  const rawOffset = params.get('offset') || '0';
  const before = params.get('before') || '';
  const notification = params.get('notification') || 'all';
  const organizationId = params.get('organizationId') || '';
  const equipment = params.get('equipment') || 'all';
  if(!['all','reserved','issued','replacements','any'].includes(equipment))throw new Error('invalid_input');
  if(equipment!=='all'&&!includeInventory)throw new Error('forbidden');
  if (search.length > 200 || !['all', 'new', 'reviewed', 'closed'].includes(status) || !['all', 'pending', 'sent', 'failed'].includes(notification) || !/^\d{1,7}$/.test(rawOffset) || (before&&(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before)||Number(rawOffset)!==0)) || (organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId))) throw new Error('invalid_input');
  const client=await db.connect();
  try { await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if(before&&!(await client.query('SELECT 1 FROM requests WHERE id=$1',[before])).rowCount)throw Error('invalid_input');
  const offset = Number(rawOffset), limit = 25;
  const assetMatch=status=>`EXISTS(SELECT 1 FROM asset_reservations ar JOIN inventory_assets ia ON ia.id=ar.asset_id WHERE ar.request_id=requests.id AND ar.released_at IS NULL AND ia.status='${status}')`;
  const replacementMatch=`EXISTS(SELECT 1 FROM service_replacements sr JOIN service_tickets st ON st.id=sr.ticket_id JOIN asset_reservations ar ON ar.id=st.reservation_id WHERE ar.request_id=requests.id AND sr.returned_at IS NULL)`;
  const equipmentWhere=equipment==='all'?'TRUE':equipment==='reserved'?assetMatch('reserved'):equipment==='issued'?assetMatch('issued'):equipment==='replacements'?replacementMatch:`(${assetMatch('reserved')} OR ${assetMatch('issued')} OR ${replacementMatch})`;
  const where = `(${equipmentWhere}) AND ($1::text = 'all' OR status = $1) AND ($2::text = '' OR strpos(lower(concat_ws(' ', id, order_number::text, contact_json->>'companyName', contact_json->>'contactName', contact_json->>'email', contact_json->>'phone', product_snapshot_json::text, (SELECT concat_ws(' ',u.email,u.first_name,u.last_name,u.company_name) FROM users u WHERE u.id=requests.customer_user_id), (SELECT concat_ws(' ',o.name,o.registration_number) FROM organizations o WHERE o.id=requests.organization_id))), lower($2)) > 0) AND ($5::text = '' OR organization_id=$5) AND ($6::text = 'all' OR notification_status=$6)`;
  const result = await client.query(`SELECT id, order_number, product_snapshot_json, tariff_snapshot_json, contact_json, quantity, status, COALESCE((SELECT max(h.id) FROM request_status_history h WHERE h.request_id=requests.id),0)::text AS status_revision, notification_status, created_at, organization_id, organization_link_version, customer_user_id,customer_link_version,(SELECT email FROM users WHERE users.id=requests.customer_user_id) AS customer_email, (SELECT name FROM organizations WHERE organizations.id=requests.organization_id) AS organization_name FROM requests WHERE ${where} AND ($7::text='' OR (created_at,id)<(SELECT created_at,id FROM requests WHERE id=$7)) ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`, [status, search, limit + 1, offset, organizationId, notification,before]);
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  const history = await client.query(`SELECT r.id AS request_id,h.* FROM unnest($1::text[]) r(id) CROSS JOIN LATERAL (SELECT h.id::text,h.previous_status,h.new_status,h.created_at,u.email AS actor_email FROM request_status_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=r.id ORDER BY h.id DESC LIMIT 26) h`, [rows.map(row => row.id)]);
  const links = await client.query(`SELECT r.id AS request_id,h.* FROM unnest($1::text[]) r(id) CROSS JOIN LATERAL (SELECT h.id::text,h.previous_organization_name,h.new_organization_name,h.created_at,u.email AS actor_email FROM request_organization_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=r.id ORDER BY h.id DESC LIMIT 26) h`,[rows.map(row=>row.id)]);
  for (const row of rows) { const events=history.rows.filter(event => event.request_id === row.id); row.status_history=events.slice(0,25); row.status_history_has_more=events.length>25; }
  for (const row of rows) {const events=links.rows.filter(event=>event.request_id===row.id);row.organization_history=events.slice(0,25);row.organization_history_has_more=events.length>25;}
  const customerLinks=await client.query(`SELECT r.id AS request_id,h.* FROM unnest($1::text[]) r(id) CROSS JOIN LATERAL (SELECT h.id::text,h.old_email,h.new_email,h.created_at,u.email AS actor_email FROM request_customer_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=r.id ORDER BY h.id DESC LIMIT 26) h`,[rows.map(row=>row.id)]);
  for(const row of rows){const events=customerLinks.rows.filter(event=>event.request_id===row.id);row.customer_history=events.slice(0,25);row.customer_history_has_more=events.length>25;}
  const attempts=await client.query(`SELECT r.id AS request_id,a.* FROM unnest($1::text[]) r(id) CROSS JOIN LATERAL (SELECT a.id::text,a.result,a.created_at,u.email AS actor_email FROM request_notification_attempts a JOIN users u ON u.id=a.actor_user_id WHERE a.request_id=r.id ORDER BY a.id DESC LIMIT 26) a`,[rows.map(row=>row.id)]);
  for(const row of rows){const events=attempts.rows.filter(event=>event.request_id===row.id);row.notification_attempts=events.slice(0,25);row.notification_attempts_has_more=events.length>25;}
  const resolutions=await client.query(`SELECT r.id AS request_id,a.* FROM unnest($1::text[]) r(id) CROSS JOIN LATERAL (SELECT a.id::text,a.created_at,u.email AS actor_email FROM request_notification_resolutions a JOIN users u ON u.id=a.actor_user_id WHERE a.request_id=r.id ORDER BY a.id DESC LIMIT 26) a`,[rows.map(row=>row.id)]);
  for(const row of rows){const events=resolutions.rows.filter(event=>event.request_id===row.id);row.notification_resolutions=events.slice(0,25);row.notification_resolutions_has_more=events.length>25;}
  if(includeInventory){
    const ids=rows.map(row=>row.id);
    const assets=(await client.query(`SELECT r.request_id,count(*) FILTER(WHERE a.status='reserved')::integer AS reserved,count(*) FILTER(WHERE a.status='issued')::integer AS issued FROM asset_reservations r JOIN inventory_assets a ON a.id=r.asset_id WHERE r.request_id=ANY($1::text[]) AND r.released_at IS NULL GROUP BY r.request_id`,[ids])).rows;
    const replacements=(await client.query(`SELECT r.request_id,count(*)::integer AS outstanding FROM service_replacements sr JOIN service_tickets t ON t.id=sr.ticket_id JOIN asset_reservations r ON r.id=t.reservation_id WHERE r.request_id=ANY($1::text[]) AND sr.returned_at IS NULL GROUP BY r.request_id`,[ids])).rows;
    const byOrder=new Map(assets.map(a=>[a.request_id,a])),byReplacement=new Map(replacements.map(r=>[r.request_id,r.outstanding]));
    for(const row of rows){const item=byOrder.get(row.id);row.inventory_summary={reserved:item?.reserved||0,issued:item?.issued||0,replacements:byReplacement.get(row.id)||0};}
  }
  const count = await client.query(`SELECT count(*)::integer AS total FROM requests WHERE ${where.replaceAll('$5','$3').replaceAll('$6','$4')}`, [status, search, organizationId, notification]);
  await client.query('COMMIT'); return { requests: rows, total: count.rows[0].total, offset, hasMore };
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function listRequestStatusHistory(db,params){
  const id=params.get('requestId')||'',before=params.get('before')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[1-9]\d{0,17}$/.test(before))throw Error('invalid_input');
  if(!(await db.query('SELECT 1 FROM request_status_history WHERE request_id=$1 AND id=$2::bigint',[id,before])).rowCount)throw Error('not_found');
  const events=(await db.query('SELECT h.id::text,h.previous_status,h.new_status,h.created_at,u.email AS actor_email FROM request_status_history h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26',[id,before])).rows;
  return {history:events.slice(0,25),hasMore:events.length>25};
}

export async function listRequestLinkHistory(db,params){
  const id=params.get('requestId')||'',before=params.get('before')||'',kind=params.get('kind')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[1-9]\d{0,17}$/.test(before)||!['customer','organization'].includes(kind))throw Error('invalid_input');
  const table=kind==='customer'?'request_customer_history':'request_organization_history';
  if(!(await db.query(`SELECT 1 FROM ${table} WHERE request_id=$1 AND id=$2::bigint`,[id,before])).rowCount)throw Error('not_found');
  const fields=kind==='customer'?'h.old_email,h.new_email':'h.previous_organization_name,h.new_organization_name';
  const history=(await db.query(`SELECT h.id::text,${fields},h.created_at,u.email AS actor_email FROM ${table} h JOIN users u ON u.id=h.actor_user_id WHERE h.request_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26`,[id,before])).rows;
  return {history:history.slice(0,25),hasMore:history.length>25};
}

export async function listRequestNotificationHistory(db,params){
  const id=params.get('requestId')||'',before=params.get('before')||'',kind=params.get('kind')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[1-9]\d{0,17}$/.test(before)||!['attempt','resolution'].includes(kind))throw Error('invalid_input');
  const table=kind==='attempt'?'request_notification_attempts':'request_notification_resolutions',result=kind==='attempt'?',a.result':'';
  if(!(await db.query(`SELECT 1 FROM ${table} WHERE request_id=$1 AND id=$2::bigint`,[id,before])).rowCount)throw Error('not_found');
  const history=(await db.query(`SELECT a.id::text${result},a.created_at,u.email AS actor_email FROM ${table} a JOIN users u ON u.id=a.actor_user_id WHERE a.request_id=$1 AND a.id<$2::bigint ORDER BY a.id DESC LIMIT 26`,[id,before])).rows;
  return {history:history.slice(0,25),hasMore:history.length>25};
}

export async function searchRequestCustomers(db,params){
 const search=(params.get('search')||'').trim(),offset=params.get('offset')||'0',before=params.get('before')||'';if(search.length<2||search.length>200||!/^\d{1,7}$/.test(offset)||(before&&(Number(offset)!==0||before.length>2048||!/^[A-Za-z0-9_-]+$/.test(before))))throw Error('invalid_input');
 let anchor=null;if(before){try{anchor=JSON.parse(Buffer.from(before,'base64url').toString('utf8'));}catch{throw Error('invalid_input');}if(!Array.isArray(anchor)||anchor.length!==2||typeof anchor[0]!=='string'||anchor[0].length>320||/[\u0000-\u001f\u007f]/.test(anchor[0])||typeof anchor[1]!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(anchor[1]))throw Error('invalid_input');}
 const rows=(await db.query("SELECT id,email,first_name,last_name,company_name,active,(email_verified_at IS NOT NULL) AS email_verified FROM users WHERE strpos(lower(concat_ws(' ',email,first_name,last_name,company_name)),lower($1))>0 AND ($3::text IS NULL OR (email,id)>($3::text,$4::text)) ORDER BY email,id LIMIT 11 OFFSET $2",[search,Number(offset),anchor?.[0]??null,anchor?.[1]??null])).rows;const users=rows.slice(0,10),last=users.at(-1);return {users,hasMore:rows.length>10,offset:Number(offset),cursorSupported:true,nextCursor:last?Buffer.from(JSON.stringify([last.email,last.id]),'utf8').toString('base64url'):null};
}
export async function linkRequestCustomer(db,actorId,input){
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 if(!input||!uuid(input.id)||(input.userId!==null&&!uuid(input.userId))||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw Error('invalid_input');
 const c=await db.connect();try{await c.query('BEGIN');await requireTransactionPermission(c,actorId,'orders');const request=(await c.query('SELECT customer_user_id,customer_link_version FROM requests WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!request)throw Error('not_found');if(request.customer_link_version!==input.expectedVersion)throw Error('version_conflict');if(request.customer_user_id===input.userId)throw Error('invalid_input');
 const users=(await c.query('SELECT id,email FROM users WHERE id=ANY($1::text[]) FOR SHARE',[[request.customer_user_id,input.userId].filter(Boolean)])).rows;const names=new Map(users.map(u=>[u.id,u.email]));if(input.userId&&!names.has(input.userId))throw Error('user_not_found');
 await c.query('UPDATE requests SET customer_user_id=$1,customer_link_version=customer_link_version+1 WHERE id=$2',[input.userId,input.id]);await c.query('INSERT INTO request_customer_history(request_id,old_user_id,old_email,new_user_id,new_email,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)',[input.id,request.customer_user_id,names.get(request.customer_user_id)||null,input.userId,names.get(input.userId)||null,actorId]);await c.query('COMMIT');return {id:input.id,userId:input.userId};
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}

export async function linkRequestOrganization(db, actorId, input) {
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  if (!input || !uuid(input.id) || (input.organizationId !== null && !uuid(input.organizationId)) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new Error('invalid_input');
  const client = await db.connect();
  try {
    await client.query('BEGIN');await requireTransactionPermission(client,actorId,'orders');
    const found = await client.query('SELECT organization_id,organization_link_version FROM requests WHERE id=$1 FOR UPDATE',[input.id]);
    if (!found.rowCount) throw new Error('not_found');
    const old=found.rows[0];
    if (old.organization_link_version !== input.expectedVersion) throw new Error('version_conflict');
    if (old.organization_id === input.organizationId) throw new Error('invalid_input');
    const ids=[old.organization_id,input.organizationId].filter(Boolean);
    const organizations=await client.query('SELECT id,name FROM organizations WHERE id=ANY($1::text[]) FOR SHARE',[ids]);
    const names=new Map(organizations.rows.map(row=>[row.id,row.name]));
    if(input.organizationId&&!names.has(input.organizationId))throw new Error('organization_not_found');
    await client.query('UPDATE requests SET organization_id=$1,organization_link_version=organization_link_version+1 WHERE id=$2',[input.organizationId,input.id]);
    await client.query('INSERT INTO request_organization_history(request_id,previous_organization_id,previous_organization_name,new_organization_id,new_organization_name,actor_user_id) VALUES ($1,$2,$3,$4,$5,$6)',[input.id,old.organization_id,names.get(old.organization_id)||null,input.organizationId,names.get(input.organizationId)||null,actorId]);
    await client.query('COMMIT');
    return {id:input.id,organizationId:input.organizationId};
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function changeRequestStatus(db, actorId, input) {
  const statuses = ['new', 'reviewed', 'closed'];
  if (!input || typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id) ||
      !statuses.includes(input.expectedStatus) || !statuses.includes(input.status) || input.status === input.expectedStatus || typeof input.expectedRevision !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(input.expectedRevision)) throw new Error('invalid_input');
  const client = await db.connect();
  try {
    await client.query('BEGIN');await requireTransactionPermission(client,actorId,'orders');
    const found = await client.query('SELECT status FROM requests WHERE id=$1 FOR UPDATE', [input.id]);
    if (!found.rowCount) throw new Error('not_found');
    const revision = (await client.query('SELECT COALESCE(max(id),0)::text AS revision FROM request_status_history WHERE request_id=$1',[input.id])).rows[0].revision;
    if (found.rows[0].status !== input.expectedStatus || revision !== input.expectedRevision) throw new Error('status_conflict');
    await client.query('UPDATE requests SET status=$2 WHERE id=$1', [input.id, input.status]);
    await client.query('INSERT INTO request_status_history (request_id, previous_status, new_status, actor_user_id) VALUES ($1,$2,$3,$4)', [input.id, input.expectedStatus, input.status, actorId]);
    await client.query('COMMIT');
    return { id: input.id, status: input.status };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
