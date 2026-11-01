import {readFileSync} from 'node:fs';
import pg from 'pg';

// Only aggregate counts are printed; the password and row contents stay local.
const password=readFileSync(new URL('../data/postgres-password',import.meta.url),'utf8').trim();
const client=new pg.Client({host:'127.0.0.1',port:55432,user:'pclease_local',password,database:'pclease_dev'});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const result=await client.query("SELECT (SELECT max(version) FROM schema_migrations) AS version,(SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM organizations) AS organizations,(SELECT count(*)::int FROM requests) AS requests,(SELECT to_regclass('crm_work_boards')) AS crm_table");
  console.log(JSON.stringify(result.rows[0]));
  await client.query('ROLLBACK');
} finally { await client.end() }
