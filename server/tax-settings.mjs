import {requireTransactionAdmin} from './transaction-permissions.mjs';
export async function getTaxSettings(db, lock = false) {
  const result = await db.query(`SELECT vat_basis_points,version,updated_at FROM tax_settings WHERE id=true${lock ? ' FOR SHARE' : ''}`);
  if (!result.rowCount) throw Error('unavailable');
  return result.rows[0];
}

export async function listTaxSettingsHistory(db, params) {
  const offset=params.get('offset')||'0',before=params.get('before')||'';
  if(!/^\d{1,7}$/.test(offset)||(before&&(!/^[1-9]\d{0,17}$/.test(before)||Number(offset)!==0)))throw Error('invalid_input');
  if(before&&!(await db.query('SELECT 1 FROM tax_settings_history WHERE id=$1::bigint',[before])).rowCount)throw Error('invalid_input');
  const rows=(await db.query("SELECT h.id::text,h.previous_basis_points,h.new_basis_points,h.created_at,u.email AS actor_email FROM tax_settings_history h JOIN users u ON u.id=h.actor_user_id WHERE ($2::text='' OR h.id<NULLIF($2,'')::bigint) ORDER BY h.id DESC LIMIT 26 OFFSET $1",[Number(offset),before])).rows;
  return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset),cursorSupported:true};
}

export async function saveTaxSettings(db, actorId, input) {
  if (!input || !Number.isSafeInteger(input.vatBasisPoints) || input.vatBasisPoints < 0 || input.vatBasisPoints > 10000 || !Number.isSafeInteger(input.version) || input.version < 1) throw Error('invalid_input');
  const c = await db.connect();
  try {
    await c.query('BEGIN');await requireTransactionAdmin(c,actorId);
    const old = (await c.query('SELECT * FROM tax_settings WHERE id=true FOR UPDATE')).rows[0];
    if (!old) throw Error('unavailable');
    if (old.version !== input.version) throw Error('version_conflict');
    const saved = (await c.query('UPDATE tax_settings SET vat_basis_points=$1,version=version+1,updated_at=now() WHERE id=true RETURNING vat_basis_points,version,updated_at', [input.vatBasisPoints])).rows[0];
    await c.query('INSERT INTO tax_settings_history(actor_user_id,previous_basis_points,new_basis_points) VALUES($1,$2,$3)', [actorId, old.vat_basis_points, saved.vat_basis_points]);
    await c.query('COMMIT');
    return saved;
  } catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
}
