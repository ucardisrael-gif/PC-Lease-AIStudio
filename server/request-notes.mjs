import {requireTransactionPermission} from './transaction-permissions.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function listRequestNotes(db, params, inquiry=false) {
  const parent=inquiry?'contact_inquiries':'requests', table=inquiry?'inquiry_internal_notes':'request_internal_notes', key=inquiry?'inquiry_id':'request_id';
  const requestId = params.get('requestId'), rawOffset = params.get('offset') || '0', before=params.get('before')||'';
  if (!uuid(requestId) || !/^\d{1,7}$/.test(rawOffset) || (before&&(!uuid(before)||Number(rawOffset)!==0))) throw Error('invalid_input');
  if (!(await db.query(`SELECT 1 FROM ${parent} WHERE id=$1`, [requestId])).rowCount) throw Error('not_found');
  if(before&&!(await db.query(`SELECT 1 FROM ${table} WHERE id=$1 AND ${key}=$2`,[before,requestId])).rowCount)throw Error('not_found');
  const offset = Number(rawOffset);
  const rows = (await db.query(`SELECT n.id,n.body,n.created_at,u.email AS actor_email FROM ${table} n JOIN users u ON u.id=n.actor_user_id WHERE n.${key}=$1 AND ($3::text='' OR (n.created_at,n.id)<(SELECT created_at,id FROM ${table} WHERE id=$3 AND ${key}=$1)) ORDER BY n.created_at DESC,n.id DESC LIMIT 26 OFFSET $2`, [requestId, offset,before])).rows;
  return { notes: rows.slice(0, 25), hasMore: rows.length > 25, offset };
}

export async function createRequestNote(db, actorId, input, inquiry=false) {
  const parent=inquiry?'contact_inquiries':'requests', table=inquiry?'inquiry_internal_notes':'request_internal_notes', key=inquiry?'inquiry_id':'request_id';
  if (!input || !uuid(input.id) || !uuid(input.requestId) || typeof input.body !== 'string') throw Error('invalid_input');
  const body = input.body.trim();
  if (!body || body.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) throw Error('invalid_input');
  const client = await db.connect();
  try {
    await client.query('BEGIN');await requireTransactionPermission(client,actorId,'orders');
    if (!(await client.query(`SELECT 1 FROM ${parent} WHERE id=$1 FOR KEY SHARE`, [input.requestId])).rowCount) throw Error('not_found');
    const inserted = await client.query(`INSERT INTO ${table}(id,${key},actor_user_id,body) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id`, [input.id,input.requestId,actorId,body]);
    if (!inserted.rowCount) {
      const existing = (await client.query(`SELECT ${key} AS parent_id,actor_user_id,body FROM ${table} WHERE id=$1`, [input.id])).rows[0];
      if (!existing || existing.parent_id !== input.requestId || existing.actor_user_id !== actorId || existing.body !== body) throw Error('note_conflict');
    }
    await client.query('COMMIT');
    return { id: input.id, created: !!inserted.rowCount };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
