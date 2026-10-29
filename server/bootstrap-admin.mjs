import { readFileSync } from 'node:fs';
import { openDatabase } from './database.mjs';
import { hashPassword } from './auth.mjs';
import { randomUUID } from 'node:crypto';

let password = '';
for await (const chunk of process.stdin) password += chunk.toString('utf8');
password = password.replace(/\r?\n$/, '');
if (!password) throw new Error('Password required');
const secret = readFileSync(new URL('../data/postgres-password', import.meta.url), 'utf8').trim();
const db = await openDatabase(`postgresql://pclease_local:${encodeURIComponent(secret)}@127.0.0.1:55432/pclease_dev`);
const client = await db.connect();
try {
  const hash = await hashPassword(password);
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock($1)', [68499002]);
  const existing = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (existing.rowCount) throw new Error('An administrator already exists');
  await client.query("INSERT INTO users (id,email,password_hash,role) VALUES ($1,$2,$3,'admin')", [randomUUID(), 'alfagpt4@gmail.com', hash]);
  await client.query('COMMIT');
  console.log('Administrator created.');
} catch (error) { await client.query('ROLLBACK').catch(() => {}); console.error(error.message === 'invalid_input' ? 'Password must contain 12 to 128 characters.' : 'Could not create administrator.'); process.exitCode = 1; }
finally { client.release(); await db.end(); }
