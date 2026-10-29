import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const digest = value => createHash('sha256').update(value).digest('hex');
const emailOk = value => typeof value === 'string' && value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const passwordOk = value => typeof value === 'string' && value.length >= 12 && value.length <= 128;
// Perform the same password derivation for unknown accounts, reducing the timing
// difference that would otherwise reveal whether a valid email is registered.
const dummyPasswordHash = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
export async function hashPassword(password) {
  if (!passwordOk(password)) throw new Error('invalid_input');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128 || typeof encoded !== 'string') return false;
  const parts = encoded.split(':');
  if (parts[0] !== 'scrypt' || !/^[0-9a-f]{32}$/.test(parts[1] || '') || !/^[0-9a-f]{128}$/.test(parts[2] || '')) return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = await scrypt(password, parts[1], 64);
  return timingSafeEqual(actual, expected);
}
export async function register(db, email, password, role = 'customer', profile = null) {
  if (!emailOk(email) || !['customer', 'admin'].includes(role)) throw new Error('invalid_input');
  if(profile!==null&&(!profile||typeof profile!=='object'||['firstName','lastName','phone','companyName'].some(k=>typeof profile[k]!=='string'||profile[k].length>200||/[\u0000-\u001f\u007f]/.test(profile[k]))||['firstName','lastName','phone'].some(k=>!profile[k].trim())))throw Error('invalid_input');
  const hash = await hashPassword(password);
  try {
    const result = await db.query('INSERT INTO users (id,email,password_hash,role,first_name,last_name,phone,company_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,email,role', [randomUUID(), email.trim().toLowerCase(), hash, role,profile?.firstName.trim()||'',profile?.lastName.trim()||'',profile?.phone.trim()||'',profile?.companyName.trim()||'']);
    return result.rows[0];
  } catch (e) { if (e.code === '23505') throw new Error('already_exists'); throw e; }
}
export async function login(db, email, password) {
  if (!emailOk(email)) throw new Error('invalid_credentials');
  const result = await db.query('SELECT id,email,role,password_hash,active FROM users WHERE lower(email) = lower($1)', [email]);
  const matches = await verifyPassword(password, result.rows[0]?.password_hash ?? dummyPasswordHash);
  if (!result.rowCount || !matches || !result.rows[0].active) throw new Error('invalid_credentials');
  const token = randomBytes(32).toString('hex');
  const client=await db.connect();try{await client.query('BEGIN');const user=await client.query('SELECT active,password_hash FROM users WHERE id=$1 FOR UPDATE',[result.rows[0].id]);if(!user.rowCount||!user.rows[0].active||user.rows[0].password_hash!==result.rows[0].password_hash)throw Error('invalid_credentials');await client.query("INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '12 hours')", [digest(token),result.rows[0].id]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  const user=await currentUser(db,token);if(!user)throw Error('invalid_credentials');return { token, user };
}
export async function currentUser(db, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await db.query("SELECT u.id,u.email,u.role,(u.email_verified_at IS NOT NULL) AS \"emailVerified\",NULLIF(u.first_name,'') AS \"displayName\",COALESCE((SELECT array_agg(p.permission ORDER BY p.permission) FROM staff_permissions p WHERE p.user_id=u.id),ARRAY[]::text[]) AS permissions FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true", [digest(token)]);
  return result.rows[0] ?? null;
}
export async function logout(db, token) { if (token) await db.query('DELETE FROM auth_sessions WHERE token_hash=$1', [digest(token)]); }
export async function beginReset(db, mailer, email, origin) {
  if (!emailOk(email)) return;
  if(!mailer)return;const token=randomBytes(32).toString('hex');const client=await db.connect();let recipient;
  try{await client.query('BEGIN');const result=await client.query('SELECT id,email,active FROM users WHERE lower(email)=lower($1) FOR UPDATE',[email]);if(result.rowCount&&result.rows[0].active){recipient=result.rows[0].email;await client.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[result.rows[0].id]);await client.query("INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '30 minutes')",[digest(token),result.rows[0].id]);}await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  if(recipient)try { await mailer.send({ to: recipient, subject: 'PC-LEASE: password reset', text: `Use this link within 30 minutes to reset your password: ${origin}/#reset=${token}\nIf you did not request this, ignore this message.` }); } catch { /* Return the same response regardless of account or mail status. */ }
}
export async function finishReset(db, token, password) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('invalid_reset');
  const hash = await hashPassword(password); const client = await db.connect();
  try {
    await client.query('BEGIN');
    const owner=await client.query('SELECT user_id FROM password_resets WHERE token_hash=$1',[digest(token)]);if(!owner.rowCount)throw Error('invalid_reset');
    const active=await client.query('SELECT active FROM users WHERE id=$1 FOR UPDATE',[owner.rows[0].user_id]);if(!active.rowCount||!active.rows[0].active)throw Error('invalid_reset');
    const result = await client.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING user_id', [digest(token)]);
    if (!result.rowCount) throw new Error('invalid_reset');
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, result.rows[0].user_id]);
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [result.rows[0].user_id]);
    await client.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [result.rows[0].user_id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
