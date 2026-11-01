import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import {initialiseDemo} from './demo-bootstrap.mjs';

const probe=createServer().listen(0,'127.0.0.1'); await once(probe,'listening');
const port=probe.address().port; await new Promise(r=>probe.close(r));
const dir=await mkdtemp(join(tmpdir(),'pclease-demo-test-'));
const password=randomBytes(24).toString('hex');
const postgres=new EmbeddedPostgres({databaseDir:join(dir,'db'),port,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let client;
try {
  await postgres.initialise(); await postgres.start();
  const base=`postgresql://pclease_test:${password}@127.0.0.1:${port}`;
  client=new pg.Client({connectionString:`${base}/postgres`}); await client.connect();
  await client.query('CREATE DATABASE pclease_demo');
  process.env.PC_LEASE_CRM_WORK_ENABLED='1';
  const args={url:`${base}/pclease_demo`,email:'demo@example.invalid',password:randomBytes(24).toString('hex'),enabled:'1'};
  await assert.rejects(initialiseDemo({...args,url:`${base}/postgres`}),/Dedicated/);
  await assert.rejects(initialiseDemo({...args,enabled:'0'}),/Dedicated/);
  assert.equal(await initialiseDemo(args),'initialised');
  assert.equal(await initialiseDemo(args),'already initialised');
  const demo=new pg.Client({connectionString:args.url}); await demo.connect();
  try { assert.equal((await demo.query('SELECT count(*)::int AS n FROM crm_work_cards')).rows[0].n,4); assert.equal((await demo.query('SELECT count(*)::int AS n FROM users')).rows[0].n,1); }
  finally { await demo.end(); }
  const frontProbe=createServer().listen(0,'127.0.0.1'); await once(frontProbe,'listening'); const frontPort=frontProbe.address().port; await new Promise(r=>frontProbe.close(r));
  const gate=randomBytes(24).toString('hex');
  const host=spawn(process.execPath,['server/demo-hosted.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(frontPort),PC_LEASE_PUBLIC_ORIGIN:'https://demo.example.invalid',PC_LEASE_DATABASE_URL:args.url,PC_LEASE_DEMO_EMAIL:args.email,PC_LEASE_DEMO_PASSWORD:args.password,PC_LEASE_DEMO_GATE_PASSWORD:gate,PC_LEASE_DEMO_BOOTSTRAP:'1',PC_LEASE_CRM_WORK_ENABLED:'1',PC_LEASE_MAIL_USER:'',PC_LEASE_MAIL_APP_PASSWORD:''}});
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${frontPort}/health`);if(r.status===200){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,100));}
    assert.ok(ready,'Demo hosted process did not become ready');
    assert.equal((await fetch(`http://127.0.0.1:${frontPort}/api/catalog`)).status,401);
    const auth='Basic '+Buffer.from(`demo:${gate}`).toString('base64');
    assert.equal((await fetch(`http://127.0.0.1:${frontPort}/api/catalog`,{headers:{authorization:auth}})).status,200);
    const login=await fetch(`http://127.0.0.1:${frontPort}/api/auth/login`,{method:'POST',headers:{authorization:auth,origin:'https://demo.example.invalid','content-type':'application/json'},body:JSON.stringify({email:args.email,password:args.password})});
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const boards=await fetch(`http://127.0.0.1:${frontPort}/api/admin/crm-work/boards`,{headers:{authorization:auth,cookie}});
    assert.equal(boards.status,200); assert.equal((await boards.json()).boards.length,1);
  } finally { host.kill(); await once(host,'exit').catch(()=>{}); }
  console.log('Demo initialization, isolation guards and restart verified on synthetic PostgreSQL.');
} finally { if(client)await client.end(); await postgres.stop(); }
