import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';
const tests=['server/tests/crm-work-access.test.mjs','server/tests/crm-work-schema.test.mjs','server/tests/crm-work-app-browser.test.mjs'];
for(const test of tests){
 const dir=mkdtempSync(join(tmpdir(),'pc-lease-crm-test-'));const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));const password=randomBytes(24).toString('hex');
 const db=new EmbeddedPostgres({databaseDir:join(dir,'db'),port,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});let code=1;
 try{await db.initialise();await db.start();const child=spawn(process.execPath,['--test',test],{stdio:'inherit',env:{...process.env,PC_LEASE_CRM_WORK_TEST:'1',CRM_WORK_DIST:join(process.cwd(),'dist'),PC_LEASE_TEST_DATABASE_URL:`postgresql://pclease_test:${password}@127.0.0.1:${port}/postgres`}});[code]=await once(child,'exit');}finally{await db.stop();rmSync(dir,{recursive:true,force:true});}if(code!==0)process.exit(code||1);
}
