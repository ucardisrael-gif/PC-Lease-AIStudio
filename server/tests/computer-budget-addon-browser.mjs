import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {saveCommissionRate} from '../dealer-commission-rates.mjs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';import {createServer} from 'node:net';import {request as httpRequest} from 'node:http';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createRequire} from 'node:module';
import EmbeddedPostgres from 'embedded-postgres';import express from 'express';import {openDatabase} from '../database.mjs';import {register} from '../auth.mjs';import {seedCatalog} from '../catalog.mjs';import {saveDealer} from '../dealers.mjs';
const require=createRequire(import.meta.url),{chromium,request}=require(process.env.PC_LEASE_PLAYWRIGHT_PATH||'playwright');
async function port(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const dir=mkdtempSync(join(tmpdir(),'pclease-lease-ui-')),dbPort=await port(),apiPort=await port(),frontPort=await port(),password=randomBytes(24).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(dir,'db'),port:dbPort,user:'pclease_test',password,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8'],persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
async function checkFulfillment(baseURL, order, dealerId, width) {
 const admin=await request.newContext({baseURL,extraHTTPHeaders:{origin:'http://127.0.0.1:3000'}});
 try {
  async function send(path,data) {
   const response=data===undefined?await admin.get(path):await admin.post(path,{data});
   if(!response.ok()) assert.fail(`${path}: HTTP ${response.status()} ${await response.text()}`);
   return response;
  }
  const json=async (path,data)=>(await send(path,data)).json();
  await json('/api/auth/login',{email:'admin@example.invalid',password:'test-password-123'});
  const orderSearch='/api/admin/requests?search='+order.id;
  const before=(await json(orderSearch)).requests.find(row=>row.id===order.id);
  assert.equal(before.status,'new');
  const document=await send(`/api/admin/requests/${order.id}/pdf?lang=he`);
  assert.equal((await document.body()).subarray(0,5).toString(),'%PDF-');
  await json('/api/admin/requests/status',{id:order.id,expectedStatus:'new',expectedRevision:'0',status:'reviewed'});
  await json('/api/admin/requests/dealer',{id:order.id,dealerId,expectedVersion:1});
  const stock='/api/admin/inventory';
  const {products}=await json(stock+'/products');
  const {products:catalog}=await json('/api/admin/products');
  const selection=order.tariff_snapshot_json.quote.items;
  for (const [lineIndex,item] of selection.entries()) {
   const model=catalog.find(product=>product.slug===item.productSlug);
   const product=products.find(product=>product.id===model?.id);
   assert.ok(product,`Inventory product missing for ${item.productSlug}`);
   const serialNumber=`RELEASE-${width}-${lineIndex}`;
   const assetInput={serialNumber,productId:product.id,location:'Test shelf',conditionNotes:''};
   const {asset}=await json(stock,{...assetInput,status:'received'});
   await json(stock,{...assetInput,id:asset.id,version:asset.version,status:'available'});
   const reservation={requestId:order.id,serialNumber,lineIndex,action:'reserve',operationId:randomUUID()};
   const {id:reservationId}=await json(stock+'/reservations',reservation);
   await json(stock+'/reservations',{requestId:order.id,reservationId,action:'issue',notes:'Test handover',operationId:randomUUID()});
  }
  const fulfilled=(await json(orderSearch)).requests.find(row=>row.id===order.id);
  assert.equal(fulfilled.status,'reviewed');
  assert.deepEqual(fulfilled.inventory_summary,{reserved:0,issued:2,replacements:0});
  const occurredOn=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const payment={id:randomUUID(),requestId:order.id,kind:'payment',amountMinor:10000,occurredOn,reference:'Test payment',notes:''};
  const balanceUrl='/api/admin/dealers/commission-balance?dealerId='+dealerId;
  const beforePayment=await json(balanceUrl);
  assert.ok(!beforePayment.entries.some(entry=>entry.requestId===order.id));
  await json('/api/admin/finance',payment);
  await json('/api/admin/finance',payment);
  const paid=await json(balanceUrl);
  assert.equal(paid.complete,true);
  assert.equal(paid.entries.filter(entry=>entry.paymentId===payment.id).length,1);
  assert.equal(paid.entries.find(entry=>entry.paymentId===payment.id).commissionMinor,1000);
  const refund={...payment,id:randomUUID(),kind:'refund',amountMinor:4000,reference:'Test refund'};
  await json('/api/admin/finance',refund);
  await json('/api/admin/dealers/commission-refund',{refundId:refund.id,paymentId:payment.id});
  const adjusted=await json(balanceUrl);
  assert.equal(adjusted.complete,true);
  assert.equal(adjusted.entries.find(entry=>entry.paymentId===payment.id).commissionMinor,600);
  console.log(`PASS ${width}px: order and PDF → review → two serial-numbered devices issued → ₪10 commission → ₪6 after linked refund`);
 } finally {
  await admin.dispose();
 }
}
let db,api,browser,front;try{
 await pg.initialise();await pg.start();const dbUrl=`postgresql://pclease_test:${password}@127.0.0.1:${dbPort}/postgres`;db=await openDatabase(dbUrl);await seedCatalog(db);await db.query("UPDATE products SET details_json=jsonb_set(details_json,'{detailsConfirmed}','true'::jsonb) WHERE slug='dell-latitude-5420'");const testAdmin=await register(db,'admin@example.invalid','test-password-123','admin');await register(db,'customer@example.invalid','test-password-123');const dealerUser=await register(db,'dealer@example.invalid','test-password-123');const dealer=await saveDealer(db,testAdmin.id,{id:randomUUID(),version:0,name:'Fixture dealer',contactName:'',email:'',phone:'',notes:'',active:true});await db.query('INSERT INTO dealer_user_access(user_id,dealer_id) VALUES($1,$2)',[dealerUser.id,dealer.id]);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await saveCommissionRate(db,testAdmin.id,{dealerId:dealer.id,percentHundredths:1000,effectiveOn:today});
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
 await card.getByText('Memory',{exact:true}).waitFor();await card.getByText('16 GB RAM',{exact:false}).first().waitFor();
 await card.getByRole('link',{name:'Full specifications'}).click();
 await page.getByRole('dialog').getByText('Memory',{exact:true}).waitFor();await page.getByRole('dialog').getByText('Fixture field').waitFor();await page.getByRole('dialog').getByText('Fixture value').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close dialog'}).click();
 await page.goto('http://127.0.0.1:'+frontPort+'/');
 const picker=page.locator('#models');
 await picker.getByRole('button',{name:'Laptops',exact:true}).click();
 await picker.locator('summary').filter({hasText:'Processor'}).click();const cpuFilter=picker.getByRole('group',{name:'Processor'});await cpuFilter.getByRole('checkbox',{name:'I5'}).check();await cpuFilter.getByRole('checkbox',{name:'I7'}).check();if(!(await cpuFilter.getByRole('checkbox',{name:'I5'}).isChecked())||!(await cpuFilter.getByRole('checkbox',{name:'I7'}).isChecked()))throw Error('Multiple CPUs not selected');await cpuFilter.locator('legend').click();if(await cpuFilter.isVisible())throw Error('Filter did not close on blank panel');await picker.locator('summary').filter({hasText:'Processor'}).click();if(!(await cpuFilter.getByRole('checkbox',{name:'I5'}).isChecked()))throw Error('Filter selection was lost');await cpuFilter.getByRole('button',{name:'All'}).click();await picker.getByRole('heading').first().click();if(await cpuFilter.isVisible())throw Error('Filter did not close outside');
 await picker.locator('summary').filter({hasText:'Price'}).click();const priceFilter=picker.getByRole('group',{name:'Monthly lease price per computer'});await priceFilter.getByRole('checkbox',{name:'₪99'}).check();
 await picker.getByText('₪99 / month').first().waitFor();
 if(await picker.getByRole('button',{name:/Add .*Latitude 5420/}).count())throw Error('Budget filter includes expensive model');
 await picker.getByRole('button',{name:/^Add .*EliteBook 840 G4/}).click();await picker.getByRole('button',{name:/^Remove .*EliteBook 840 G4/}).click();await picker.getByRole('button',{name:/^Add .*EliteBook 840 G4/}).click();await picker.locator('summary').filter({hasText:'Price'}).click();await priceFilter.getByRole('checkbox',{name:'₪99'}).uncheck();await picker.locator('summary').filter({hasText:'Price'}).click();
 await picker.getByRole('button',{name:'Desktops',exact:true}).click();const desktopCard=picker.locator('article').filter({hasText:'ThinkCentre M720q'});await desktopCard.getByText(/RAM/).waitFor();await picker.getByRole('button',{name:/^Add .*ThinkCentre M720q/}).click();
 await picker.getByRole('button',{name:/Continue/}).click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 if(await dialog.locator('header').count()!==1||await dialog.locator('footer').count()!==1)throw Error('Site header or footer missing from checkout');
 await dialog.getByRole('button',{name:'Back',exact:true}).click();await dialog.waitFor({state:'hidden'});await picker.getByRole('button',{name:/Continue/}).click();await dialog.waitFor();
 await dialog.getByRole('button',{name:/Enlarge image:.*EliteBook/}).click();await page.getByRole('dialog',{name:'Enlarged image'}).waitFor();await page.keyboard.press('Escape');if(await page.getByRole('dialog',{name:'Enlarged image'}).count())throw Error('Image viewer did not close');
 if(width===390)await page.screenshot({path:'tmp/order-mobile-step1.png'});
 await dialog.getByText('Monthly lease total: ₪198').waitFor();await dialog.locator('dd:visible').filter({hasText:'RAM'}).first().waitFor();await dialog.getByRole('button',{name:/^Continue/}).click();
 await dialog.locator('h3:visible').filter({hasText:'Selected computers'}).waitFor();await dialog.locator('dd:visible').filter({hasText:'RAM'}).first().waitFor();
 if(width===390)await page.screenshot({path:'tmp/order-mobile-step2.png'});
 await dialog.locator('summary').filter({hasText:'Category'}).click();await dialog.getByRole('group',{name:'Category'}).getByRole('checkbox',{name:'Monitors'}).check();await dialog.getByRole('checkbox',{name:/Test screen/}).check();await dialog.locator('summary').filter({hasText:'Category'}).click();await dialog.getByRole('group',{name:'Category'}).getByRole('checkbox',{name:'Antivirus'}).check();await dialog.getByRole('button',{name:'All',exact:true}).last().click();if(!(await dialog.getByRole('checkbox',{name:/Test screen/}).isChecked()))throw Error('Selection lost after filter');await dialog.getByText('Monthly total: ₪218').last().waitFor();
 await dialog.getByRole('button',{name:/^Continue/}).click();
 if(width===390)await page.screenshot({path:'tmp/order-mobile-step3.png'});
 await dialog.getByText(/EliteBook 840 G4/).last().waitFor();await dialog.getByText(/ThinkCentre M720q/).last().waitFor();await dialog.locator('h3:visible').filter({hasText:'Selected computers'}).waitFor();await dialog.locator('dd:visible').filter({hasText:'RAM'}).first().waitFor();
 await dialog.evaluate(el=>{el.scrollTop=el.scrollHeight/2});await page.waitForTimeout(200);const navBox=await dialog.getByRole('navigation',{name:'Order steps'}).boundingBox();const backBox=await dialog.getByRole('button',{name:'Back',exact:true}).boundingBox();if(!navBox||!backBox||navBox.y<0||navBox.y+navBox.height>900||backBox.y<0||backBox.y+backBox.height>900)throw Error('Order navigation not visible while scrolling');
 await dialog.getByPlaceholder('שם החברה / עסק בע״מ').fill('Fixture company');
 await dialog.getByPlaceholder('שם מלא של איש הקשר').fill('Fixture contact');
 await dialog.getByPlaceholder('name@company.com').fill('mixed@example.invalid');
 await dialog.getByPlaceholder('050-1234567').fill('0500000000');
 const pdf=page.waitForResponse(r=>r.url().endsWith('/api/offer/pdf'));await dialog.getByRole('button',{name:/Download.*PDF/}).click();if(!(await pdf).ok())throw Error('PDF failed');
 await dialog.getByRole('button',{name:'Order',exact:true}).click();await dialog.getByRole('heading',{name:'Order received'}).waitFor();
 const row=(await db.query("SELECT id, tariff_snapshot_json FROM requests WHERE contact_json->>'email'='mixed@example.invalid' ORDER BY created_at DESC LIMIT 1")).rows[0];
 if(!row || row.tariff_snapshot_json.quote.monthlyMinor!==21800)throw Error('Incorrect saved total');
 const saved=JSON.stringify(row.tariff_snapshot_json);if(!saved.includes('elitebook')||!saved.includes('m720')||!saved.includes('fixture-screen'))throw Error('Both models must be saved');
 await checkFulfillment('http://127.0.0.1:'+apiPort,row,dealer.id,width);
 await page.close();
 }console.log('PASS: price filter, mixed computer order, add-on, PDF and saved data on desktop and mobile');
 }finally{if(browser)await browser.close();if(front)await new Promise(r=>front.close(r));if(api)api.kill();if(db)await db.end();await pg.stop();rmSync(dir,{recursive:true,force:true});}
