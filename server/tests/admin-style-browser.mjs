import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {saveDealer} from '../dealers.mjs';
import {saveMultiQuote} from '../multi-quote.mjs';
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
 const email='admin@example.invalid',pass='test-password-123';const admin=await register(db,email,pass,'admin');await register(db,'staff@example.invalid',pass);
 const da=await saveDealer(db,admin.id,{id:randomUUID(),version:0,name:'Visible dealer',contactName:'',email:'',phone:'',notes:'',active:true});const other=await saveDealer(db,admin.id,{id:randomUUID(),version:0,name:'Other dealer',contactName:'',email:'',phone:'',notes:'',active:true});const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];for(const [dealerId,company] of [[da.id,'Visible customer'],[other.id,'Hidden customer']]){const id=randomUUID();await saveMultiQuote(db,{id,companyName:company,contactName:company,email:'test@example.invalid',phone:'12345',lines:[{productSlug:product.slug,productVersion:product.edit_version,mode:'lease',quantity:1}]});await db.query('UPDATE requests SET dealer_id=$1 WHERE id=$2',[dealerId,id]);}

 const env={...process.env,PC_LEASE_DATABASE_URL:dbUrl,PC_LEASE_SERVER_PORT:String(apiPort)};delete env.PC_LEASE_MAIL_USER;delete env.PC_LEASE_MAIL_APP_PASSWORD;delete env.PC_LEASE_HOSTED;
 api=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(api.stdout,'data'),once(api,'exit').then(()=>{throw Error('API failed');})]);
 const app=express();app.use('/api',(req,res)=>{const headers={...req.headers};if(headers.origin===`http://127.0.0.1:${frontPort}`)headers.origin='http://127.0.0.1:3000';const forward=httpRequest({hostname:'127.0.0.1',port:apiPort,path:'/api'+req.url,method:req.method,headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});forward.on('error',()=>res.status(502).end());req.pipe(forward);});app.use(express.static('dist'));front=app.listen(frontPort,'127.0.0.1');await once(front,'listening');
 const path='C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch({headless:true,...(existsSync(path)?{executablePath:path}:{})});


 for(const viewport of [{width:1440,height:900},{width:390,height:844}])for(const language of ['en','he']){
 const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);await page.addInitScript(lang=>sessionStorage.setItem('pc-lease-lang',lang),language);await page.goto(`http://127.0.0.1:${frontPort}/`);await page.getByRole('button',{name:language==='he'?'כניסה':'Sign in',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel(language==='he'?'דוא״ל':'Email',{exact:true}).fill(email);await dialog.getByLabel(language==='he'?'סיסמה (לפחות 12 תווים)':'Password (at least 12 characters)').fill(pass);await dialog.getByRole('button',{name:language==='he'?'התחברות':'Sign in',exact:true}).first().click();await page.getByRole('button',{name:language==='he'?'ניהול':'Administration',exact:true}).click();
 if(viewport.width>=768)await page.locator('aside.admin-sidebar').waitFor();
 for(let index=0;index<11;index++){
  if(viewport.width<768)await page.getByRole('button',{name:language==='he'?'תפריט ניהול':'Admin menu'}).click();
  const buttons=page.locator('aside.admin-sidebar > button:visible');const total=await buttons.count();if(total<10)throw Error('Admin navigation did not load: '+total);if(index>=total)break;const b=buttons.nth(index);const size=await b.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));if(size<14||size>=15)throw Error('Sidebar font is smaller than requested: '+size);await b.click();await page.waitForTimeout(180);await page.screenshot({path:`tmp/admin-style-${language}-${viewport.width}-${index}.png`});
 }
 if(viewport.width===1440&&language==='en'){await page.getByTitle('Switch to dark mode').click();await page.screenshot({path:'tmp/admin-style-dark.png'});}
 await page.close();
 }
 console.log('PASS: administrative navigation and readable sidebar on desktop and mobile, English and Hebrew');
}finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
