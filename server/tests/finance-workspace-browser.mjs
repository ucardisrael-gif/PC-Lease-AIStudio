import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createServer as netServer} from 'node:net';
import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import EmbeddedPostgres from 'embedded-postgres';
import express from 'express';
import {openDatabase} from '../database.mjs';
import {seedCatalog} from '../catalog.mjs';
import {register} from '../auth.mjs';
import {saveMultiQuote} from '../multi-quote.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PC_LEASE_PLAYWRIGHT_PATH||'playwright');
async function freePort(){const p=netServer();p.listen(0,'127.0.0.1');await once(p,'listening');const port=p.address().port;await new Promise(r=>p.close(r));return port;}
const dir=mkdtempSync(join(tmpdir(),'pclease-roles-')),dbPort=await freePort(),apiPort=await freePort(),frontPort=await freePort(),password=randomBytes(24).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port:dbPort,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let db,api,browser,front;try{
 await pg.initialise();await pg.start();const dbUrl=`postgresql://pclease_test:${password}@127.0.0.1:${dbPort}/postgres`;db=await openDatabase(dbUrl);await seedCatalog(db);
 const email='admin@example.invalid',pass='test-password-123';await register(db,email,pass,'admin');await register(db,'staff@example.invalid',pass);
 const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true ORDER BY slug LIMIT 1')).rows[0];
 for (const width of [1440,390]) await saveMultiQuote(db,{id:randomUUID(),lang:'en',source:'website',lines:[{productSlug:product.slug,productVersion:product.edit_version,mode:'lease',quantity:1}],companyName:`Board test ${width}`,contactName:'Test User',email:'customer@example.invalid',phone:'12345'});
 const env={...process.env,PC_LEASE_DATABASE_URL:dbUrl,PC_LEASE_SERVER_PORT:String(apiPort)};delete env.PC_LEASE_MAIL_USER;delete env.PC_LEASE_MAIL_APP_PASSWORD;delete env.PC_LEASE_HOSTED;
 api=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(api.stdout,'data'),once(api,'exit').then(()=>{throw Error('API failed');})]);
 const app=express();app.use('/api',(req,res)=>{const headers={...req.headers};if(headers.origin===`http://127.0.0.1:${frontPort}`)headers.origin='http://127.0.0.1:3000';const forward=httpRequest({hostname:'127.0.0.1',port:apiPort,path:'/api'+req.url,method:req.method,headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});forward.on('error',()=>res.status(502).end());req.pipe(forward);});app.use(express.static('dist'));front=app.listen(frontPort,'127.0.0.1');await once(front,'listening');
 const path='C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch({headless:true,...(existsSync(path)?{executablePath:path}:{})});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);await page.addInitScript(()=>sessionStorage.setItem('pc-lease-lang','en'));await page.goto(`http://127.0.0.1:${frontPort}/`);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('dialog').getByLabel('Email').fill(email);await page.getByRole('dialog').getByLabel('Password (at least 12 characters)').fill(pass);await page.getByRole('dialog').getByRole('button',{name:'Sign in',exact:true}).first().click();await page.getByRole('button',{name:'Administration',exact:true}).click();if(viewport.width<768)await page.getByRole('button',{name:'Admin menu'}).click();await page.getByRole('button',{name:/Financial Ledger/}).click();await page.getByRole('button',{name:'New record',exact:true}).click();const picker=page.getByLabel('Search by company, name, email, phone or ID');await picker.fill(`Board test ${viewport.width}`);await picker.locator('xpath=ancestor::fieldset').getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button').filter({hasText:`Board test ${viewport.width}`}).first().click();await page.getByLabel('Amount in ILS').fill('100');await page.getByLabel('Reference',{exact:true}).fill(`TEST-REF-${viewport.width}`);page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Save record'}).click();await page.getByText('Record saved.').waitFor();const row=(await db.query('SELECT kind,amount_minor FROM financial_entries WHERE reference=$1',[`TEST-REF-${viewport.width}`])).rows[0];if(row?.kind!=='payment'||Number(row.amount_minor)!==10000)throw Error('Payment record not saved');await page.locator('article').filter({hasText:`TEST-REF-${viewport.width}`}).waitFor();await page.close();
 }
 console.log('PASS: finance payment record on desktop and mobile');}finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
