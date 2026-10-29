import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../database.mjs';
import { saveRequest, notifyRequest } from '../requests.mjs';
import {saveContactInquiry,listContactInquiries,changeContactStatus,listInquiryHistory} from '../contact-inquiries.mjs';
import {register} from '../auth.mjs';
import {retryInquiryNotification,sendInitialInquiryNotification,resolvePendingInquiryNotification} from '../inquiry-notification.mjs';
import {retryRequestNotification,sendInitialRequestNotification,resolvePendingRequestNotification} from '../request-notification.mjs';
import {listRequests} from '../admin-requests.mjs';
import {getOrderNotificationSettings,saveOrderNotificationSettings,listOrderNotificationSettingsHistory} from '../order-notification-settings.mjs';
import {getDashboard} from '../dashboard.mjs';

test('notification recipient history cursor stays stable when new changes arrive',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const created=(await db.query("INSERT INTO order_notification_settings_history(actor_user_id,previous_email,new_email) SELECT $1,'old@example.invalid','new@example.invalid' FROM generate_series(1,30) RETURNING id::text",[admin.id])).rows.map(row=>row.id);
  const first=await listOrderNotificationSettingsHistory(db,new URLSearchParams());assert.equal(first.cursorSupported,true);assert.equal(first.events.length,25);assert.ok(first.hasMore);
  const anchor=first.events.at(-1).id;
  await db.query("INSERT INTO order_notification_settings_history(actor_user_id,previous_email,new_email) VALUES($1,'new@example.invalid','later@example.invalid')",[admin.id]);
  const second=await listOrderNotificationSettingsHistory(db,new URLSearchParams({before:anchor}));
  const seen=new Set([...first.events,...second.events].map(event=>event.id));
  assert.equal(seen.size,first.events.length+second.events.length);
  assert.ok(created.every(id=>seen.has(id)));
  await assert.rejects(listOrderNotificationSettingsHistory(db,new URLSearchParams({before:'999999999999999999'})),/invalid_input/);
  await assert.rejects(listOrderNotificationSettingsHistory(db,new URLSearchParams({before:anchor,offset:'25'})),/invalid_input/);
 }finally{await db.end();}
});

test('uncertain SMTP responses require a mailbox check before retry',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const inquiry={id:randomUUID(),name:'Example',email:'visitor@example.invalid',phone:'',message:'Hello'};await saveContactInquiry(db,inquiry);
  const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];const order={id:randomUUID(),productSlug:product.slug,productVersion:product.edit_version,mode:'purchase',quantity:1,companyName:'Example',contactName:'Example',email:'test@example.invalid',phone:'123'};const saved=await saveRequest(db,order);
  let calls=0;const uncertain={send:async()=>{calls++;throw Error('connection lost after send');}};
  assert.equal(await sendInitialInquiryNotification(db,uncertain,inquiry.id),'pending');assert.equal(await sendInitialRequestNotification(db,uncertain,saved,'request'),'pending');
  assert.equal(await sendInitialInquiryNotification(db,uncertain,inquiry.id),'pending');assert.equal(await sendInitialRequestNotification(db,uncertain,saved,'request'),'pending');assert.equal(calls,2);
  await assert.rejects(retryInquiryNotification(db,uncertain,admin.id,inquiry.id),/not_retryable/);await assert.rejects(retryRequestNotification(db,uncertain,admin.id,order.id),/not_retryable/);
  await db.query("UPDATE contact_inquiries SET notification_pending_at=now()-interval '6 minutes' WHERE id=$1",[inquiry.id]);await db.query("UPDATE requests SET notification_pending_at=now()-interval '6 minutes' WHERE id=$1",[order.id]);
  await resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true});await resolvePendingRequestNotification(db,admin.id,{id:order.id,checkedMailbox:true});
  assert.equal((await retryInquiryNotification(db,uncertain,admin.id,inquiry.id)).notification,'pending');assert.equal((await retryRequestNotification(db,uncertain,admin.id,order.id)).notification,'pending');
  assert.equal((await db.query('SELECT result FROM inquiry_notification_attempts WHERE inquiry_id=$1 ORDER BY id DESC LIMIT 1',[inquiry.id])).rows[0].result,'pending');assert.equal((await db.query('SELECT result FROM request_notification_attempts WHERE request_id=$1 ORDER BY id DESC LIMIT 1',[order.id])).rows[0].result,'pending');assert.equal(calls,4);
 }finally{await db.end();}
});

test('accepted notification retries stay pending if recording the result fails',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const inquiry={id:randomUUID(),name:'Example',email:'visitor@example.invalid',phone:'',message:'Hello'};await saveContactInquiry(db,inquiry);
  const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];
  const order={id:randomUUID(),productSlug:product.slug,productVersion:product.edit_version,mode:'purchase',quantity:1,companyName:'Example',contactName:'Example',email:'test@example.invalid',phone:'123'};const savedOrder=await saveRequest(db,order);
  await db.query("UPDATE contact_inquiries SET notification_status='failed',created_at=now()-interval '1 day' WHERE id=$1",[inquiry.id]);
  await db.query("UPDATE requests SET notification_status='failed',created_at=now()-interval '1 day' WHERE id=$1",[order.id]);
  const brokenDb={connect:async()=>{const c=await db.connect();return {release:()=>c.release(),query:(sql,args)=>{if(/^INSERT INTO (request|inquiry)_notification_attempts/.test(sql))throw Error('test_write_failure');return c.query(sql,args);}};}};
  let sent=0;const mailer={send:async m=>{sent++;return {accepted:[m.to],rejected:[]};}};
  await assert.rejects(retryInquiryNotification(brokenDb,mailer,admin.id,inquiry.id),/test_write_failure/);
  await assert.rejects(retryRequestNotification(brokenDb,mailer,admin.id,order.id),/test_write_failure/);assert.equal(sent,2);
  for(const [table,id] of [['contact_inquiries',inquiry.id],['requests',order.id]])assert.equal((await db.query(`SELECT notification_status FROM ${table} WHERE id=$1`,[id])).rows[0].notification_status,'pending');
  await assert.rejects(retryInquiryNotification(db,mailer,admin.id,inquiry.id),/not_retryable/);await assert.rejects(retryRequestNotification(db,mailer,admin.id,order.id),/not_retryable/);
  assert.equal(await sendInitialInquiryNotification(db,mailer,inquiry.id),'pending');assert.equal(await sendInitialRequestNotification(db,mailer,savedOrder,'request'),'pending');
  await assert.rejects(resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true}),/not_resolvable/);await assert.rejects(resolvePendingRequestNotification(db,admin.id,{id:order.id,checkedMailbox:true}),/not_resolvable/);assert.equal(sent,2);
  await db.query("UPDATE contact_inquiries SET notification_pending_at=now()-interval '6 minutes' WHERE id=$1",[inquiry.id]);await db.query("UPDATE requests SET notification_pending_at=now()-interval '6 minutes' WHERE id=$1",[order.id]);
  assert.equal((await resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true})).notification,'failed');assert.equal((await resolvePendingRequestNotification(db,admin.id,{id:order.id,checkedMailbox:true})).notification,'failed');
  assert.equal((await retryInquiryNotification(db,mailer,admin.id,inquiry.id)).notification,'sent');assert.equal((await retryRequestNotification(db,mailer,admin.id,order.id)).notification,'sent');assert.equal(sent,4);
 }finally{await db.end();}
});

test('dashboard counts new inquiries and failed notifications from saved records',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const before=await getDashboard(db);const inquiry={id:randomUUID(),name:'Example',email:'visitor@example.invalid',phone:'',message:'Help'};
  await saveContactInquiry(db,inquiry);await db.query("UPDATE contact_inquiries SET notification_status='failed' WHERE id=$1",[inquiry.id]);
  const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];const order={id:randomUUID(),productSlug:product.slug,productVersion:product.edit_version,mode:'purchase',quantity:1,companyName:'Example',contactName:'Example',email:'test@example.invalid',phone:'123'};
  await saveRequest(db,order);await db.query("UPDATE requests SET notification_status='failed' WHERE id=$1",[order.id]);
  const after=await getDashboard(db);assert.equal(after.new_inquiries,before.new_inquiries+1);assert.equal(after.failed_inquiry_notifications,before.failed_inquiry_notifications+1);assert.equal(after.failed_order_notifications,before.failed_order_notifications+1);
 }finally{await db.end();}
});

test('stale inquiry notification is resolved explicitly with history and no automatic send',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const inquiry={id:randomUUID(),name:'Example',email:'visitor@example.invalid',phone:'',message:'Hello'};await saveContactInquiry(db,inquiry);
  await assert.rejects(resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true}),/not_resolvable/);
  await assert.rejects(resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id}),/invalid_input/);
  await db.query("UPDATE contact_inquiries SET created_at=now()-interval '6 minutes' WHERE id=$1",[inquiry.id]);
  assert.equal((await resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true})).notification,'failed');
  await assert.rejects(resolvePendingInquiryNotification(db,admin.id,{id:inquiry.id,checkedMailbox:true}),/not_resolvable/);
  let sent=0;assert.equal(await sendInitialInquiryNotification(db,{send:async()=>{sent++;}},inquiry.id),'failed');assert.equal(sent,0);
  const list=await listContactInquiries(db,new URLSearchParams({search:inquiry.id}));assert.equal(list.inquiries[0].notification_resolutions[0].actor_email,admin.email);
 }finally{await db.end();}
});

test('inquiry notification retries are recorded and concurrent attempts do not resend accepted mail',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');const inquiry={id:randomUUID(),name:'Example',email:'visitor@example.invalid',phone:'',message:'Hello'};
  await saveContactInquiry(db,inquiry);await db.query("UPDATE contact_inquiries SET notification_status='failed' WHERE id=$1",[inquiry.id]);
  assert.equal((await retryInquiryNotification(db,null,admin.id,inquiry.id)).notification,'failed');
  let sent=0;const mailer={send:async m=>{sent++;return {accepted:[m.to],rejected:[]};}};
  const result=await Promise.allSettled([retryInquiryNotification(db,mailer,admin.id,inquiry.id),retryInquiryNotification(db,mailer,admin.id,inquiry.id)]);
  assert.equal(sent,1);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.message,'not_retryable');
  const list=await listContactInquiries(db,new URLSearchParams({search:inquiry.id}));assert.equal(list.inquiries[0].notification_status,'sent');assert.deepEqual(list.inquiries[0].notification_attempts.map(a=>a.result),['sent','failed']);
 }finally{await db.end();}
});

test('contact inquiries can be filtered by notification and processing status',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const tag=randomUUID();
  for(const notification of ['pending','sent','failed']){
   const id=randomUUID();await saveContactInquiry(db,{id,name:tag,email:'',phone:'0501234567',message:'Inquiry'});
   await db.query('UPDATE contact_inquiries SET notification_status=$1 WHERE id=$2',[notification,id]);
  }
  for(const notification of ['pending','sent','failed']){
   const list=await listContactInquiries(db,new URLSearchParams({search:tag,notification,status:'new'}));
   assert.equal(list.inquiries.length,1);assert.equal(list.inquiries[0].notification_status,notification);
  }
  assert.equal((await listContactInquiries(db,new URLSearchParams({search:tag,notification:'failed',status:'closed'}))).inquiries.length,0);
  await assert.rejects(listContactInquiries(db,new URLSearchParams({notification:'unexpected'})),/invalid_input/);
 }finally{await db.end();}
});

test('contact inquiries persist once and status changes keep an audit trail',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const data={id:randomUUID(),name:'Test visitor',email:'',phone:'0501234567',message:'Please contact me'};
  const results=await Promise.all([saveContactInquiry(db,data),saveContactInquiry(db,data)]);assert.equal(results.filter(r=>r.created).length,1);
  assert.equal((await saveContactInquiry(db,data,{existingOnly:true})).created,false);await assert.rejects(saveContactInquiry(db,{...data,message:'Changed'},{existingOnly:true}),/contact_conflict/);const disabledId=randomUUID();await assert.rejects(saveContactInquiry(db,{...data,id:disabledId},{existingOnly:true}),/contact_unavailable/);assert.equal((await db.query('SELECT count(*)::int AS n FROM contact_inquiries WHERE id=$1',[disabledId])).rows[0].n,0);
  await assert.rejects(saveContactInquiry(db,{...data,message:'Changed'}),/contact_conflict/);
  await assert.rejects(saveContactInquiry(db,{...data,id:randomUUID(),phone:''}),/invalid_contact/);
  const list=await listContactInquiries(db,new URLSearchParams({search:data.id}));assert.equal(list.inquiries.length,1);assert.equal(list.inquiries[0].status,'new');
  const withCompany={...data,id:randomUUID(),company:'Example Company',quantity:7};await saveContactInquiry(db,withCompany);assert.equal((await saveContactInquiry(db,withCompany)).created,false);
  const companyList=await listContactInquiries(db,new URLSearchParams({search:'Example Company'}));assert.ok(companyList.inquiries.some(i=>i.id===withCompany.id&&i.company==='Example Company'&&i.desired_quantity===7));
  await assert.rejects(saveContactInquiry(db,{...withCompany,quantity:8}),/contact_conflict/);await assert.rejects(saveContactInquiry(db,{...withCompany,id:randomUUID(),quantity:0}),/invalid_contact/);
  const product=(await db.query('SELECT slug,name FROM products WHERE published=true LIMIT 1')).rows[0];const contextual={...data,id:randomUUID(),source:'product',productSlug:product.slug};await saveContactInquiry(db,contextual);
  const contextualList=await listContactInquiries(db,new URLSearchParams({search:contextual.id}));assert.equal(contextualList.inquiries[0].product_model,product.name);assert.equal(contextualList.inquiries[0].source,'product');
  await assert.rejects(saveContactInquiry(db,{...contextual,id:randomUUID(),productSlug:'missing-model-xyz'}),/invalid_contact/);await assert.rejects(saveContactInquiry(db,{...contextual,productSlug:'different'}),/contact_conflict/);
  await changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'new',expectedRevision:'0',status:'reviewed'});await assert.rejects(changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'new',expectedRevision:'0',status:'closed'}),/status_conflict/);
  const updated=await listContactInquiries(db,new URLSearchParams({search:data.id}));assert.equal(updated.inquiries[0].history[0].old_status,'new');assert.equal(updated.inquiries[0].history[0].new_status,'reviewed');assert.equal(updated.inquiries[0].history[0].actor_email,admin.email);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM contact_inquiry_history WHERE inquiry_id=$1',[data.id])).rows[0].n,1);
  const reviewed=updated.inquiries[0];assert.notEqual(reviewed.status_revision,'0');await changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'reviewed',expectedRevision:reviewed.status_revision,status:'new'});await assert.rejects(changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'new',expectedRevision:'0',status:'closed'}),/status_conflict/);const current=(await listContactInquiries(db,new URLSearchParams({search:data.id}))).inquiries[0];assert.equal(current.status,'new');await changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'new',expectedRevision:current.status_revision,status:'closed'});await assert.rejects(changeContactStatus(db,admin.id,{id:data.id,expectedStatus:'closed',status:'new'}),/invalid_input/);
  let inquiryChangedDuringRead=false;const consistentDb={connect:async()=>{const c=await db.connect();return {release:()=>c.release(),query:async(sql,values)=>{const result=await c.query(sql,values);if(!inquiryChangedDuringRead&&sql.startsWith('SELECT id,name,email,phone,message')){inquiryChangedDuringRead=true;const old=result.rows[0];await changeContactStatus(db,admin.id,{id:data.id,expectedStatus:old.status,expectedRevision:old.status_revision,status:'reviewed'});}return result;}};}};
  const snapshot=(await listContactInquiries(consistentDb,new URLSearchParams({search:data.id}))).inquiries[0];assert.equal(inquiryChangedDuringRead,true);assert.equal(snapshot.status,'closed');assert.equal(snapshot.history[0].new_status,'closed');const freshInquiry=(await listContactInquiries(db,new URLSearchParams({search:data.id}))).inquiries[0];assert.equal(freshInquiry.status,'reviewed');assert.equal(freshInquiry.history[0].new_status,'reviewed');assert.notEqual(freshInquiry.status_revision,snapshot.status_revision);
  await db.query("INSERT INTO contact_inquiry_history(inquiry_id,actor_user_id,old_status,new_status) SELECT $1,$2,'new','reviewed' FROM generate_series(1,30)",[data.id,admin.id]);
  await db.query("INSERT INTO inquiry_notification_attempts(inquiry_id,actor_user_id,result) SELECT $1,$2,'failed' FROM generate_series(1,30)",[data.id,admin.id]);
  await db.query('INSERT INTO inquiry_notification_resolutions(inquiry_id,actor_user_id) SELECT $1,$2 FROM generate_series(1,30)',[data.id,admin.id]);
  const page=(await listContactInquiries(db,new URLSearchParams({search:data.id}))).inquiries[0];for(const [kind,property,total] of [['status','history',34],['attempt','notification_attempts',30],['resolution','notification_resolutions',30]]){assert.equal(page[property].length,25);assert.equal(page[property+'_has_more'],true);const before=page[property].at(-1).id;const older=await listInquiryHistory(db,new URLSearchParams({inquiryId:data.id,kind,before}));assert.equal(older.history.length,total-25);assert.equal(older.hasMore,false);assert.equal(new Set([...page[property],...older.history].map(x=>x.id)).size,total);await assert.rejects(listInquiryHistory(db,new URLSearchParams({inquiryId:withCompany.id,kind,before})),/not_found/);}
  await assert.rejects(listInquiryHistory(db,new URLSearchParams({inquiryId:data.id,kind:'invalid',before:'1'})),/invalid_input/);

 }finally{await db.end();}
});

test('inquiry cursor remains stable when new inquiries arrive',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const marker='CURSOR-'+randomUUID();await db.query("INSERT INTO contact_inquiries(id,payload_hash,name,phone,message,created_at) SELECT gen_random_uuid()::text,'fixture',$1,'123','test',now()-interval '1 day' FROM generate_series(1,30)",[marker]);
  const first=await listContactInquiries(db,new URLSearchParams({search:marker}));assert.equal(first.cursorSupported,true);assert.equal(first.inquiries.length,25);assert.equal(first.hasMore,true);const before=first.inquiries.at(-1).id;
  await db.query("INSERT INTO contact_inquiries(id,payload_hash,name,phone,message) VALUES(gen_random_uuid()::text,'fixture',$1,'123','new')",[marker]);
  const second=await listContactInquiries(db,new URLSearchParams({search:marker,before}));assert.equal(second.inquiries.length,5);assert.equal(second.hasMore,false);assert.equal(new Set([...first.inquiries,...second.inquiries].map(x=>x.id)).size,30);
  await assert.rejects(listContactInquiries(db,new URLSearchParams({search:marker,before:randomUUID()})),/invalid_input/);await assert.rejects(listContactInquiries(db,new URLSearchParams({before,offset:'25'})),/invalid_input/);assert.equal((await listContactInquiries(db,new URLSearchParams({search:marker,offset:'25'}))).inquiries.length,6);
 }finally{await db.end();}
});

test('unconfirmed order notification can be reviewed without sending or overwriting',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];
  const input={id:randomUUID(),productSlug:product.slug,productVersion:product.edit_version,mode:'purchase',quantity:1,companyName:'Example',contactName:'Example',email:'test@example.invalid',phone:'123'};const saved=await saveRequest(db,input);
  await assert.rejects(resolvePendingRequestNotification(db,admin.id,{id:input.id,checkedMailbox:true}),/not_resolvable/);await assert.rejects(resolvePendingRequestNotification(db,admin.id,{id:input.id}),/invalid_input/);
  await db.query("UPDATE requests SET created_at=now()-interval '6 minutes' WHERE id=$1",[input.id]);assert.equal((await resolvePendingRequestNotification(db,admin.id,{id:input.id,checkedMailbox:true})).notification,'failed');
  await assert.rejects(resolvePendingRequestNotification(db,admin.id,{id:input.id,checkedMailbox:true}),/not_resolvable/);let sends=0;assert.equal(await sendInitialRequestNotification(db,{send:async()=>{sends++;}},saved,'request'),'failed');assert.equal(sends,0);
  const list=await listRequests(db,new URLSearchParams({search:input.id}));assert.equal(list.requests[0].notification_resolutions[0].actor_email,admin.email);
  await assert.rejects(db.query('DELETE FROM request_notification_resolutions WHERE request_id=$1',[input.id]),/append only/);
 }finally{await db.end();}
});

test('request persists once and remains saved when notification fails', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  try {
    const { rows } = await db.query('SELECT slug,edit_version FROM products WHERE published = true LIMIT 1');
    const request = { id: randomUUID(), productSlug: rows[0].slug, productVersion: rows[0].edit_version, mode: 'lease', quantity: 3, companyName: 'Example', contactName: 'Example', email: 'test@example.invalid', phone: '123456' };
    const saved = await saveRequest(db, request);
    assert.equal(saved.created, true);
    assert.equal(await notifyRequest(db, null, saved), 'failed');
    assert.equal((await saveRequest(db, request)).created, false);
    await assert.rejects(saveRequest(db, { ...request, quantity: 5 }), /request_conflict/);
    const result = await db.query('SELECT notification_status, tariff_snapshot_json FROM requests WHERE id = $1', [request.id]);
    assert.equal(result.rows[0].notification_status, 'failed');
    assert.equal(result.rows[0].tariff_snapshot_json.price.totalAmountMinor, 29700);
    await db.query('UPDATE products SET edit_version=edit_version+1 WHERE slug=$1', [request.productSlug]);
    await assert.rejects(saveRequest(db, { ...request, id: randomUUID() }), /price_changed/);
    assert.equal((await saveRequest(db, request)).created, false);
    const still = await db.query('SELECT tariff_snapshot_json FROM requests WHERE id=$1', [request.id]);
    assert.equal(still.rows[0].tariff_snapshot_json.price.totalAmountMinor, 29700);
    const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');const oldSettings=await getOrderNotificationSettings(db);const newSettings=await saveOrderNotificationSettings(db,admin.id,{email:'orders@example.invalid',version:oldSettings.version});let sends=0;const mailer={send:async m=>{assert.equal(m.to,'orders@example.invalid');sends++;return {accepted:[m.to],rejected:[]};}};
    const attempts=await Promise.allSettled([retryRequestNotification(db,mailer,admin.id,request.id),retryRequestNotification(db,mailer,admin.id,request.id)]);assert.equal(sends,1);assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);assert.equal(attempts.find(a=>a.status==='rejected').reason.message,'not_retryable');
    assert.equal((await db.query('SELECT result FROM request_notification_attempts WHERE request_id=$1',[request.id])).rows[0].result,'sent');
    await saveOrderNotificationSettings(db,admin.id,{email:oldSettings.recipient_email,version:newSettings.version});
  } finally { await db.end(); }
});


test('orders can be filtered by notification status without leaking other statuses',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const product=(await db.query('SELECT slug,edit_version FROM products WHERE published=true LIMIT 1')).rows[0];
  const company='Filter '+randomUUID();
  const base={productSlug:product.slug,productVersion:product.edit_version,mode:'purchase',quantity:1,companyName:company,contactName:'Test',email:'test@example.invalid',phone:'123'};
  const ids={};for(const status of ['pending','sent','failed']){const id=randomUUID();ids[status]=id;await saveRequest(db,{...base,id});await db.query('UPDATE requests SET notification_status=$1 WHERE id=$2',[status,id]);}
  for(const status of ['pending','sent','failed']){const result=await listRequests(db,new URLSearchParams({search:company,notification:status}));assert.equal(result.total,1);assert.equal(result.requests[0].id,ids[status]);}
  assert.equal((await listRequests(db,new URLSearchParams({search:company}))).total,3);
  await assert.rejects(listRequests(db,new URLSearchParams({notification:'other'})),/invalid_input/);
 }finally{await db.end();}
});
