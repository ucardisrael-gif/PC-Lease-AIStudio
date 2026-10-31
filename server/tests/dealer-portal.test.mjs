import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {openDatabase} from '../database.mjs';
import {register} from '../auth.mjs';
import {seedCatalog} from '../catalog.mjs';
import {saveMultiQuote} from '../multi-quote.mjs';
import {saveDealer} from '../dealers.mjs';
import {saveOrganization} from '../admin-organizations.mjs';
import {createFinancialEntry,correctFinancialAmount,correctFinancialDate} from '../finance.mjs';
import {snapshotPaymentCommission} from '../commission-accrual.mjs';
import {attachCommissionRefund} from '../commission-refunds.mjs';
import {commissionBalance} from '../commission-balance.mjs';

test('dealer portal isolates customers and orders, and access changes take effect for existing sessions',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);await seedCatalog(db);
 const admin=await register(db,randomUUID()+'@example.invalid','test-password-123'),a=await register(db,randomUUID()+'@example.invalid','test-password-123'),b=await register(db,randomUUID()+'@example.invalid','test-password-123'),visitor=await register(db,randomUUID()+'@example.invalid','test-password-123');await db.query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);
 async function dealer(name){return saveDealer(db,admin.id,{id:randomUUID(),version:0,name,contactName:'',email:'',phone:'',notes:'',active:true});}const da=await dealer('Dealer A'),dbb=await dealer('Dealer B');
 const p=(await db.query('SELECT slug,edit_version FROM products WHERE published=true ORDER BY slug LIMIT 1')).rows[0];
 async function order(company,dealerId){const id=randomUUID();await saveMultiQuote(db,{id,lines:[{productSlug:p.slug,productVersion:p.edit_version,mode:'lease',quantity:1}],companyName:company,contactName:company+' contact',email:company.toLowerCase()+'@example.invalid',phone:'12345'});await db.query('UPDATE requests SET dealer_id=$1 WHERE id=$2',[dealerId,id]);return id;}const oa=await order('OnlyA',da.id),ob=await order('OnlyB',dbb.id);await order('Unassigned',null);
 const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));const server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PC_LEASE_SERVER_PORT:String(port),PC_LEASE_DATABASE_URL:process.env.PC_LEASE_TEST_DATABASE_URL},stdio:['ignore','pipe','inherit']});
 try{
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server exited');})]);const base=`http://127.0.0.1:${port}`,origin='http://127.0.0.1:3000';
  async function login(user){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:user.email,password:'test-password-123'})});assert.equal(r.status,200);return {origin,'content-type':'application/json',cookie:r.headers.get('set-cookie')};}
  const ah=await login(admin),ha=await login(a),hb=await login(b),hv=await login(visitor);const post=(headers,data)=>fetch(base+'/api/admin/dealer-access',{method:'POST',headers,body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/api/dealer/orders',{headers:hv})).status,403);
  assert.equal((await post(ha,{userId:a.id,dealerId:da.id,expectedVersion:1})).status,403);
  assert.equal((await post({...ah,origin:'https://evil.invalid'},{userId:a.id,dealerId:da.id,expectedVersion:1})).status,403);
  assert.equal((await post(ah,{userId:a.id,dealerId:da.id,expectedVersion:1})).status,200);assert.equal((await post(ah,{userId:b.id,dealerId:dbb.id,expectedVersion:1})).status,200);
  assert.equal((await fetch(base+'/api/admin/dealers/commission-balance?dealerId='+da.id,{headers:ha})).status,403);
  assert.equal((await fetch(base+'/api/admin/dealers/commission-work?dealerId='+da.id,{headers:hv})).status,403);
  assert.equal((await fetch(base+'/api/admin/dealers/commission-work?dealerId='+da.id,{headers:ah})).status,200);
  const rateUrl=base+'/api/admin/dealers/commission-rates',today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const rateData={dealerId:da.id,percentHundredths:1000,effectiveOn:today};
  const ratePost=(headers,data)=>fetch(rateUrl,{method:'POST',headers,body:JSON.stringify(data)});
  assert.equal((await ratePost(ha,rateData)).status,403);
  assert.equal((await ratePost(ah,{...rateData,percentHundredths:10001})).status,400);
  assert.equal((await ratePost(ah,{...rateData,effectiveOn:'2000-01-01'})).status,409);
  assert.equal((await ratePost(ah,rateData)).status,200);
  assert.equal((await ratePost(ah,rateData)).status,409);
  assert.equal((await fetch(rateUrl+'?dealerId='+da.id,{headers:ha})).status,403);
  const rateList=await (await fetch(rateUrl+'?dealerId='+da.id,{headers:ah})).json();
  assert.equal(rateList.rates[0].percent_hundredths,1000);
  await assert.rejects(db.query('DELETE FROM dealer_commission_rates WHERE id=$1',[rateList.rates[0].id]),/append only/);
  const manualUrl=base+'/api/admin/dealers/commission-manual',manual={id:randomUUID(),dealerId:da.id,kind:'payout',amountMinor:1000,occurredOn:today,reason:'Test payout recorded'};
  const manualPost=(headers,data)=>fetch(manualUrl,{method:'POST',headers,body:JSON.stringify(data)});
  assert.equal((await manualPost(ha,manual)).status,403);
  assert.equal((await manualPost(ah,manual)).status,200);
  assert.equal((await manualPost(ah,manual)).status,200);
  assert.equal((await manualPost(ah,{...manual,amountMinor:1001})).status,409);
  assert.equal((await manualPost(ah,{...manual,id:randomUUID(),amountMinor:-1})).status,400);
  const manualList=await (await fetch(manualUrl+'?dealerId='+da.id,{headers:ah})).json();
  assert.equal(manualList.entries.length,1);assert.equal(manualList.entries[0].amount_minor,1000);
  await assert.rejects(db.query('DELETE FROM dealer_commission_manual_entries WHERE id=$1',[manual.id]),/append only/);
  assert.equal((await (await fetch(base+'/api/auth/me',{headers:ha})).json()).user.dealerAccess,true);
  const roleGrant=await fetch(base+'/api/admin/access-roles/assign',{method:'POST',headers:ah,body:JSON.stringify({userId:a.id,roles:['sales'],expectedRoles:[],expectedVersion:1})});assert.equal(roleGrant.status,409);
  const permissionGrant=await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:a.id,permissions:['orders'],expectedPermissions:[],expectedRevision:'0:0:0'})});assert.equal(permissionGrant.status,409);
  assert.equal((await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:visitor.id,permissions:['orders'],expectedPermissions:[],expectedRevision:'0:0:0'})})).status,200);
  assert.equal((await post(ah,{userId:visitor.id,dealerId:da.id,expectedVersion:1})).status,409);

  const ar=await (await fetch(base+'/api/dealer/orders?dealerId='+dbb.id,{headers:ha})).json(),br=await (await fetch(base+'/api/dealer/orders',{headers:hb})).json();assert.deepEqual(ar.orders.map(x=>x.id),[oa]);assert.deepEqual(br.orders.map(x=>x.id),[ob]);assert.equal(JSON.stringify(ar).includes('OnlyB'),false);assert.equal('contractTotalMinor' in (ar.orders[0].items[0]||{}),false);
  const clients=await (await fetch(base+'/api/dealer/clients?dealerId='+dbb.id,{headers:ha})).json();assert.deepEqual(clients.clients.map(x=>x.company),['OnlyA']);assert.equal((await fetch(base+'/api/dealer/orders?before='+ob,{headers:ha})).status,400);assert.equal((await fetch(base+'/api/admin/requests',{headers:ha})).status,403);assert.equal((await fetch(base+'/api/admin/users',{headers:ha})).status,403);

  const ca=await register(db,randomUUID()+'@example.invalid','test-password-123'),cb=await register(db,randomUUID()+'@example.invalid','test-password-123');
  await db.query("UPDATE users SET first_name=CASE WHEN id=$1 THEN 'ClientAlpha' ELSE 'ClientBeta' END WHERE id=ANY($2::text[])",[ca.id,[ca.id,cb.id]]);
  const createCompany=name=>saveOrganization(db,{name,registrationNumber:'',contactName:'',email:'',phone:'',address:''},admin.id);
  const orgA=await createCompany('CompanyAlpha'),orgB=await createCompany('CompanyBeta');
  const link=(headers,kind,id,dealerId,expectedVersion)=>fetch(base+'/api/admin/dealer-client',{method:'POST',headers,body:JSON.stringify({kind,id,dealerId,expectedVersion})});
  assert.equal((await link(ha,'user',ca.id,da.id,1)).status,403);
  assert.equal((await link({...ah,origin:'https://evil.invalid'},'organization',orgA.id,da.id,1)).status,403);
  assert.equal((await link(ah,'user',a.id,da.id,1)).status,409);
  for(const [kind,id,partner] of [['user',ca.id,da.id],['user',cb.id,dbb.id],['organization',orgA.id,da.id],['organization',orgB.id,dbb.id]])assert.equal((await link(ah,kind,id,partner,1)).status,200);
  const caPage=await (await fetch(base+'/api/dealer/clients',{headers:ha})).json(),cbPage=await (await fetch(base+'/api/dealer/clients',{headers:hb})).json();
  assert.ok(caPage.clients.some(x=>x.contact==='ClientAlpha'&&x.source==='user'));assert.ok(caPage.clients.some(x=>x.company==='CompanyAlpha'&&x.source==='organization'));assert.equal(JSON.stringify(caPage).includes('ClientBeta'),false);assert.equal(JSON.stringify(caPage).includes('CompanyBeta'),false);
  assert.ok(cbPage.clients.some(x=>x.contact==='ClientBeta'));assert.equal(JSON.stringify(cbPage).includes('ClientAlpha'),false);assert.equal(JSON.stringify(cbPage).includes('CompanyAlpha'),false);

  // Full lifecycle: assign a client before creating an order, transfer both links,
  // then revoke them. All reads use the dealers' already established sessions.
  const lifecycle=await register(db,randomUUID()+'@example.invalid','test-password-123');
  await db.query("UPDATE users SET first_name='LifecycleClient' WHERE id=$1",[lifecycle.id]);
  assert.equal((await link(ah,'user',lifecycle.id,da.id,1)).status,200);
  const dealerData=async(headers,path)=>(await (await fetch(base+path,{headers})).json());
  assert.ok(JSON.stringify(await dealerData(ha,'/api/dealer/clients')).includes('LifecycleClient'));
  assert.equal(JSON.stringify(await dealerData(hb,'/api/dealer/clients')).includes('LifecycleClient'),false);
  const lifecycleOrder=randomUUID();
  await saveMultiQuote(db,{id:lifecycleOrder,lines:[{productSlug:p.slug,productVersion:p.edit_version,mode:'lease',quantity:1}],companyName:'LifecycleOrder',contactName:'LifecycleClient',email:lifecycle.email,phone:'12345'});
  const orderLink=(path,data)=>fetch(base+path,{method:'POST',headers:ah,body:JSON.stringify(data)});
  assert.equal((await orderLink('/api/admin/requests/customer',{id:lifecycleOrder,userId:lifecycle.id,expectedVersion:1})).status,200);
  assert.equal((await orderLink('/api/admin/requests/dealer',{id:lifecycleOrder,dealerId:da.id,expectedVersion:1})).status,200);
  const paymentId=randomUUID();

  try{await createFinancialEntry(db,admin.id,{id:paymentId,requestId:lifecycleOrder,kind:'payment',amountMinor:10000,occurredOn:today,notes:'',reference:''});}finally{}
  assert.equal((await db.query('SELECT commission_minor FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId])).rows[0].commission_minor,1000);
  const cx=await db.connect();try{await cx.query('BEGIN');const saved=await snapshotPaymentCommission(cx,paymentId);assert.equal(saved.status,'recorded');assert.equal(saved.snapshot.commission_minor,1000);assert.equal((await snapshotPaymentCommission(cx,paymentId)).snapshot.payment_id,paymentId);await cx.query('COMMIT');}finally{cx.release();}
  await assert.rejects(db.query('DELETE FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId]),/append only/);
  const refundId=randomUUID();
  await createFinancialEntry(db,admin.id,{id:refundId,requestId:lifecycleOrder,kind:'refund',amountMinor:4000,occurredOn:today,notes:'',reference:''});
  await assert.rejects(attachCommissionRefund(db,a.id,{refundId,paymentId}),/forbidden/);
  assert.deepEqual(await attachCommissionRefund(db,admin.id,{refundId,paymentId}),{refundId,paymentId});
  assert.deepEqual(await attachCommissionRefund(db,admin.id,{refundId,paymentId}),{refundId,paymentId});
  const balance=await commissionBalance(db,da.id);assert.equal(balance.complete,true);assert.equal(balance.accruedMinor,'600');assert.equal(balance.paidMinor,'1000');assert.equal(balance.balanceMinor,'-400');
  const sameDayRate={...rateData,percentHundredths:1500,operationId:randomUUID()};
  assert.equal((await ratePost(ah,sameDayRate)).status,200);assert.equal((await ratePost(ah,sameDayRate)).status,200);
  assert.equal((await ratePost(ah,{...sameDayRate,percentHundredths:1400})).status,409);
  assert.equal((await db.query('SELECT commission_minor FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId])).rows[0].commission_minor,1000);
  const tomorrowDate=new Date(today+'T00:00:00Z');tomorrowDate.setUTCDate(tomorrowDate.getUTCDate()+1);const tomorrow=tomorrowDate.toISOString().slice(0,10);
  assert.equal((await ratePost(ah,{dealerId:da.id,percentHundredths:2000,effectiveOn:tomorrow})).status,200);
  const paymentTwo=randomUUID();try{await createFinancialEntry(db,admin.id,{id:paymentTwo,requestId:lifecycleOrder,kind:'payment',amountMinor:10000,occurredOn:tomorrow,notes:'',reference:''});}finally{}
  assert.equal((await db.query('SELECT commission_minor FROM commission_payment_snapshots WHERE payment_id=$1',[paymentId])).rows[0].commission_minor,1000);
  assert.equal((await db.query('SELECT commission_minor FROM commission_payment_snapshots WHERE payment_id=$1',[paymentTwo])).rows[0].commission_minor,2000);
  assert.equal((await commissionBalance(db,da.id)).balanceMinor,'1600');
  let refundCorrection;try{refundCorrection=await correctFinancialAmount(db,admin.id,{operationId:randomUUID(),entryId:refundId,amountMinor:3000});}finally{}
  assert.equal((await db.query('SELECT payment_id FROM commission_refund_links WHERE refund_id=$1',[refundCorrection.replacement_entry_id])).rows[0].payment_id,paymentId);
  assert.equal((await commissionBalance(db,da.id)).balanceMinor,'1700');
  let paymentCorrection,refundCorrection2;try{
   paymentCorrection=await correctFinancialAmount(db,admin.id,{operationId:randomUUID(),entryId:paymentId,amountMinor:12000});
   assert.equal((await commissionBalance(db,da.id)).balanceMinor,'1900');
   refundCorrection2=await correctFinancialAmount(db,admin.id,{operationId:randomUUID(),entryId:refundCorrection.replacement_entry_id,amountMinor:4000});
  }finally{}
  assert.equal((await commissionBalance(db,da.id)).balanceMinor,'1800');
  assert.equal((await db.query('SELECT payment_id FROM commission_refund_links WHERE refund_id=$1',[refundCorrection2.replacement_entry_id])).rows[0].payment_id,paymentCorrection.replacement_entry_id);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate()+1);const dayAfter=tomorrowDate.toISOString().slice(0,10);
  let dateCorrection;try{dateCorrection=await correctFinancialDate(db,admin.id,{operationId:randomUUID(),entryId:paymentTwo,occurredOn:dayAfter});}finally{}
  assert.equal((await db.query('SELECT commission_minor FROM commission_payment_snapshots WHERE payment_id=$1',[dateCorrection.replacement_entry_id])).rows[0].commission_minor,2000);
  assert.equal((await commissionBalance(db,da.id)).balanceMinor,'1800');
  let firstDateCorrection;try{await correctFinancialDate(db,admin.id,{operationId:randomUUID(),entryId:refundCorrection2.replacement_entry_id,occurredOn:dayAfter});firstDateCorrection=await correctFinancialDate(db,admin.id,{operationId:randomUUID(),entryId:paymentCorrection.replacement_entry_id,occurredOn:tomorrow});}finally{}
  assert.equal((await commissionBalance(db,da.id)).balanceMinor,'2600');
  const extraRefund=randomUUID();await createFinancialEntry(db,admin.id,{id:extraRefund,requestId:lifecycleOrder,kind:'refund',amountMinor:8001,occurredOn:dayAfter,notes:'',reference:''});
  await assert.rejects(attachCommissionRefund(db,admin.id,{refundId:extraRefund,paymentId:firstDateCorrection.replacement_entry_id}),/refund_exceeds_payment/);
  const unresolved=await commissionBalance(db,da.id);assert.equal(unresolved.complete,false);assert.equal(unresolved.balanceMinor,null);
  await assert.rejects(db.query('DELETE FROM commission_refund_links WHERE refund_id=$1',[refundId]),/append only/);
  const termsUrl=base+'/api/admin/dealers/commission-terms';
  const terms={requestId:lifecycleOrder,dealerId:da.id,expectedVersion:0,startsOn:null,endsOn:null};
  assert.equal((await fetch(termsUrl,{method:'POST',headers:ha,body:JSON.stringify(terms)})).status,403);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',{...terms,dealerId:dbb.id})).status,409);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',terms)).status,200);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',terms)).status,409);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',{...terms,expectedVersion:1,startsOn:'2026-12-01',endsOn:'2026-11-01'})).status,400);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',{...terms,expectedVersion:1,startsOn:'2026-11-01',endsOn:'2029-10-31'})).status,200);
  const savedTerms=await (await fetch(termsUrl+'?requestId='+lifecycleOrder,{headers:ah})).json();
  assert.equal(savedTerms.starts_on,'2026-11-01');assert.equal(savedTerms.ends_on,'2029-10-31');assert.equal(savedTerms.history.length,2);
  await assert.rejects(db.query('DELETE FROM dealer_commission_terms_history WHERE id=$1',[savedTerms.history[0].id]),/append only/);
  assert.ok((await dealerData(ha,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder));
  assert.equal((await dealerData(hb,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder),false);
  assert.equal((await link(ah,'user',lifecycle.id,dbb.id,2)).status,200);
  assert.equal(JSON.stringify(await dealerData(ha,'/api/dealer/clients')).includes('LifecycleClient'),false);
  assert.equal((await dealerData(ha,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder),false);
  assert.ok(JSON.stringify(await dealerData(hb,'/api/dealer/clients')).includes('LifecycleClient'));
  assert.equal((await dealerData(hb,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder),false);
  assert.equal((await orderLink('/api/admin/requests/dealer',{id:lifecycleOrder,dealerId:dbb.id,expectedVersion:2})).status,200);
  assert.equal((await orderLink('/api/admin/dealers/commission-terms',{...terms,dealerId:dbb.id,expectedVersion:0})).status,200);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM dealer_commission_terms WHERE request_id=$1',[lifecycleOrder])).rows[0].n,2);
  assert.ok((await dealerData(hb,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder));
  assert.equal((await orderLink('/api/admin/requests/dealer',{id:lifecycleOrder,dealerId:null,expectedVersion:3})).status,200);
  assert.equal((await link(ah,'user',lifecycle.id,null,3)).status,200);
  for(const headers of [ha,hb]){
   assert.equal(JSON.stringify(await dealerData(headers,'/api/dealer/clients')).includes('LifecycleClient'),false);
   assert.equal((await dealerData(headers,'/api/dealer/orders')).orders.some(x=>x.id===lifecycleOrder),false);
  }

  await db.query('UPDATE requests SET customer_user_id=$1 WHERE id=$2',[cb.id,oa]);
  assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/orders',{headers:ha})).json()).includes('OnlyA'),false);
  assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/clients',{headers:ha})).json()).includes('OnlyA'),false);
  assert.equal((await fetch(base+'/api/dealer/orders?before='+oa,{headers:ha})).status,400);
  await db.query('UPDATE requests SET customer_user_id=NULL,organization_id=$1 WHERE id=$2',[orgB.id,oa]);
  assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/orders',{headers:ha})).json()).includes('OnlyA'),false);
  await db.query('UPDATE requests SET organization_id=NULL WHERE id=$1',[oa]);
  assert.equal((await fetch(base+'/api/admin/dealer-client?kind=user&id='+ca.id,{headers:ha})).status,403);
  assert.equal((await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:ca.id,permissions:['orders'],expectedPermissions:[],expectedRevision:'0:0:0'})})).status,200);
  assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/clients',{headers:ha})).json()).includes('ClientAlpha'),false);
  const revision=(await db.query("SELECT COALESCE((SELECT max(id) FROM user_role_history WHERE user_id=$1),0)::text||':'||COALESCE((SELECT max(id) FROM staff_permission_history WHERE user_id=$1),0)::text||':'||COALESCE((SELECT max(id) FROM user_activation_history WHERE user_id=$1),0)::text AS revision",[ca.id])).rows[0].revision;
  assert.equal((await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:ca.id,permissions:[],expectedPermissions:['orders'],expectedRevision:revision})})).status,200);

  assert.equal((await link(ah,'user',ca.id,dbb.id,2)).status,200);assert.equal((await link(ah,'user',ca.id,da.id,2)).status,409);
  assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/clients',{headers:ha})).json()).includes('ClientAlpha'),false);assert.ok(JSON.stringify(await (await fetch(base+'/api/dealer/clients',{headers:hb})).json()).includes('ClientAlpha'));
  assert.equal((await link(ah,'organization',orgA.id,null,2)).status,200);assert.equal(JSON.stringify(await (await fetch(base+'/api/dealer/clients',{headers:ha})).json()).includes('CompanyAlpha'),false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM dealer_client_history WHERE user_id=$1',[ca.id])).rows[0].n,2);
  assert.equal((await post(ah,{userId:a.id,dealerId:dbb.id,expectedVersion:2})).status,200);
  const switched=await (await fetch(base+'/api/dealer/orders',{headers:ha})).json();assert.deepEqual(switched.orders.map(x=>x.id),[ob]);assert.equal(JSON.stringify(switched).includes('OnlyA'),false);
  assert.equal((await post(ah,{userId:a.id,dealerId:da.id,expectedVersion:3})).status,200);
  assert.equal((await post(ah,{userId:a.id,dealerId:null,expectedVersion:1})).status,409);assert.equal((await post(ah,{userId:a.id,dealerId:null,expectedVersion:4})).status,200);assert.equal((await fetch(base+'/api/dealer/orders',{headers:ha})).status,403);assert.equal((await (await fetch(base+'/api/auth/me',{headers:ha})).json()).user.dealerAccess,false);
  await db.query('UPDATE dealers SET active=false WHERE id=$1',[dbb.id]);assert.equal((await fetch(base+'/api/dealer/clients',{headers:hb})).status,403);
 }finally{server.kill();await db.end();}
});
