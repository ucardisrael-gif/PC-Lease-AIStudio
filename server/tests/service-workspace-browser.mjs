import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
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
const require=createRequire(import.meta.url),{chromium}=require(process.env.PC_LEASE_PLAYWRIGHT_PATH||'playwright');
async function freePort(){const p=netServer();p.listen(0,'127.0.0.1');await once(p,'listening');const port=p.address().port;await new Promise(r=>p.close(r));return port;}
const dir=mkdtempSync(join(tmpdir(),'pclease-roles-')),dbPort=await freePort(),apiPort=await freePort(),frontPort=await freePort(),password=randomBytes(24).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port:dbPort,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let db,api,browser,front;try{
 await pg.initialise();await pg.start();const dbUrl=`postgresql://pclease_test:${password}@127.0.0.1:${dbPort}/postgres`;db=await openDatabase(dbUrl);await seedCatalog(db);
 const email='admin@example.invalid',pass='test-password-123';await register(db,email,pass,'admin');await register(db,'staff@example.invalid',pass);
 const env={...process.env,PC_LEASE_DATABASE_URL:dbUrl,PC_LEASE_SERVER_PORT:String(apiPort)};delete env.PC_LEASE_MAIL_USER;delete env.PC_LEASE_MAIL_APP_PASSWORD;delete env.PC_LEASE_HOSTED;
 api=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(api.stdout,'data'),once(api,'exit').then(()=>{throw Error('API failed');})]);
 const app=express();app.use('/api',(req,res)=>{const headers={...req.headers};if(headers.origin===`http://127.0.0.1:${frontPort}`)headers.origin='http://127.0.0.1:3000';const forward=httpRequest({hostname:'127.0.0.1',port:apiPort,path:'/api'+req.url,method:req.method,headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});forward.on('error',()=>res.status(502).end());req.pipe(forward);});app.use(express.static('dist'));front=app.listen(frontPort,'127.0.0.1');await once(front,'listening');
 const path='C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch({headless:true,...(existsSync(path)?{executablePath:path}:{})});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);await page.addInitScript(()=>sessionStorage.setItem('pc-lease-lang','en'));await page.goto(`http://127.0.0.1:${frontPort}/`);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('dialog').getByLabel('Email').fill(email);await page.getByRole('dialog').getByLabel('Password (at least 12 characters)').fill(pass);await page.getByRole('dialog').getByRole('button',{name:'Sign in',exact:true}).first().click();await page.getByRole('button',{name:'Administration',exact:true}).click();if(viewport.width<768)await page.getByRole('button',{name:'Admin menu'}).click();await page.getByRole('button',{name:/Serial Inventory/}).click();await page.getByRole('heading',{name:'Inventory and serial numbers'}).waitFor();await page.getByRole('button',{name:'Receive asset'}).click();const form=page.getByRole('heading',{name:'Receive new asset'}).locator('..');await form.getByLabel('Serial number',{exact:true}).fill(`TEST-SERIAL-${viewport.width}`);await form.getByLabel('Product model').selectOption({index:1});await form.getByLabel('Location',{exact:true}).fill('Test shelf');await form.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Asset saved.').waitFor();const asset=(await db.query('SELECT serial_number,location,status FROM inventory_assets WHERE serial_number=$1',[`TEST-SERIAL-${viewport.width}`])).rows[0];if(!asset||asset.location!=='Test shelf'||asset.status!=='received')throw Error('Asset not saved');const search=page.getByLabel('Search serial, model, location or order');await search.fill(`TEST-SERIAL-${viewport.width}`);await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('article').filter({hasText:`TEST-SERIAL-${viewport.width}`}).waitFor();if(viewport.width<768)await page.getByRole('button',{name:'Admin menu'}).click();await page.getByRole('button',{name:/Service & Warranty Routing/}).click();await page.getByRole('button',{name:'New ticket',exact:true}).click();const formTicket=page.getByRole('heading',{name:'New ticket'}).locator('..');await formTicket.getByLabel('Serial number',{exact:true}).fill(`TEST-SERIAL-${viewport.width}`);await formTicket.getByLabel('Problem description').fill(`Test issue ${viewport.width}`);await formTicket.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Ticket saved.').waitFor();const ticket=(await db.query('SELECT description FROM service_tickets WHERE description=$1',[`Test issue ${viewport.width}`])).rows[0];if(!ticket)throw Error('Ticket was not saved');await page.locator('article').filter({hasText:`Test issue ${viewport.width}`}).waitFor();await page.close();
 }
 console.log('PASS: service ticket creation on desktop and mobile');}finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
