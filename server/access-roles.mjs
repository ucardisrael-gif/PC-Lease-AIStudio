import { randomUUID } from 'node:crypto';
import { requireTransactionAdmin } from './transaction-permissions.mjs';

const valid = ['orders','catalog','content','inventory','inventory_cost','service','contracts','finance'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const roleId = value => typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value);

export async function listAccessRoles(db) {
  const { rows } = await db.query("SELECT r.*, (SELECT count(*)::int FROM access_role_assignments a WHERE a.role_id=r.id) AS user_count, (SELECT md5(COALESCE(string_agg(a.user_id,',' ORDER BY a.user_id),'')) FROM access_role_assignments a WHERE a.role_id=r.id) AS assignment_fingerprint FROM access_roles r ORDER BY lower(name),id");
  return { roles: rows };
}

export async function listAccessRoleHistory(db, params) {
  const before = params.get('before') || '';
  if (before && !/^[1-9]\d{0,17}$/.test(before)) throw Error('invalid_input');
  const rows = (await db.query(`SELECT h.id::text,h.action,h.role_id,h.before_data,h.after_data,h.created_at,
    actor.email AS actor_email, target.email AS target_email
    FROM access_role_history h JOIN users actor ON actor.id=h.actor_id
    LEFT JOIN users target ON target.id=h.user_id
    WHERE ($1::text='' OR h.id<NULLIF($1,'')::bigint) ORDER BY h.id DESC LIMIT 26`,[before])).rows;
  const events=rows.slice(0,25);
  const ids=[...new Set(events.flatMap(e=>[e.role_id,...(Array.isArray(e.before_data)?e.before_data:[]),...(Array.isArray(e.after_data)?e.after_data:[])]).filter(Boolean))];
  const names=(await db.query(`SELECT id,name FROM access_roles WHERE id=ANY($1::text[])
    UNION ALL SELECT id,name FROM (SELECT DISTINCT ON(h.role_id) h.role_id AS id,COALESCE(h.after_data->>'name',h.before_data->>'name') AS name
    FROM access_role_history h WHERE h.role_id=ANY($1::text[]) AND h.action IN ('create','update','delete')
    AND COALESCE(h.after_data->>'name',h.before_data->>'name') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM access_roles r WHERE r.id=h.role_id)
    ORDER BY h.role_id,h.id DESC) historical`,[ids])).rows;
  return {events,hasMore:rows.length>25,roleNames:Object.fromEntries(names.map(row=>[row.id,row.name]))};
}

export async function deleteAccessRole(db, actorId, input) {
  if(!input || !roleId(input.id) || !Number.isInteger(input.version) || input.version<1 || typeof input.assignmentFingerprint!=='string' || !/^[a-f0-9]{32}$/.test(input.assignmentFingerprint)) throw Error('invalid_input');
  const c=await db.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock($1)',[68499002]);
    await requireTransactionAdmin(c,actorId);
    const role=(await c.query('SELECT * FROM access_roles WHERE id=$1 FOR UPDATE',[input.id])).rows[0];
    if(!role)throw Error('not_found');
    if(role.version!==input.version)throw Error('version_conflict');
    const users=(await c.query('SELECT u.id FROM users u JOIN access_role_assignments a ON a.user_id=u.id WHERE a.role_id=$1 ORDER BY u.id FOR UPDATE OF u',[input.id])).rows;
    const fingerprint=(await c.query("SELECT md5(COALESCE(string_agg(user_id,',' ORDER BY user_id),'')) AS fingerprint FROM access_role_assignments WHERE role_id=$1",[input.id])).rows[0].fingerprint;
    if(fingerprint!==input.assignmentFingerprint)throw Error('version_conflict');
    if(users.length)await c.query('UPDATE users SET access_roles_version=access_roles_version+1 WHERE id=ANY($1::text[])',[users.map(u=>u.id)]);
    await c.query('DELETE FROM access_role_assignments WHERE role_id=$1',[input.id]);
    await c.query('INSERT INTO access_role_history(actor_id,action,role_id,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[actorId,'delete',input.id,JSON.stringify(role),JSON.stringify({removedUserCount:users.length})]);
    await c.query('DELETE FROM access_roles WHERE id=$1',[input.id]);
    await c.query('COMMIT');return {deleted:true};
  } catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

export async function saveAccessRole(db, actorId, input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100 || /[\x00-\x1f\x7f]/.test(input.name) || !Array.isArray(input.permissions) || input.permissions.some(p=>!valid.includes(p)) || new Set(input.permissions).size !== input.permissions.length || (input.id !== null && !roleId(input.id)) || (input.id !== null && (!Number.isInteger(input.version) || input.version < 1))) throw Error('invalid_input');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [68499002]);
    await requireTransactionAdmin(client,actorId);
    const id = input.id || randomUUID();
    const old = (await client.query('SELECT * FROM access_roles WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (input.id && !old) throw Error('not_found');
    if (old && old.version !== input.version) throw Error('version_conflict');
    // Serialize access changes with operations already in progress for assigned users.
    await client.query('SELECT u.id FROM users u JOIN access_role_assignments a ON a.user_id=u.id WHERE a.role_id=$1 ORDER BY u.id FOR UPDATE OF u',[id]);
    if(old) await client.query('UPDATE users SET access_roles_version=access_roles_version+1 WHERE id IN (SELECT user_id FROM access_role_assignments WHERE role_id=$1)',[id]);
    const result = old ? await client.query('UPDATE access_roles SET name=$2,permissions=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id,input.name.trim(),input.permissions.sort()]) : await client.query('INSERT INTO access_roles(id,name,permissions) VALUES($1,$2,$3) RETURNING *',[id,input.name.trim(),input.permissions.sort()]);
    await client.query('INSERT INTO access_role_history(actor_id,action,role_id,before_data,after_data) VALUES($1,$2,$3,$4,$5)',[actorId,old?'update':'create',id,old?JSON.stringify(old):null,JSON.stringify(result.rows[0])]);
    await client.query('COMMIT'); return result.rows[0];
  } catch(e) { await client.query('ROLLBACK'); if(e.code==='23505') throw Error('name_conflict'); throw e; } finally {client.release();}
}

export async function assignAccessRoles(db,actorId,input) {
  if(!input||!uuid(input.userId)||!Array.isArray(input.roles)||!Array.isArray(input.expectedRoles)||[...input.roles,...input.expectedRoles].some(x=>!roleId(x))||new Set(input.roles).size!==input.roles.length||new Set(input.expectedRoles).size!==input.expectedRoles.length||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw Error('invalid_input');
  const c=await db.connect();try{
    await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[68499002]);await requireTransactionAdmin(c,actorId);
    const user=(await c.query('SELECT role,access_roles_version FROM users WHERE id=$1 FOR UPDATE',[input.userId])).rows[0];if(!user)throw Error('not_found');if(user.role==='admin')throw Error('admin_has_full_access');
    if(input.roles.length&&(await c.query('SELECT 1 FROM dealer_user_access WHERE user_id=$1',[input.userId])).rowCount)throw Error('dealer_only_account');
    const old=(await c.query('SELECT role_id FROM access_role_assignments WHERE user_id=$1 ORDER BY role_id',[input.userId])).rows.map(x=>x.role_id);
    const next=[...input.roles].sort();if(user.access_roles_version!==input.expectedVersion||JSON.stringify(old)!==JSON.stringify([...input.expectedRoles].sort()))throw Error('version_conflict');
    const roles=(await c.query('SELECT id FROM access_roles WHERE id=ANY($1::text[])',[next])).rows;if(roles.length!==next.length)throw Error('invalid_input');
    if(JSON.stringify(old)!==JSON.stringify(next)){
      await c.query('UPDATE users SET access_roles_version=access_roles_version+1 WHERE id=$1',[input.userId]);
      await c.query('DELETE FROM access_role_assignments WHERE user_id=$1',[input.userId]);
      for(const id of next)await c.query('INSERT INTO access_role_assignments(user_id,role_id) VALUES($1,$2)',[input.userId,id]);
      await c.query('INSERT INTO access_role_history(actor_id,action,role_id,user_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6)',[actorId,'assign','',input.userId,JSON.stringify(old),JSON.stringify(next)]);
    }
    await c.query('COMMIT');return {roles:next};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
