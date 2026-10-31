import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';import {register} from '../auth.mjs';import {seedCatalog} from '../catalog.mjs';import {saveDealer} from '../dealers.mjs';import {saveCommissionRate} from '../dealer-commission-rates.mjs';import {saveMultiQuote} from '../multi-quote.mjs';import {createFinancialEntry} from '../finance.mjs';import {saveCommissionTerms} from '../dealer-commission-terms.mjs';import {commissionBalance} from '../commission-balance.mjs';import {attachCommissionRefund} from '../commission-refunds.mjs';
import {reconcileCommissionPayment} from '../commission-work.mjs';
test('commission ends after the order term and an administrator can change its dates',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await seedCatalog(db);const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin');const dealer=await saveDealer(db,admin.id,{id:randomUUID(),version:0,name:'Period fixture',contactName:'',email:'',phone:'',notes:'',active:true});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const rate=await saveCommissionRate(db,admin.id,{dealerId:dealer.id,percentHundredths:1000,effectiveOn:today});const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0],order=randomUUID();await saveMultiQuote(db,{id:order,companyName:'Period fixture',contactName:'Test',email:'test@example.invalid',phone:'12345',lines:[{productSlug:product.slug,productVersion:product.edit_version,mode:'lease',quantity:1}]});await db.query('UPDATE requests SET dealer_id=$1 WHERE id=$2',[dealer.id,order]);
  const d=new Date(today+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+37);const future=d.toISOString().slice(0,10);
  const firstPayment=randomUUID();try{for(const [id,date] of [[firstPayment,today],[randomUUID(),future]])await createFinancialEntry(db,admin.id,{id,requestId:order,kind:'payment',amountMinor:10000,occurredOn:date,notes:'',reference:''});}finally{}
  assert.equal((await commissionBalance(db,dealer.id)).balanceMinor,'1000');
  await saveCommissionTerms(db,admin.id,{requestId:order,dealerId:dealer.id,expectedVersion:0,startsOn:today,endsOn:future});assert.equal((await commissionBalance(db,dealer.id)).balanceMinor,'2000');
  await saveCommissionTerms(db,admin.id,{requestId:order,dealerId:dealer.id,expectedVersion:1,startsOn:today,endsOn:today});assert.equal((await commissionBalance(db,dealer.id)).balanceMinor,'1000');
  const refunds=[randomUUID(),randomUUID()];for(const id of refunds)await createFinancialEntry(db,admin.id,{id,requestId:order,kind:'refund',amountMinor:6000,occurredOn:today,notes:'',reference:''});
  const attempts=await Promise.allSettled(refunds.map(refundId=>attachCommissionRefund(db,admin.id,{refundId,paymentId:firstPayment})));
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(attempts.filter(x=>x.status==='rejected'&&x.reason.message==='refund_exceeds_payment').length,1);
  assert.equal((await commissionBalance(db,dealer.id)).complete,false);
  const earlier=new Date(today+'T00:00:00Z');earlier.setUTCDate(earlier.getUTCDate()-1);const oldPayment=randomUUID();try{await createFinancialEntry(db,admin.id,{id:oldPayment,requestId:order,kind:'payment',amountMinor:10000,occurredOn:earlier.toISOString().slice(0,10),notes:'',reference:''});}finally{}
  const newDealer=await saveDealer(db,admin.id,{id:randomUUID(),version:0,name:'Later dealer',contactName:'',email:'',phone:'',notes:'',active:true});await db.query('UPDATE requests SET dealer_id=$1 WHERE id=$2',[newDealer.id,order]);
  await assert.rejects(reconcileCommissionPayment(db,admin.id,{paymentId:oldPayment,dealerId:newDealer.id,ownerReason:'Reassignment'}),/dealer_conflict/);
  assert.equal((await reconcileCommissionPayment(db,admin.id,{paymentId:oldPayment})).status,'missing_rate');
  const override={paymentId:oldPayment,rateId:rate.id,reason:'Approved manual rate'};assert.equal((await reconcileCommissionPayment(db,admin.id,override)).status,'recorded');assert.equal((await reconcileCommissionPayment(db,admin.id,override)).status,'recorded');
  await assert.rejects(reconcileCommissionPayment(db,admin.id,{...override,reason:'Changed'}),/operation_conflict/);
  assert.equal((await db.query('SELECT reason FROM commission_rate_overrides WHERE payment_id=$1',[oldPayment])).rows[0].reason,'Approved manual rate');
  assert.equal((await db.query('SELECT dealer_id FROM commission_payment_snapshots WHERE payment_id=$1',[oldPayment])).rows[0].dealer_id,dealer.id);
  await assert.rejects(db.query('DELETE FROM commission_payment_ownership WHERE payment_id=$1',[oldPayment]),/append only/);
  await assert.rejects(db.query('DELETE FROM commission_rate_overrides WHERE payment_id=$1',[oldPayment]),/append only/);
  const unassignedOrder=randomUUID(),unassignedPayment=randomUUID();await saveMultiQuote(db,{id:unassignedOrder,companyName:'Unassigned fixture',contactName:'Test',email:'test@example.invalid',phone:'12345',lines:[{productSlug:product.slug,productVersion:product.edit_version,mode:'lease',quantity:1}]});
  await createFinancialEntry(db,admin.id,{id:unassignedPayment,requestId:unassignedOrder,kind:'payment',amountMinor:10000,occurredOn:today,notes:'',reference:''});await db.query('UPDATE requests SET dealer_id=$1 WHERE id=$2',[dealer.id,unassignedOrder]);
  assert.equal((await reconcileCommissionPayment(db,admin.id,{paymentId:unassignedPayment})).status,'missing_dealer');
  assert.equal((await reconcileCommissionPayment(db,admin.id,{paymentId:unassignedPayment,dealerId:dealer.id,ownerReason:'Confirmed by administrator'})).status,'recorded');
  assert.equal((await db.query('SELECT reason FROM commission_payment_ownership WHERE payment_id=$1',[unassignedPayment])).rows[0].reason,'Confirmed by administrator');
 }finally{await db.end();}
});
