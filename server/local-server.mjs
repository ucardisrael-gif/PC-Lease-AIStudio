import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
const mailConfig = new URL('../.env.mail', import.meta.url);
if (existsSync(mailConfig)) loadEnvFile(mailConfig);
import { readFileSync } from 'node:fs';
// The marker is created only after the local backup and deployment checks.
if (existsSync(new URL('../data/crm-work-enabled', import.meta.url))) process.env.PC_LEASE_CRM_WORK_ENABLED = '1';
process.env.PC_LEASE_DATABASE_URL = `postgresql://pclease_local:${encodeURIComponent(readFileSync(new URL('../data/postgres-password', import.meta.url), 'utf8').trim())}@127.0.0.1:55432/pclease_dev`;
await import('./index.mjs');
