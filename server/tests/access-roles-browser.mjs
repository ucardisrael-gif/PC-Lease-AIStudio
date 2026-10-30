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
  const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);await page.addInitScript(()=>sessionStorage.setItem('pc-lease-lang','en'));await page.goto(`http://127.0.0.1:${frontPort}/`);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('dialog').getByLabel('Email').fill(email);await page.getByRole('dialog').getByLabel('Password (at least 12 characters)').fill(pass);await page.getByRole('dialog').getByRole('button',{name:'Sign in',exact:true}).first().click();await page.getByRole('button',{name:'Administration',exact:true}).click();if(viewport.width<768)await page.getByRole('button',{name:'Admin menu'}).click();await page.getByRole('button',{name:/User Access/}).click();await page.getByRole('button',{name:'Roles',exact:true}).click();await page.getByRole('heading',{name:'Roles & permissions'}).waitFor();await page.getByRole('heading',{name:'Sales',exact:true}).waitFor();await page.screenshot({path:`tmp/access-roles-${viewport.width}.png`,fullPage:true});await page.getByRole('button',{name:'+ New role'}).click();await page.getByLabel('Role name').fill('Test role '+viewport.width);await page.getByRole('checkbox',{name:'All orders and customer details',exact:true}).check();page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Save role'}).click();await page.getByRole('heading',{name:'Test role '+viewport.width}).waitFor();
  await page.getByPlaceholder('Search name or email').fill('staff@example.invalid');await page.getByRole('button',{name:'Search',exact:true}).last().click();await page.getByRole('button',{name:/staff@example.invalid/}).click();await page.getByLabel('Test role '+viewport.width).check();await page.getByRole('button',{name:'Save assignment'}).click();await page.waitForFunction(name=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('staff@example.invalid')&&b.textContent.includes(name)),'Test role '+viewport.width);
  const roleCard=page.locator('article').filter({has:page.getByRole('heading',{name:'Test role '+viewport.width})});await roleCard.getByRole('button',{name:'Delete role'}).click();await page.getByRole('heading',{name:'Test role '+viewport.width}).waitFor({state:'hidden'});await page.getByRole('button',{name:'Role history',exact:true}).click();const history=page.locator('section').filter({has:page.getByRole('heading',{name:'Role history'})});await history.getByText('Role deleted',{exact:false}).first().waitFor();await history.getByText('Users unassigned: 1').first().waitFor();await page.close();
 }
 console.log('PASS: role creation, assignment, deletion and history on desktop and mobile');
}finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
