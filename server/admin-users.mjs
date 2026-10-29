import {requireTransactionAdmin as requireActiveAdmin} from './transaction-permissions.mjs';
import {requireTransactionUser} from './transaction-permissions.mjs';

export async function listUsers(db, params = new URLSearchParams()) {
  const search = (params.get('search') || '').trim(), offsetText = params.get('offset') || '0', organizationId=params.get('organizationId')||'', role=params.get('role')||'all', active=params.get('active')||'all', permission=params.get('permission')||'all', after=params.get('after')||'';
  if (search.length > 200 || !/^\d{1,7}$/.test(offsetText) || !['all','admin','customer'].includes(role) || !['all','active','inactive'].includes(active) || !['all','any','orders','catalog','content','inventory','inventory_cost','service','contracts','finance'].includes(permission) || (organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId))) throw new Error('invalid_input');
  if(after&&(Number(offsetText)!==0||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after)))throw new Error('invalid_input');
  const offset = Number(offsetText), limit = 25;
  const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if(after&&!(await client.query("SELECT 1 FROM users WHERE id=$1 AND ($2::text='' OR organization_id=$2)",[after,organizationId])).rowCount)throw new Error('invalid_input');
  const where = "strpos(lower(concat_ws(' ',id,email,first_name,last_name,phone,company_name)),lower($1)) > 0 AND ($4::text='' OR organization_id=$4) AND ($5::text='all' OR role=$5) AND ($6::text='all' OR active=($6='active')) AND ($7::text='all' OR (role='customer' AND EXISTS(SELECT 1 FROM staff_permissions sp WHERE sp.user_id=users.id AND ($7='any' OR sp.permission=$7))))";
  const result = await client.query(`SELECT id,email,role,active,COALESCE((SELECT max(h.id) FROM user_role_history h WHERE h.user_id=users.id),0)::text AS role_revision,COALESCE((SELECT max(h.id) FROM user_activation_history h WHERE h.user_id=users.id),0)::text AS activation_revision,COALESCE((SELECT max(h.id) FROM user_role_history h WHERE h.user_id=users.id),0)::text||':'||COALESCE((SELECT max(h.id) FROM staff_permission_history h WHERE h.user_id=users.id),0)::text||':'||COALESCE((SELECT max(h.id) FROM user_activation_history h WHERE h.user_id=users.id),0)::text AS permission_revision,(email_verified_at IS NOT NULL) AS email_verified,created_at,first_name,last_name,phone,company_name,profile_version,organization_id,organization_link_version,(SELECT name FROM organizations WHERE organizations.id=users.organization_id) AS organization_name,COALESCE((SELECT array_agg(p.permission ORDER BY p.permission) FROM staff_permissions p WHERE p.user_id=users.id),ARRAY[]::text[]) AS permissions FROM users WHERE ${where} AND ($8::text='' OR (created_at,id)>(SELECT created_at,id FROM users WHERE id=$8)) ORDER BY created_at,id LIMIT $2 OFFSET $3`, [search,limit+1,offset,organizationId,role,active,permission,after]);
  const count = await client.query(`SELECT count(*)::integer AS total FROM users WHERE ${where.replaceAll('$4','$2').replaceAll('$5','$3').replaceAll('$6','$4').replaceAll('$7','$5')}`, [search,organizationId,role,active,permission]);
  const users=result.rows.slice(0,limit);
  const history=await client.query(`SELECT target.id AS user_id,h.* FROM unnest($1::text[]) target(id) CROSS JOIN LATERAL (SELECT h.id::text,h.previous_organization_name,h.new_organization_name,h.created_at,u.email AS actor_email FROM user_organization_history h JOIN users u ON u.id=h.actor_user_id WHERE h.user_id=target.id ORDER BY h.id DESC LIMIT 26) h`,[users.map(user=>user.id)]);
  for(const user of users){const events=history.rows.filter(row=>row.user_id===user.id);user.organization_history=events.slice(0,25);user.organization_history_has_more=events.length>25;}
  await client.query('COMMIT');return { users, total: count.rows[0].total, hasMore: result.rows.length>limit, offset, cursorSupported:true };
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function listUserOrganizationHistory(db,params){
 const id=params.get('userId')||'',before=params.get('before')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^[1-9]\d{0,17}$/.test(before))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM users WHERE id=$1',[id])).rowCount)throw Error('user_not_found');
 const history=(await db.query('SELECT h.id::text,h.previous_organization_name,h.new_organization_name,h.created_at,u.email AS actor_email FROM user_organization_history h JOIN users u ON u.id=h.actor_user_id WHERE h.user_id=$1 AND h.id<$2::bigint ORDER BY h.id DESC LIMIT 26',[id,before])).rows;
 return {history:history.slice(0,25),hasMore:history.length>25};
}

export async function listAccessHistory(db,params){
 const id=params.get('userId')||'',offset=params.get('offset')||'0',beforeKind=params.get('beforeKind')||'',beforeId=params.get('beforeId')||'';
 const tables={role:'user_role_history',permissions:'staff_permission_history',activation:'user_activation_history'};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!/^\d{1,7}$/.test(offset)||(!!beforeKind!==!!beforeId)||(beforeKind&&(!Object.hasOwn(tables,beforeKind)||!/^[1-9]\d{0,17}$/.test(beforeId)||Number(offset)!==0)))throw Error('invalid_input');
 const client=await db.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 if(!(await client.query('SELECT 1 FROM users WHERE id=$1',[id])).rowCount)throw Error('user_not_found');
 if(beforeKind&&!(await client.query(`SELECT 1 FROM ${tables[beforeKind]} WHERE user_id=$1 AND id=$2::bigint`,[id,beforeId])).rowCount)throw Error('invalid_input');
 const anchor=beforeKind?`(SELECT created_at FROM ${tables[beforeKind]} WHERE user_id=$1 AND id=$3::bigint)`:'NULL::timestamptz';
 const result=await client.query(`SELECT * FROM (SELECT h.id,'role' AS kind,h.old_role AS old_role,h.new_role AS new_role,NULL::jsonb AS old_permissions,NULL::jsonb AS new_permissions,h.created_at,u.email AS actor_email FROM user_role_history h JOIN users u ON u.id=h.actor_user_id WHERE h.user_id=$1 UNION ALL SELECT h.id,'permissions' AS kind,NULL::text,NULL::text,h.old_permissions,h.new_permissions,h.created_at,u.email FROM staff_permission_history h JOIN users u ON u.id=h.actor_user_id WHERE h.user_id=$1 UNION ALL SELECT h.id,'activation',CASE WHEN h.old_active THEN 'active' ELSE 'inactive' END,CASE WHEN h.new_active THEN 'active' ELSE 'inactive' END,NULL::jsonb,NULL::jsonb,h.created_at,u.email FROM user_activation_history h JOIN users u ON u.id=h.actor_user_id WHERE h.user_id=$1) events WHERE ($3::text='' OR created_at<${anchor} OR (created_at=${anchor} AND (kind>$4 OR (kind=$4 AND id<NULLIF($3,'')::bigint)))) ORDER BY created_at DESC,kind,id DESC LIMIT 26 OFFSET $2`,[id,Number(offset),beforeId,beforeKind]);
 await client.query('COMMIT');return {events:result.rows.slice(0,25),hasMore:result.rows.length>25,offset:Number(offset),cursorSupported:true};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function setUserActive(db,actorId,input){
 if(!input||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||typeof input.active!=='boolean'||typeof input.expectedActive!=='boolean'||input.active===input.expectedActive||typeof input.expectedRevision!=='string'||!/^(0|[1-9]\d{0,18})$/.test(input.expectedRevision)||typeof input.expectedRoleRevision!=='string'||!/^(0|[1-9]\d{0,18})$/.test(input.expectedRoleRevision))throw Error('invalid_input');
 if(input.id===actorId&&!input.active)throw Error('cannot_disable_self');
 const c=await db.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[68499002]);await requireActiveAdmin(c,actorId);const target=(await c.query('SELECT id,role,active FROM users WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!target)throw Error('user_not_found');const versions=(await c.query('SELECT COALESCE((SELECT max(id) FROM user_activation_history WHERE user_id=$1),0)::text AS revision,COALESCE((SELECT max(id) FROM user_role_history WHERE user_id=$1),0)::text AS role_revision',[input.id])).rows[0];if(target.active!==input.expectedActive||versions.revision!==input.expectedRevision||versions.role_revision!==input.expectedRoleRevision)throw Error('version_conflict');
 if(target.role==='admin'&&target.active&&!input.active){const count=(await c.query("SELECT count(*)::integer AS n FROM users WHERE role='admin' AND active=true")).rows[0].n;if(count<=1)throw Error('last_admin');}
 await c.query('UPDATE users SET active=$1 WHERE id=$2',[input.active,input.id]);if(!input.active){await c.query('DELETE FROM auth_sessions WHERE user_id=$1',[input.id]);await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[input.id]);await c.query('UPDATE email_verifications SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[input.id]);}
 await c.query('INSERT INTO user_activation_history(user_id,actor_user_id,old_active,new_active) VALUES($1,$2,$3,$4)',[input.id,actorId,target.active,input.active]);await c.query('COMMIT');return {id:input.id,active:input.active};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

export async function saveStaffPermissions(db,actorId,input){
  const valid=['orders','catalog','content','inventory','inventory_cost','service','contracts','finance'];
  if(!input||typeof input.id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.id)||!Array.isArray(input.permissions)||!Array.isArray(input.expectedPermissions)||[...input.permissions,...input.expectedPermissions].some(p=>!valid.includes(p))||new Set(input.permissions).size!==input.permissions.length||new Set(input.expectedPermissions).size!==input.expectedPermissions.length||typeof input.expectedRevision!=='string'||!/^(0|[1-9]\d{0,18}):(0|[1-9]\d{0,18}):(0|[1-9]\d{0,18})$/.test(input.expectedRevision))throw new Error('invalid_input');
  const client=await db.connect();
  try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock($1)',[68499002]);await requireActiveAdmin(client,actorId);const target=await client.query('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[input.id]);if(!target.rowCount)throw new Error('user_not_found');if(target.rows[0].role==='admin')throw new Error('admin_has_full_access');
    const old=(await client.query('SELECT permission FROM staff_permissions WHERE user_id=$1 ORDER BY permission',[input.id])).rows.map(r=>r.permission);
    const revision=(await client.query("SELECT COALESCE((SELECT max(id) FROM user_role_history WHERE user_id=$1),0)::text||':'||COALESCE((SELECT max(id) FROM staff_permission_history WHERE user_id=$1),0)::text||':'||COALESCE((SELECT max(id) FROM user_activation_history WHERE user_id=$1),0)::text AS revision",[input.id])).rows[0].revision;
    const expected=[...input.expectedPermissions].sort(),next=[...input.permissions].sort();if(revision!==input.expectedRevision||JSON.stringify(old)!==JSON.stringify(expected))throw new Error('version_conflict');
    if(JSON.stringify(old)!==JSON.stringify(next)){await client.query('DELETE FROM staff_permissions WHERE user_id=$1',[input.id]);for(const permission of next)await client.query('INSERT INTO staff_permissions(user_id,permission) VALUES ($1,$2)',[input.id,permission]);await client.query('INSERT INTO staff_permission_history(user_id,actor_user_id,old_permissions,new_permissions) VALUES($1,$2,$3,$4)',[input.id,actorId,JSON.stringify(old),JSON.stringify(next)]);}
    await client.query('COMMIT');return{id:input.id,permissions:next};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function linkUserOrganization(db, actorId, input) {
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  if(!input||!uuid(input.id)||(input.organizationId!==null&&!uuid(input.organizationId))||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw new Error('invalid_input');
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)',[68499002]);
    await requireActiveAdmin(client,actorId);
    const found=await client.query('SELECT organization_id,organization_link_version FROM users WHERE id=$1 FOR UPDATE',[input.id]);
    if(!found.rowCount)throw new Error('user_not_found');
    const old=found.rows[0];if(old.organization_link_version!==input.expectedVersion)throw new Error('version_conflict');
    if(old.organization_id===input.organizationId)throw new Error('invalid_input');
    const ids=[old.organization_id,input.organizationId].filter(Boolean);
    const orgs=await client.query('SELECT id,name FROM organizations WHERE id=ANY($1::text[]) FOR SHARE',[ids]);
    const names=new Map(orgs.rows.map(row=>[row.id,row.name]));
    if(input.organizationId&&!names.has(input.organizationId))throw new Error('organization_not_found');
    await client.query('UPDATE users SET organization_id=$1,organization_link_version=organization_link_version+1 WHERE id=$2',[input.organizationId,input.id]);
    await client.query('INSERT INTO user_organization_history(user_id,previous_organization_id,previous_organization_name,new_organization_id,new_organization_name,actor_user_id) VALUES ($1,$2,$3,$4,$5,$6)',[input.id,old.organization_id,names.get(old.organization_id)||null,input.organizationId,names.get(input.organizationId)||null,actorId]);
    await client.query('COMMIT');return {id:input.id,organizationId:input.organizationId};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function saveUserProfile(db, input) {
  if (!input || typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id) || !Number.isInteger(input.version) || input.version < 1) throw new Error('invalid_input');
  const fields = ['firstName', 'lastName', 'phone', 'companyName'];
  if (fields.some(field => typeof input[field] !== 'string' || input[field].length > 200 || /[\u0000-\u001f\u007f]/.test(input[field]))) throw new Error('invalid_input');
  const values = fields.map(field => input[field].trim());
  if (values.slice(0, 3).some(value => !value)) throw new Error('invalid_input');
  const updated = await db.query('UPDATE users SET first_name=$1,last_name=$2,phone=$3,company_name=$4,profile_version=profile_version+1 WHERE id=$5 AND profile_version=$6 RETURNING id,email,role,created_at,first_name,last_name,phone,company_name,profile_version', [...values, input.id, input.version]);
  if (updated.rowCount) return updated.rows[0];
  const existing = await db.query('SELECT 1 FROM users WHERE id=$1', [input.id]);
  throw new Error(existing.rowCount ? 'version_conflict' : 'user_not_found');
}

export async function saveUserProfileAsAdmin(db, actorId, input) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [68499002]);
    await requireActiveAdmin(client, actorId);
    const profile = await saveUserProfile(client, input);
    await client.query('COMMIT');
    return profile;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function saveOwnUserProfile(db, actorId, input) {
 const client=await db.connect();try{await client.query('BEGIN');await requireTransactionUser(client,actorId);const profile=await saveUserProfile(client,{...input,id:actorId});await client.query('COMMIT');return profile;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function changeUserRole(db, actorId, input) {
  if (!input || typeof input.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id) || !['admin','customer'].includes(input.role) || !['admin','customer'].includes(input.expectedRole) || typeof input.expectedRevision !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(input.expectedRevision) || typeof input.expectedActivationRevision !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(input.expectedActivationRevision) || typeof input.expectedPermissionRevision !== 'string' || !/^(0|[1-9]\d{0,18}):(0|[1-9]\d{0,18}):(0|[1-9]\d{0,18})$/.test(input.expectedPermissionRevision)) throw new Error('invalid_input');
  if (input.id === actorId && input.role !== 'admin') throw new Error('cannot_demote_self');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [68499002]);
    await requireActiveAdmin(client,actorId);
    const target = await client.query('SELECT id,role,active FROM users WHERE id=$1 FOR UPDATE', [input.id]);
    if (!target.rowCount) throw new Error('user_not_found');
    const revision=(await client.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_role_history WHERE user_id=$1',[input.id])).rows[0].revision;
    const activationRevision=(await client.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[input.id])).rows[0].revision;
    const permissionHistoryRevision=(await client.query('SELECT COALESCE(max(id),0)::text AS revision FROM staff_permission_history WHERE user_id=$1',[input.id])).rows[0].revision;
    const permissionRevision=[revision,permissionHistoryRevision,activationRevision].join(':');
    if (target.rows[0].role !== input.expectedRole || revision !== input.expectedRevision || activationRevision !== input.expectedActivationRevision || permissionRevision !== input.expectedPermissionRevision) throw new Error('version_conflict');
    if (target.rows[0].role === 'admin' && target.rows[0].active && input.role !== 'admin') {
      const admins = await client.query("SELECT count(*) AS count FROM users WHERE role='admin' AND active=true");
      if (Number(admins.rows[0].count) <= 1) throw new Error('last_admin');
    }
    if(target.rows[0].role!==input.role){
      const old=(await client.query('DELETE FROM staff_permissions WHERE user_id=$1 RETURNING permission',[input.id])).rows.map(row=>row.permission).sort();
      if(old.length)await client.query('INSERT INTO staff_permission_history(user_id,actor_user_id,old_permissions,new_permissions) VALUES($1,$2,$3,$4)',[input.id,actorId,JSON.stringify(old),'[]']);
      await client.query('INSERT INTO user_role_history(user_id,actor_user_id,old_role,new_role) VALUES($1,$2,$3,$4)',[input.id,actorId,target.rows[0].role,input.role]);
    }
    const updated = await client.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id,email,role,created_at', [input.role,input.id]);
    await client.query('COMMIT'); return updated.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
