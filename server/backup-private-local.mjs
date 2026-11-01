import {copyFile, mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {backupStoppedCluster} from './offline-backup.mjs';

const data = fileURLToPath(new URL('../data/', import.meta.url));
const root = join(data, 'private-backups');
await mkdir(root, {recursive: true});
const target = join(root, `postgres-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`);
await mkdir(target);
const result = await backupStoppedCluster(join(data, 'postgres'), join(target, 'cluster'));
await copyFile(join(data, 'postgres-password'), join(target, 'postgres-password'));
if (!(await readFile(join(data, 'postgres-password'))).equals(await readFile(join(target, 'postgres-password')))) throw Error('Password backup verification failed');
try { await copyFile(join(data, 'crm-work-enabled'), join(target, 'crm-work-enabled')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Verified PostgreSQL ${result.version} backup: ${target}`);
