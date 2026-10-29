import { readFileSync } from 'node:fs';
import { openDatabase } from './database.mjs';
import { seedCatalog } from './catalog.mjs';
const password = readFileSync(new URL('../data/postgres-password', import.meta.url), 'utf8').trim();
const db = await openDatabase(`postgresql://pclease_local:${encodeURIComponent(password)}@127.0.0.1:55432/pclease_dev`);
try { await seedCatalog(db); console.log('Demo catalog initialized; existing products were not overwritten.'); }
finally { await db.end(); }
