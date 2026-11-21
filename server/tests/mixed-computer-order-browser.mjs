import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';import {createServer} from 'node:net';import {request as httpRequest} from 'node:http';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createRequire} from 'node:module';
import EmbeddedPostgres from 'embedded-postgres';import express from 'express';import {openDatabase} from '../database.mjs';import {register} from '../auth.mjs';import {seedCatalog} from '../catalog.mjs';import {saveDealer} from '../dealers.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PC_LEASE_PLAYWRIGHT_PATH||'playwright');
async function port(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const dir=mkdtempSync(join(tmpdir(),'pclease-lease-ui-')),dbPort=await port(),apiPort=await port(),frontPort=await port(),password=randomBytes(24).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port:dbPort,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
let db,api,browser,front;try{
 await pg.initialise();await pg.start();const dbUrl=`postgresql://pclease_test:${password}@127.0.0.1:${dbPort}/postgres`;db=await openDatabase(dbUrl);await seedCatalog(db);await db.query("UPDATE products SET details_json=jsonb_set(details_json,'{detailsConfirmed}','true'::jsonb) WHERE slug='dell-latitude-5420'");const testAdmin=await register(db,'admin@example.invalid','test-password-123','admin');await register(db,'customer@example.invalid','test-password-123');const dealerUser=await register(db,'dealer@example.invalid','test-password-123');const dealer=await saveDealer(db,testAdmin.id,{id:randomUUID(),version:0,name:'Fixture dealer',contactName:'',email:'',phone:'',notes:'',active:true});await db.query('INSERT INTO dealer_user_access(user_id,dealer_id) VALUES($1,$2)',[dealerUser.id,dealer.id]);
 await db.query("INSERT INTO lease_addons(id,category,name_he,name_en,terms_he,terms_en,price,billing,active) VALUES('fixture-screen','screen','מסך לבדיקה','Test screen','תנאי בדיקה','Test terms',20,'month',true),('fixture-antivirus','antivirus','אנטי וירוס לבדיקה','Test antivirus','תנאי בדיקה','Test terms',10,'month',true)");
 const env={...process.env,PC_LEASE_DATABASE_URL:dbUrl,PC_LEASE_SERVER_PORT:String(apiPort)};delete env.PC_LEASE_MAIL_USER;delete env.PC_LEASE_MAIL_APP_PASSWORD;
 api=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(api.stdout,'data'),once(api,'exit').then(()=>{throw Error('API failed');})]);
 const app=express();app.use('/api',(req,res)=>{const headers={...req.headers};if(headers.origin===`http://127.0.0.1:${frontPort}`)headers.origin='http://127.0.0.1:3000';const f=httpRequest({hostname:'127.0.0.1',port:apiPort,path:'/api'+req.url,method:req.method,headers},u=>{res.writeHead(u.statusCode,u.headers);u.pipe(res);});f.on('error',()=>res.status(502).end());req.pipe(f);});app.use(express.static('dist'));app.get(['/catalog','/contact'],(_req,res)=>res.sendFile(resolve('dist/index.html')));front=app.listen(frontPort,'127.0.0.1');await once(front,'listening');
 const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});


 await db.query("UPDATE products SET details_json = jsonb_set(jsonb_set(details_json, '{customSpecs}', $1::jsonb), '{detailsConfirmed}', 'true'::jsonb) WHERE slug='hp-elitebook-840-g4'",[JSON.stringify([{nameHe:'בדיקה',valueHe:'ערך בדיקה',nameEn:'Fixture field',valueEn:'Fixture value'}])]);
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
 await page.addInitScript(()=>{sessionStorage.setItem('pc-lease-lang','en');localStorage.setItem('pc-lease-cookie-preferences-v1',JSON.stringify({version:1,analytics:false,marketing:false,savedAt:Date.now()}))});
 await page.goto('http://127.0.0.1:'+frontPort+'/catalog');
 await page.getByRole('heading',{name:'EliteBook 840 G4'}).waitFor();
 const card=page.locator('div').filter({has:page.getByRole('heading',{name:'EliteBook 840 G4'})}).filter({has:page.getByRole('link',{name:'Full specifications'})}).last();
 await card.getByRole('link',{name:'Full specifications'}).click();
 await page.getByRole('dialog').getByText('Fixture field').waitFor();await page.getByRole('dialog').getByText('Fixture value').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close dialog'}).click();
 await page.goto('http://127.0.0.1:'+frontPort+'/');
 await page.getByRole('region',{name:'Choose a lease plan'}).getByRole('button',{name:/Silver/}).click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 await dialog.getByRole('button',{name:'Laptops',exact:true}).click();
 await dialog.getByRole('button',{name:/Product details .*EliteBook 840 G4/}).click();
 const details=page.getByRole('dialog').last();await details.getByRole('heading',{name:/EliteBook/}).waitFor();await details.getByRole('button',{name:'Close dialog'}).click();
 await dialog.getByRole('group',{name:'Models'}).getByRole('button',{name:/^Add .*EliteBook 840 G4/}).click();
 await dialog.getByRole('button',{name:'Desktops',exact:true}).click();
 await dialog.getByRole('group',{name:'Models'}).getByRole('button',{name:/^Add .*ThinkCentre M720q/}).click();
 await dialog.getByText('Monthly lease total: ₪198').waitFor();
 await dialog.getByRole('button',{name:/^Continue/}).click();
 await dialog.getByRole('button',{name:/^Continue/}).click();
 await dialog.getByText(/EliteBook 840 G4/).last().waitFor();await dialog.getByText(/ThinkCentre M720q/).last().waitFor();
 await dialog.getByPlaceholder('שם החברה / עסק בע״מ').fill('Fixture company');
 await dialog.getByPlaceholder('שם מלא של איש הקשר').fill('Fixture contact');
 await dialog.getByPlaceholder('name@company.com').fill('mixed@example.invalid');
 await dialog.getByPlaceholder('050-1234567').fill('0500000000');
 const pdf=page.waitForResponse(r=>r.url().endsWith('/api/offer/pdf'));await dialog.getByRole('button',{name:/Download.*PDF/}).click();if(!(await pdf).ok())throw Error('PDF failed');
 await dialog.getByRole('button',{name:'Order',exact:true}).click();await dialog.getByRole('heading',{name:'Order received'}).waitFor();
 const row=(await db.query("SELECT tariff_snapshot_json FROM requests WHERE contact_json->>'email'='mixed@example.invalid' ORDER BY created_at DESC LIMIT 1")).rows[0];
 if(!row || row.tariff_snapshot_json.quote.monthlyMinor!==19800)throw Error('Incorrect saved total');
 const saved=JSON.stringify(row.tariff_snapshot_json);if(!saved.includes('elitebook')||!saved.includes('m720'))throw Error('Both models must be saved');
 await page.close();
 }console.log('PASS: mixed laptop and desktop order, price, PDF and saved data on desktop and mobile');
 }finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
