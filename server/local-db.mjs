import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { openDatabase } from './database.mjs';

const dataRoot = fileURLToPath(new URL('../data/', import.meta.url));
const clusterDir = join(dataRoot, 'postgres');
const secretFile = join(dataRoot, 'postgres-password');
mkdirSync(dataRoot, { recursive: true });
if (!existsSync(secretFile)) {
  if (existsSync(join(clusterDir, 'PG_VERSION'))) throw new Error('Database password file is missing; do not recreate or reset the database');
  writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
}
const password = readFileSync(secretFile, 'utf8').trim();
const port = 55432;
const postgres = new EmbeddedPostgres({ databaseDir: clusterDir, user: 'pclease_local', password, port, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8'], persistent: true, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
if (!existsSync(join(clusterDir, 'PG_VERSION'))) await postgres.initialise();
await postgres.start();
try {
  const admin = postgres.getPgClient('postgres', '127.0.0.1');
  await admin.connect();
  try {
    const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'pclease_dev'");
    if (!existing.rowCount) await admin.query("CREATE DATABASE pclease_dev WITH TEMPLATE template0 ENCODING 'UTF8'");
  } finally { await admin.end(); }
  const url = `postgresql://pclease_local:${encodeURIComponent(password)}@127.0.0.1:${port}/pclease_dev`;
  const db = await openDatabase(url);
  await db.end();
  console.log('PostgreSQL is ready on 127.0.0.1:55432. Keep this process running for local development.');
  console.log('Start the application server in another terminal with node server/local-server.mjs.');
} catch (error) { await postgres.stop(); throw error; }
