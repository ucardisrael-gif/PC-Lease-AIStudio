import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {backupStoppedCluster} from './offline-backup.mjs';

const data=fileURLToPath(new URL('../data/',import.meta.url));
const destination=join(data,'backups');await mkdir(destination,{recursive:true});
const target=join(destination,`postgres-${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`);
try{const result=await backupStoppedCluster(join(data,'postgres'),target);console.log(`Stopped PostgreSQL ${result.version} cluster copied and verified: ${target}`);console.log('Keep the database password file separately. Protect this backup as it contains all database data.');}
catch(error){console.error(`Backup failed: ${error.message}. Any partial destination must not be used: ${target}`);process.exitCode=1;}
