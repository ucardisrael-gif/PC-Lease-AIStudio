// Exercise a backup, restore and CRM upgrade using only a new synthetic cluster.
import {mkdtempSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';
import {openDatabase} from './database.mjs';
import {backupStoppedCluster} from './offline-backup.mjs';
import {register} from './auth.mjs';
import {seedCatalog} from './catalog.mjs';
import {runColumnAutomation,setupFirstBoard,listBoards,listColumns,listCards} from './crm-work.mjs';
async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p}
if(process.env.PC_LEASE_CRM_WORK_TEST||process.env.PC_LEASE_CRM_WORK_ENABLED)throw Error('Start upgrade test without CRM flags');
const root=mkdtempSync(join(tmpdir(),'pclease-crm-upgrade-')),password=randomBytes(24).toString('hex'),port=await freePort();
const make=(dir,p)=>new EmbeddedPostgres({databaseDir:dir,port:p,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
const getBinaries=(await import(new URL('./binary.js',import.meta.resolve('embedded-postgres')))).default;
const {postgres}=await getBinaries();const pgCtl=join(dirname(postgres),process.platform==='win32'?'pg_ctl.exe':'pg_ctl');
async function stopClean(instance,dir){const exited=once(instance.process,'exit');const child=spawn(pgCtl,['stop','-D',dir,'-m','fast','-w'],{stdio:'ignore'});const [code]=await once(child,'exit');if(code!==0)throw Error('Clean test PostgreSQL stop failed');await exited;instance.process=undefined}
const url=p=>`postgresql://pclease_test:${password}@127.0.0.1:${p}/postgres`;
const source=make(join(root,'source'),port);let sourceStarted=false,restore,restoreStarted=false,db;
try{
 await source.initialise();await source.start();sourceStarted=true;db=await openDatabase(url(port));
 const user=await register(db,'synthetic-upgrade@example.invalid','test-password-123','admin');await seedCatalog(db);
 await db.query("INSERT INTO organizations(id,name) VALUES('synthetic-upgrade-org','Synthetic upgrade organization')");
 const before=(await db.query("SELECT (SELECT count(*)::int FROM products) AS products,(SELECT count(*)::int FROM users) AS users,(SELECT name FROM organizations WHERE id='synthetic-upgrade-org') AS organization")).rows[0];
 assert.equal((await db.query("SELECT to_regclass('crm_work_boards') AS relation")).rows[0].relation,null);
 await db.end();db=null;await stopClean(source,join(root,'source'));sourceStarted=false;
 const backup=join(root,'verified-backup');await backupStoppedCluster(join(root,'source'),backup);
 const restorePort=await freePort();restore=make(backup,restorePort);await restore.start();restoreStarted=true;
 process.env.PC_LEASE_CRM_WORK_ENABLED='1';db=await openDatabase(url(restorePort));
 const after=(await db.query("SELECT (SELECT count(*)::int FROM products) AS products,(SELECT count(*)::int FROM users) AS users,(SELECT name FROM organizations WHERE id='synthetic-upgrade-org') AS organization")).rows[0];assert.deepEqual(after,before);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM schema_migrations WHERE version IN (89,90,91,92,94,95,96,97)")).rows[0].n,8);
 assert.equal((await db.query("SELECT to_regclass('crm_workforce_entries') AS relation")).rows[0].relation,null);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM staff_permissions WHERE permission LIKE 'crm_%'")).rows[0].n,0);
 assert.equal((await db.query('SELECT active FROM users WHERE id=$1',[user.id])).rows[0].active,true);
 assert.equal(await runColumnAutomation(db),0);
 const actor={id:user.id,role:'admin',permissions:[]};
 const first=await setupFirstBoard(db,actor,{name:'Synthetic first board',columns:[{name:'New',color:'blue'},{name:'In progress',color:'cyan'},{name:'Completed',color:'green'}]});
 assert.equal((await listBoards(db,actor)).length,1);assert.equal((await listColumns(db,actor,first.id)).length,3);assert.equal((await listCards(db,actor,{boardId:first.id})).cards.length,0);
 await assert.rejects(setupFirstBoard(db,actor,{name:'Duplicate',columns:[{name:'New',color:'blue'}]}),/version_conflict/);
 console.log('PASS: synthetic backup restored, CRM migrations applied and existing records preserved');
}finally{if(db)await db.end();if(restoreStarted)await restore.stop();if(sourceStarted)await source.stop()}
