import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../database.mjs';
import { register } from '../auth.mjs';
import { getServerConfig } from '../hosting-config.mjs';

test('staff permissions isolate administrative routes and revoke immediately', async () => {
  if (!process.env.PC_LEASE_TEST_DATABASE_URL) throw new Error('PC_LEASE_TEST_DATABASE_URL is required');
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  const user = await register(db, `${randomUUID()}@example.invalid`, 'test-password-123');
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PC_LEASE_SERVER_PORT: String(port), PC_LEASE_DATABASE_URL: process.env.PC_LEASE_TEST_DATABASE_URL }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(([code]) => { throw new Error(`Server exited: ${code}`); })]);
    const base = `http://127.0.0.1:${port}`;
    const origin = 'http://127.0.0.1:3000';
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ email: user.email, password: 'test-password-123' }) });
    assert.equal(login.status, 200);
    const headers = { cookie: login.headers.get('set-cookie'), origin, 'content-type': 'application/json' };
    const routes = [
      ['orders','/api/admin/requests',200], ['orders','/api/admin/inquiries',200],
      ['orders','/api/admin/requests/customers?search='+encodeURIComponent(user.email),200], ['orders','/api/admin/requests/companies?search=test',200],
      ['catalog','/api/admin/products',200], ['content','/api/admin/site/calculator',200],
      ['inventory','/api/admin/inventory',200], ['inventory_cost','/api/admin/inventory/purchase?serial=unknown',404],
      ['service','/api/admin/service',200], ['contracts','/api/admin/contracts',200], ['finance','/api/admin/finance',200]
    ];
    const adminOnly = ['/api/admin/users','/api/admin/organizations','/api/admin/dashboard','/api/admin/tax-settings'];
    for (const [permission, path, expected] of routes) {
      await db.query('DELETE FROM staff_permissions WHERE user_id=$1', [user.id]);
      await db.query('INSERT INTO staff_permissions(user_id,permission) VALUES($1,$2)', [user.id, permission]);
      for (const [other, target, status] of routes) {
        const response = await fetch(base + target, { headers });
        assert.equal(response.status, other === permission ? status : 403, `${permission}: ${target}`);
      }
      for (const target of adminOnly) assert.equal((await fetch(base + target, { headers })).status, 403, `${permission}: ${target}`);
      if(permission==='orders'){
        const found=await (await fetch(base+'/api/admin/requests/customers?search='+encodeURIComponent(user.email),{headers})).json();
        assert.equal(found.users.length,1);assert.equal(found.users[0].id,user.id);
        assert.deepEqual(Object.keys(found.users[0]).sort(),['active','company_name','email','email_verified','first_name','id','last_name']);
      }
      await db.query('DELETE FROM staff_permissions WHERE user_id=$1', [user.id]);
      assert.equal((await fetch(base + path, { headers })).status, 403, `revoked ${permission}: ${path}`);
    }
    const writes = [
      ['orders','/api/admin/requests/status'], ['orders','/api/admin/requests/notes'], ['orders','/api/admin/requests/customer'], ['orders','/api/admin/requests/organization'], ['orders','/api/admin/inquiries/status'],
      ['catalog','/api/admin/products'], ['catalog','/api/admin/products/create'], ['content','/api/admin/site/calculator'],
      ['inventory','/api/admin/inventory'], ['inventory','/api/admin/inventory/reservations'], ['inventory_cost','/api/admin/inventory/purchase'],
      ['service','/api/admin/service'], ['contracts','/api/admin/contracts'], ['contracts','/api/admin/contracts/review'], ['contracts','/api/admin/contract-documents'],
      ['finance','/api/admin/finance'], ['finance','/api/admin/finance/correct-date'], ['finance','/api/admin/finance/correct-amount']
    ];
    for (const permission of ['orders','catalog','content','inventory','inventory_cost','service','contracts','finance']) {
      await db.query('DELETE FROM staff_permissions WHERE user_id=$1', [user.id]);
      await db.query('INSERT INTO staff_permissions(user_id,permission) VALUES($1,$2)', [user.id, permission]);
      for (const [required, target] of writes) {
        const response = await fetch(base + target, { method:'POST', headers, body:'{}' });
        assert.equal(response.status, required === permission ? 400 : 403, `${permission}: POST ${target}`);
        assert.equal((await fetch(base + target, { method:'POST', headers:{...headers,origin:'http://evil.invalid'}, body:'{}' })).status, 403, `${permission}: foreign origin ${target}`);
      }
      for (const target of ['/api/admin/users/role','/api/admin/users/permissions','/api/admin/users/active','/api/admin/tax-settings'])
        assert.equal((await fetch(base + target, { method:'POST', headers, body:'{}' })).status, 403, `${permission}: admin-only POST ${target}`);
    }
    const replacement = base + '/api/admin/service/replacement';
    for (const permissions of [[], ['service'], ['inventory'], ['service','inventory']]) {
      await db.query('DELETE FROM staff_permissions WHERE user_id=$1', [user.id]);
      for (const permission of permissions) await db.query('INSERT INTO staff_permissions(user_id,permission) VALUES($1,$2)', [user.id, permission]);
      const result = await fetch(replacement, { method:'POST', headers, body:'{}' });
      assert.equal(result.status, permissions.length === 2 ? 400 : 403);
      assert.equal((await fetch(replacement, { method:'POST', headers:{...headers,origin:'http://evil.invalid'}, body:'{}' })).status, 403);
    }
  } finally { child.kill(); await once(child, 'exit'); await db.end(); }
});

test('hosting configuration requires a single HTTPS origin and secure cookies', () => {
  assert.equal(getServerConfig({}).host, '127.0.0.1');
  assert.throws(() => getServerConfig({ PC_LEASE_HOSTED: 'true', PORT: '8080' }));
  assert.throws(() => getServerConfig({ PC_LEASE_HOSTED: 'true', PORT: '8080', PC_LEASE_PUBLIC_ORIGIN: 'http://example.com' }));
  assert.throws(() => getServerConfig({ PC_LEASE_HOSTED: 'true', PORT: '8080', PC_LEASE_PUBLIC_ORIGIN: 'https://example.com/path' }));
  const config = getServerConfig({ PC_LEASE_HOSTED: 'true', PORT: '8080', PC_LEASE_PUBLIC_ORIGIN: 'https://example.com' });
  assert.deepEqual(config.origins, ['https://example.com']);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.secureCookie, '; Secure');
});

test('hosted server serves the site and enforces the configured origin', async () => {
  if (!process.env.PC_LEASE_TEST_DATABASE_URL) throw new Error('PC_LEASE_TEST_DATABASE_URL is required');
  const database = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  const email = randomUUID() + '@example.invalid';
  await register(database, email, 'test-password-123','admin');
  await database.end();
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PC_LEASE_HOSTED: 'true', PORT: String(port), PC_LEASE_PUBLIC_ORIGIN: 'https://example.invalid', PC_LEASE_DATABASE_URL: process.env.PC_LEASE_TEST_DATABASE_URL }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(([code]) => { throw new Error(`Server exited: ${code}`); })]);
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(base + '/catalog')).status, 200);
    assert.equal((await fetch(base + '/about')).status, 200);
    assert.equal((await fetch(base + '/contact')).status, 200);
    assert.equal((await fetch(base + '/api/auth/me')).status, 200);
    const verifyHeaders={'content-type':'application/json',origin:'https://example.invalid'};
    assert.equal((await fetch(base+'/api/auth/verification-request',{method:'POST',headers:verifyHeaders,body:JSON.stringify({lang:'en'})})).status,403);
    assert.equal((await fetch(base+'/api/auth/verify-email',{method:'POST',headers:verifyHeaders,body:JSON.stringify({token:'bad'})})).status,400);
    const login = origin => fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ email, password: 'test-password-123' }) });
    assert.equal((await login('https://attacker.invalid')).status, 403);
    const response = await login('https://example.invalid');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /; Secure/);
    const adminHeaders={...verifyHeaders,cookie:response.headers.get('set-cookie')};
    const settingsUrl=base+'/api/admin/order-notification-settings';assert.equal((await fetch(settingsUrl)).status,403);
    const settings=(await (await fetch(settingsUrl,{headers:adminHeaders})).json()).settings;
    assert.equal((await fetch(settingsUrl,{method:'POST',headers:{...adminHeaders,origin:'https://attacker.invalid'},body:JSON.stringify({email:'orders@example.invalid',version:settings.version})})).status,403);
    assert.equal((await fetch(settingsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({email:'invalid',version:settings.version})})).status,400);
    const changed=await fetch(settingsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({email:'orders@example.invalid',version:settings.version})});assert.equal(changed.status,200);const version=(await changed.json()).settings.version;
    assert.equal((await fetch(settingsUrl+'/history')).status,403);assert.equal((await fetch(settingsUrl+'/history?offset=-1',{headers:adminHeaders})).status,400);
    const settingHistory=(await (await fetch(settingsUrl+'/history',{headers:adminHeaders})).json()).events;assert.equal(settingHistory[0].new_email,'orders@example.invalid');assert.equal(settingHistory[0].actor_email,email);
    assert.equal((await fetch(settingsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({email:'other@example.invalid',version:settings.version})})).status,409);
    assert.equal((await fetch(settingsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({email:settings.recipient_email,version})})).status,200);
    const inquiry={id:randomUUID(),name:'Inquiry test',email:'',phone:'0501234567',message:'Need help'},inquiryUrl=base+'/api/admin/inquiries';
    assert.equal((await fetch(base+'/api/contact',{method:'POST',headers:{...verifyHeaders,origin:'https://attacker.invalid'},body:JSON.stringify(inquiry)})).status,403);
    const inquirySaved=await fetch(base+'/api/contact',{method:'POST',headers:verifyHeaders,body:JSON.stringify(inquiry)});assert.equal(inquirySaved.status,200);const inquiryResult=await inquirySaved.json();assert.equal(inquiryResult.received,true);assert.equal(inquiryResult.notification,'failed');
    const repeatedInquiry=await fetch(base+'/api/contact',{method:'POST',headers:verifyHeaders,body:JSON.stringify(inquiry)});assert.equal(repeatedInquiry.status,200);assert.equal((await repeatedInquiry.json()).notification,'failed');
    assert.equal((await fetch(base+'/api/contact',{method:'POST',headers:verifyHeaders,body:JSON.stringify({...inquiry,message:'different'})})).status,409);
    assert.equal((await fetch(inquiryUrl)).status,403);
    const inquiries=(await (await fetch(inquiryUrl+'?search='+inquiry.id,{headers:adminHeaders})).json()).inquiries;assert.equal(inquiries.length,1);assert.equal(inquiries[0].notification_status,'failed');
    assert.equal((await fetch(inquiryUrl+'/resolve-notification',{method:'POST',headers:verifyHeaders,body:JSON.stringify({id:inquiry.id,checkedMailbox:true})})).status,403);
    assert.equal((await fetch(inquiryUrl+'/resolve-notification',{method:'POST',headers:{...adminHeaders,origin:'https://attacker.invalid'},body:JSON.stringify({id:inquiry.id,checkedMailbox:true})})).status,403);
    assert.equal((await fetch(inquiryUrl+'/retry-notification',{method:'POST',headers:verifyHeaders,body:JSON.stringify({id:inquiry.id})})).status,403);
    assert.equal((await fetch(inquiryUrl+'/retry-notification',{method:'POST',headers:{...adminHeaders,origin:'https://attacker.invalid'},body:JSON.stringify({id:inquiry.id})})).status,403);
    assert.equal((await (await fetch(inquiryUrl+'/retry-notification',{method:'POST',headers:adminHeaders,body:JSON.stringify({id:inquiry.id})})).json()).notification,'failed');
    const notificationAuditDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{for(const [table,where,value] of [['inquiry_notification_attempts','inquiry_id',inquiry.id],['order_notification_settings_history','actor_user_id',(await notificationAuditDb.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id]]){assert.ok((await notificationAuditDb.query(`SELECT 1 FROM ${table} WHERE ${where}=$1 LIMIT 1`,[value])).rowCount);await assert.rejects(notificationAuditDb.query(`UPDATE ${table} SET actor_user_id=actor_user_id WHERE ${where}=$1`,[value]),/append only/);await assert.rejects(notificationAuditDb.query(`DELETE FROM ${table} WHERE ${where}=$1`,[value]),/append only/);}}finally{await notificationAuditDb.end();}
    assert.equal((await fetch(inquiryUrl+'/status',{method:'POST',headers:adminHeaders,body:JSON.stringify({id:inquiry.id,expectedStatus:'new',expectedRevision:'0',status:'reviewed'})})).status,200);
    const inquiryPage=(await (await fetch(inquiryUrl+'?search='+inquiry.id,{headers:adminHeaders})).json()).inquiries[0];const inquiryHistoryUrl=inquiryUrl+'/history?'+new URLSearchParams({inquiryId:inquiry.id,kind:'status',before:inquiryPage.history[0].id});assert.equal((await fetch(inquiryHistoryUrl)).status,403);assert.equal((await fetch(inquiryHistoryUrl,{headers:verifyHeaders})).status,403);assert.equal((await fetch(inquiryHistoryUrl,{headers:adminHeaders})).status,200);assert.equal((await fetch(inquiryUrl+'/history?inquiryId='+inquiry.id+'&kind=bad&before=1',{headers:adminHeaders})).status,400);
    const inquiryAuditDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await assert.rejects(inquiryAuditDb.query("UPDATE contact_inquiry_history SET new_status='closed' WHERE inquiry_id=$1",[inquiry.id]),/append only/);await assert.rejects(inquiryAuditDb.query('DELETE FROM contact_inquiry_history WHERE inquiry_id=$1',[inquiry.id]),/append only/);}finally{await inquiryAuditDb.end();}
    const note={id:randomUUID(),requestId:inquiry.id,body:'Internal inquiry note'};
    assert.equal((await fetch(inquiryUrl+'/notes?requestId='+inquiry.id)).status,403);
    assert.equal((await fetch(inquiryUrl+'/notes',{method:'POST',headers:{...adminHeaders,origin:'https://attacker.invalid'},body:JSON.stringify(note)})).status,403);
    assert.equal((await fetch(inquiryUrl+'/notes',{method:'POST',headers:adminHeaders,body:JSON.stringify(note)})).status,200);
    assert.equal((await (await fetch(inquiryUrl+'/notes',{method:'POST',headers:adminHeaders,body:JSON.stringify(note)})).json()).created,false);
    assert.equal((await fetch(inquiryUrl+'/notes',{method:'POST',headers:adminHeaders,body:JSON.stringify({...note,body:'changed'})})).status,409);
    assert.equal((await (await fetch(inquiryUrl+'/notes?requestId='+inquiry.id,{headers:adminHeaders})).json()).notes[0].body,note.body);
  } finally { child.kill(); await once(child, 'exit'); }
});

test('server exposes health but no application data API', async () => {
  if (!process.env.PC_LEASE_TEST_DATABASE_URL) throw new Error('PC_LEASE_TEST_DATABASE_URL is required');
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PC_LEASE_SERVER_PORT: String(port), PC_LEASE_DATABASE_URL: process.env.PC_LEASE_TEST_DATABASE_URL }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(([code]) => { throw new Error(`Server exited: ${code}`); })]);
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    const catalog = await fetch(`http://127.0.0.1:${port}/api/catalog`);
    assert.equal(catalog.status, 200);
    const products = (await catalog.json()).products;
    assert.equal(products.length, 6);
    const payload = { id: randomUUID(), productSlug: products[0].slug, productVersion: products[0].editVersion, mode: 'lease', quantity: 1, companyName: 'Example', contactName: 'Example', email: 'test@example.invalid', phone: '123' };
    const options = { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(payload) };
    const created = await fetch(`http://127.0.0.1:${port}/api/requests`, options);
    assert.equal(created.status, 200);
    assert.equal((await created.json()).notification, 'failed');
    const repeated = await fetch(`http://127.0.0.1:${port}/api/requests`, options);
    assert.equal((await repeated.json()).id, payload.id);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/requests`)).status, 403);
    const database = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
    const adminEmail = randomUUID() + '@example.invalid';
    const customerEmail = randomUUID() + '@example.invalid';
    await register(database, adminEmail, 'admin-password-123', 'admin');
    await register(database, customerEmail, 'client-password-123');
    await database.end();
    async function signIn(email, password) {
      return fetch(`http://127.0.0.1:${port}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json', origin:'http://localhost:3000'}, body:JSON.stringify({email,password}) });
    }
    const customer = await signIn(customerEmail, 'client-password-123');
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/requests`, {headers:{cookie:customer.headers.get('set-cookie')}})).status, 403);
    const admin = await signIn(adminEmail, 'admin-password-123');
    assert.match(admin.headers.get('set-cookie'), /HttpOnly/);
    const taxUrl=`http://127.0.0.1:${port}/api/admin/tax-settings`;
    assert.equal((await fetch(taxUrl)).status,403);
    assert.equal((await fetch(taxUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const taxHeaders={cookie:admin.headers.get('set-cookie'),'content-type':'application/json',origin:'http://localhost:3000'};
    const initialTax=(await (await fetch(taxUrl,{headers:taxHeaders})).json()).settings;
    assert.equal((await fetch(taxUrl,{method:'POST',headers:{...taxHeaders,origin:'http://untrusted.invalid'},body:JSON.stringify({vatBasisPoints:1700,version:initialTax.version})})).status,403);
    const updatedTax=await fetch(taxUrl,{method:'POST',headers:taxHeaders,body:JSON.stringify({vatBasisPoints:1700,version:initialTax.version})});assert.equal(updatedTax.status,200);
    assert.equal((await fetch(taxUrl,{method:'POST',headers:taxHeaders,body:JSON.stringify({vatBasisPoints:1800,version:initialTax.version})})).status,409);
    const savedTax=(await updatedTax.json()).settings;
    assert.equal((await fetch(taxUrl,{method:'POST',headers:taxHeaders,body:JSON.stringify({vatBasisPoints:initialTax.vat_basis_points,version:savedTax.version})})).status,200);
    const taxHistory=taxUrl+'/history';
    assert.equal((await fetch(taxHistory)).status,403);
    assert.equal((await fetch(taxHistory,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    assert.equal((await fetch(taxHistory+'?offset=bad',{headers:taxHeaders})).status,400);
    const taxEvents=(await (await fetch(taxHistory,{headers:taxHeaders})).json()).events;
    assert.equal(taxEvents[0].new_basis_points,initialTax.vat_basis_points);
    assert.equal(taxEvents[1].new_basis_points,1700);
    const productHistoryUrl=`http://127.0.0.1:${port}/api/admin/products/history?id=${encodeURIComponent(products[0].id)}`;assert.equal((await fetch(productHistoryUrl)).status,403);assert.equal((await fetch(productHistoryUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);assert.equal((await fetch(productHistoryUrl,{headers:{cookie:admin.headers.get('set-cookie')}})).status,200);
    const schemaUrl=`http://127.0.0.1:${port}/api/admin/schema`;assert.equal((await fetch(schemaUrl)).status,403);assert.equal((await fetch(schemaUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);const schema=await fetch(schemaUrl,{headers:{cookie:admin.headers.get('set-cookie')}});assert.equal(schema.status,200);assert.ok((await schema.json()).columns.some(c=>c.table_name==='products'&&c.column_name==='id'));
    const trustUrl = `http://127.0.0.1:${port}/api/admin/site/trust`;
    assert.equal((await fetch(trustUrl)).status, 403);
    assert.equal((await fetch(trustUrl, { headers: { cookie: customer.headers.get('set-cookie') } })).status, 403);
    const adminHeaders = { cookie: admin.headers.get('set-cookie'), 'content-type': 'application/json', origin: 'http://localhost:3000' };
    const dashboardUrl=`http://127.0.0.1:${port}/api/admin/dashboard`;
    assert.equal((await fetch(dashboardUrl)).status,403);
    assert.equal((await fetch(dashboardUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const dashboard=(await (await fetch(dashboardUrl,{headers:adminHeaders})).json()).dashboard;
    const dashboardDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);const expectedDashboard=(await dashboardDb.query("SELECT (SELECT count(*)::integer FROM requests WHERE status='new') AS new_requests,(SELECT count(*)::integer FROM products WHERE published=true) AS published_products,(SELECT count(*)::integer FROM service_replacements WHERE returned_at IS NULL) AS active_replacements")).rows[0];await dashboardDb.end();
    assert.equal(dashboard.new_requests,expectedDashboard.new_requests);assert.equal(dashboard.published_products,expectedDashboard.published_products);assert.equal(dashboard.active_replacements,expectedDashboard.active_replacements);assert.equal(Object.hasOwn(dashboard,'revenue'),false);
    const usersUrl = `http://127.0.0.1:${port}/api/admin/users`;
    const rolesUrl = `http://127.0.0.1:${port}/api/admin/users/role`;
    assert.equal((await fetch(usersUrl)).status,403);
    assert.equal((await fetch(usersUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const accounts = await (await fetch(usersUrl+'?search='+encodeURIComponent(customerEmail),{headers:adminHeaders})).json();
    const customerId = accounts.users.find(u => u.email === customerEmail).id;
    const byUserId=await (await fetch(`${usersUrl}?search=${customerId}`,{headers:adminHeaders})).json();assert.equal(byUserId.users.find(u=>u.id===customerId).email,customerEmail);assert.equal((await fetch(`${usersUrl}?search=${customerId}`,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const adminOnly=await (await fetch(`${usersUrl}?role=admin&active=active`,{headers:adminHeaders})).json();assert.ok(adminOnly.users.length>0);assert.ok(adminOnly.users.every(u=>u.role==='admin'&&u.active));const filteredCustomer=await (await fetch(`${usersUrl}?search=${customerId}&role=customer&active=active`,{headers:adminHeaders})).json();assert.equal(filteredCustomer.total,1);assert.equal(filteredCustomer.users[0].id,customerId);assert.equal((await (await fetch(`${usersUrl}?search=${customerId}&role=admin`,{headers:adminHeaders})).json()).total,0);assert.equal((await fetch(`${usersUrl}?role=bad`,{headers:adminHeaders})).status,400);assert.equal((await fetch(`${usersUrl}?active=bad`,{headers:adminHeaders})).status,400);assert.equal((await fetch(`${usersUrl}?role=admin`,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const historyUrl=`${usersUrl}/access-history?userId=${customerId}`;
    assert.equal((await fetch(historyUrl)).status,403);
    assert.equal((await fetch(historyUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    assert.equal((await fetch(`${usersUrl}/access-history?userId=bad`,{headers:adminHeaders})).status,400);
    const profileUrl = `http://127.0.0.1:${port}/api/admin/users/profile`;
    const profile = {id:customerId,version:1,firstName:'Test',lastName:'Person',phone:'12345',companyName:'Test Co'};
    const profileBody = JSON.stringify(profile);
    for (const field of ['firstName','lastName','phone']) {
      assert.equal((await fetch(profileUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...profile,[field]:'   '})})).status,400);
    }
    assert.equal((await fetch(profileUrl,{method:'POST',headers:{...adminHeaders,cookie:customer.headers.get('set-cookie')},body:profileBody})).status,403);
    assert.equal((await fetch(profileUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:profileBody})).status,403);
    const savedProfile = await fetch(profileUrl,{method:'POST',headers:adminHeaders,body:profileBody}); assert.equal(savedProfile.status,200);
    assert.equal((await savedProfile.json()).user.first_name,'Test');
    assert.equal((await fetch(profileUrl,{method:'POST',headers:adminHeaders,body:profileBody})).status,409);
    assert.equal((await fetch(profileUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...profile,version:2,phone:'x'.repeat(201)})})).status,400);
    const reloadedProfile=(await (await fetch(usersUrl+'?search='+encodeURIComponent(customerId),{headers:adminHeaders})).json()).users.find(u=>u.id===customerId);
    assert.equal(reloadedProfile.phone,'12345'); assert.equal(reloadedProfile.role,'customer'); assert.equal(reloadedProfile.profile_version,2);
    const permissionsUrl=`http://127.0.0.1:${port}/api/admin/users/permissions`;
    const customerHeaders={cookie:customer.headers.get('set-cookie')};
    const dealerUrl=`http://127.0.0.1:${port}/api/admin/dealers`, dealer={id:randomUUID(),version:0,name:'Test partner',contactName:'Contact',email:'partner@example.invalid',phone:'0501234567',notes:'',active:true};
    assert.equal((await fetch(dealerUrl)).status,403);assert.equal((await fetch(dealerUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(dealerUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:JSON.stringify(dealer)})).status,403);
    const dealerPosts=await Promise.all([1,2].map(()=>fetch(dealerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(dealer)})));assert.deepEqual(dealerPosts.map(r=>r.status),[200,200]);
    assert.equal((await fetch(dealerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...dealer,name:'Different'})})).status,409);
    assert.equal((await (await fetch(dealerUrl+'?search=Test%20partner',{headers:adminHeaders})).json()).dealers.length,1);
    assert.equal((await fetch(dealerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...dealer,version:1,name:'Updated partner'})})).status,200);
    assert.equal((await fetch(dealerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...dealer,version:1})})).status,409);
    assert.equal((await fetch(dealerUrl+'/history?id='+dealer.id,{headers:customerHeaders})).status,403);assert.equal((await fetch(dealerUrl+'/history?id=invalid',{headers:adminHeaders})).status,400);const dealerEvents=(await (await fetch(dealerUrl+'/history?id='+dealer.id,{headers:adminHeaders})).json()).events;assert.equal(dealerEvents.length,2);assert.equal(dealerEvents[0].previous_data.name,'Test partner');assert.equal(dealerEvents[0].new_data.name,'Updated partner');
    const dealerDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{assert.equal((await dealerDb.query('SELECT count(*)::integer AS n FROM dealer_history WHERE dealer_id=$1',[dealer.id])).rows[0].n,2);await assert.rejects(dealerDb.query('DELETE FROM dealer_history WHERE dealer_id=$1',[dealer.id]),/append only/);}finally{await dealerDb.end();}
    const permissionVersion=async()=>(await (await fetch(usersUrl+'?search='+customerId,{headers:adminHeaders})).json()).users[0].permission_revision;
    const grant={id:customerId,permissions:['orders'],expectedPermissions:[],expectedRevision:await permissionVersion()};
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:JSON.stringify(grant)})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:{...adminHeaders,...customerHeaders},body:JSON.stringify(grant)})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(grant)})).status,200);
    const byPermission=await (await fetch(`${usersUrl}?search=${customerId}&permission=orders&active=active`,{headers:adminHeaders})).json();assert.equal(byPermission.total,1);assert.equal(byPermission.users[0].id,customerId);assert.equal((await (await fetch(`${usersUrl}?search=${customerId}&permission=any`,{headers:adminHeaders})).json()).total,1);assert.equal((await (await fetch(`${usersUrl}?search=${customerId}&permission=finance`,{headers:adminHeaders})).json()).total,0);assert.equal((await (await fetch(`${usersUrl}?role=admin&permission=any`,{headers:adminHeaders})).json()).total,0);assert.equal((await fetch(`${usersUrl}?permission=bogus`,{headers:adminHeaders})).status,400);assert.equal((await fetch(`${usersUrl}?permission=orders`,{headers:customerHeaders})).status,403);

    assert.equal((await fetch(dashboardUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(grant)})).status,409);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/requests`,{headers:customerHeaders})).status,200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/products`,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(trustUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(usersUrl,{headers:customerHeaders})).status,403);
    const revoke={id:customerId,permissions:[],expectedPermissions:['orders'],expectedRevision:await permissionVersion()};
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(revoke)})).status,200);
    assert.equal((await (await fetch(`${usersUrl}?search=${customerId}&permission=any`,{headers:adminHeaders})).json()).total,0);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/requests`,{headers:customerHeaders})).status,403);
    const concurrentPermissionVersion=await permissionVersion();const concurrentPermissions=await Promise.all([['orders'],['finance']].map(permissions=>fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions,expectedPermissions:[],expectedRevision:concurrentPermissionVersion})})));
    assert.deepEqual(concurrentPermissions.map(r=>r.status).sort(),[200,409]);
    const winner=(await concurrentPermissions.find(r=>r.status===200).json()).user.permissions;
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:[],expectedPermissions:winner,expectedRevision:await permissionVersion()})})).status,200);
    const grantContent={id:customerId,permissions:['content','catalog'],expectedPermissions:[],expectedRevision:await permissionVersion()};
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(grantContent)})).status,200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/products`,{headers:customerHeaders})).status,200);
    assert.equal((await fetch(schemaUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(productHistoryUrl,{headers:customerHeaders})).status,200);
    assert.equal((await fetch(trustUrl,{headers:customerHeaders})).status,200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/requests`,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:{...adminHeaders,...customerHeaders},body:JSON.stringify({id:customerId,permissions:['orders'],expectedPermissions:['catalog','content'],expectedRevision:await permissionVersion()})})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:[],expectedPermissions:['catalog','content'],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(productHistoryUrl,{headers:customerHeaders})).status,403);
    const grantedDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
    assert.equal(Number((await grantedDb.query('SELECT count(*) FROM staff_permission_history WHERE user_id=$1',[customerId])).rows[0].count),6);
    await grantedDb.end();
    const inventoryUrl=`http://127.0.0.1:${port}/api/admin/inventory`;
    assert.equal((await fetch(inventoryUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['inventory'],expectedPermissions:[],expectedRevision:await permissionVersion()})})).status,200);
    const inventoryProducts=await fetch(inventoryUrl+'/products',{headers:customerHeaders});assert.equal(inventoryProducts.status,200);
    const inventoryProduct=(await inventoryProducts.json()).products[0];
    const asset={serialNumber:'Test-Serial-123',productId:inventoryProduct.id,location:'Test shelf',conditionNotes:'Test condition',status:'received'};
    const staffHeaders={...adminHeaders,...customerHeaders};
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:{...staffHeaders,origin:'http://evil.invalid'},body:JSON.stringify(asset)})).status,403);
    const assetResponse=await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(asset)});assert.equal(assetResponse.status,200);
    const savedAsset=(await assetResponse.json()).asset;
    const retryAsset={...asset,serialNumber:'retry-asset-123',createId:randomUUID()};const retries=await Promise.all(Array.from({length:3},()=>fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(retryAsset)})));const createdCopies=[];for(const r of retries){assert.equal(r.status,200);const copy=(await r.json()).asset;assert.equal(copy.id,retryAsset.createId);createdCopies.push(copy)}assert.deepEqual(createdCopies[1],createdCopies[0]);assert.deepEqual(createdCopies[2],createdCopies[0]);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...retryAsset,location:'different'})})).status,409);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(retryAsset)})).status,409);
    const purchaseUrl=inventoryUrl+'/purchase';
    const purchase={assetId:savedAsset.id,expectedVersion:0,supplierName:'Test supplier',purchaseReference:'INV-123',purchaseCostMinor:12345,purchaseDate:'2024-02-29',warrantyStart:'2026-01-11',warrantyEnd:'2027-01-11'};
    assert.equal((await fetch(purchaseUrl+'?serial=Test-Serial-123',{headers:customerHeaders})).status,403);
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(purchase)})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['inventory','inventory_cost'],expectedPermissions:['inventory'],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:{...staffHeaders,origin:'http://evil.invalid'},body:JSON.stringify(purchase)})).status,403);
    for(const field of ['purchaseDate','warrantyStart','warrantyEnd']){const zeroYear=await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...purchase,[field]:'0000-01-01'})});assert.equal(zeroYear.status,400);assert.equal((await zeroYear.json()).error,'invalid_input');}
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...purchase,purchaseDate:'2023-02-29'})})).status,400);
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...purchase,warrantyEnd:'2025-01-01'})})).status,400);
    const savedPurchase=await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(purchase)});assert.equal(savedPurchase.status,200);assert.equal((await savedPurchase.json()).details.purchase_date,'2024-02-29');
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(purchase)})).status,409);
    const purchaseData=await (await fetch(purchaseUrl+'?serial=test-serial-123',{headers:customerHeaders})).json();
    assert.equal(Number(purchaseData.details.purchase_cost_minor),12345);assert.equal(purchaseData.details.purchase_date,'2024-02-29');assert.equal(purchaseData.history.length,1);
    const snapshotDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
      let changedDuringRead=false;const wrapped={connect:async()=>{const client=await snapshotDb.connect();return {query:async(...args)=>{const result=await client.query(...args);if(!changedDuringRead&&String(args[0]).includes('FROM asset_purchase_details WHERE asset_id=')){changedDuringRead=true;const response=await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...purchase,expectedVersion:1,supplierName:'Updated supplier'})});assert.equal(response.status,200);}return result;},release:()=>client.release()};}};
      const {findPurchaseAsset}=await import('../asset-purchase.mjs');const snapshot=await findPurchaseAsset(wrapped,'Test-Serial-123');assert.equal(changedDuringRead,true);assert.equal(snapshot.details.version,1);assert.equal(snapshot.history.length,1);assert.equal(snapshot.history[0].new_data.version,1);
      const fresh=await findPurchaseAsset(snapshotDb,'Test-Serial-123');assert.equal(fresh.details.version,2);assert.equal(fresh.history.length,2);assert.equal(fresh.history[0].new_data.version,2);
      const localDateStyleDb={connect:async()=>{const client=await snapshotDb.connect();return {query:async(...args)=>{const result=await client.query(...args);if(String(args[0]).startsWith('BEGIN ISOLATION LEVEL'))await client.query("SET LOCAL DateStyle TO 'SQL, DMY'");return result;},release:()=>client.release()};}};
      const dateStyleResult=await findPurchaseAsset(localDateStyleDb,'Test-Serial-123');assert.equal(dateStyleResult.details.purchase_date,'2024-02-29');assert.equal(dateStyleResult.details.warranty_start,'2026-01-11');assert.equal(dateStyleResult.details.warranty_end,'2027-01-11');
    }finally{await snapshotDb.end();}
    const purchaseHistoryDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
      await purchaseHistoryDb.query('INSERT INTO asset_purchase_history(asset_id,actor_user_id,previous_data,new_data) SELECT asset_id,actor_user_id,previous_data,new_data FROM asset_purchase_history CROSS JOIN generate_series(1,30) WHERE asset_id=$1 AND new_data->>\'version\'=\'1\'',[savedAsset.id]);
      const first=await (await fetch(purchaseUrl+'?serial=Test-Serial-123&historyLimit=25',{headers:customerHeaders})).json();assert.equal(first.history.length,25);assert.equal(first.historyHasMore,true);
      const anchor=first.history.at(-1).id,historyUrl=purchaseUrl+'/history?assetId='+savedAsset.id+'&before='+anchor;assert.equal((await fetch(historyUrl)).status,403);
      await purchaseHistoryDb.query('INSERT INTO asset_purchase_history(asset_id,actor_user_id,previous_data,new_data) SELECT asset_id,actor_user_id,previous_data,new_data FROM asset_purchase_history WHERE asset_id=$1 ORDER BY id LIMIT 1',[savedAsset.id]);
      const older=await (await fetch(historyUrl,{headers:customerHeaders})).json();assert.equal(older.history.length,7);assert.equal(older.hasMore,false);assert.equal(new Set([...first.history,...older.history].map(e=>e.id)).size,32);
      assert.equal((await fetch(purchaseUrl+'/history?assetId='+savedAsset.id+'&before=bad',{headers:customerHeaders})).status,400);assert.equal((await fetch(purchaseUrl+'/history?assetId='+retryAsset.createId+'&before='+anchor,{headers:customerHeaders})).status,404);
      const legacy=await (await fetch(purchaseUrl+'?serial=Test-Serial-123',{headers:customerHeaders})).json();assert.equal(legacy.history.length,33);
    }finally{await purchaseHistoryDb.end();}
    const purchaseAuditDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await assert.rejects(purchaseAuditDb.query("UPDATE asset_purchase_history SET new_data='{}'::jsonb WHERE asset_id=$1",[savedAsset.id]),/append only/);await assert.rejects(purchaseAuditDb.query('DELETE FROM asset_purchase_history WHERE asset_id=$1',[savedAsset.id]),/append only/);}finally{await purchaseAuditDb.end();}
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['inventory'],expectedPermissions:['inventory','inventory_cost'],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(purchaseUrl+'?serial=Test-Serial-123',{headers:customerHeaders})).status,403);
    assert.equal((await fetch(purchaseUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...purchase,expectedVersion:1,supplierName:'Unauthorized'})})).status,403);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...asset,serialNumber:'test-serial-123'})})).status,409);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...asset,serialNumber:'Unique',productId:'missing'})})).status,404);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...asset,serialNumber:'Unique',status:'available'})})).status,400);
    const editedAsset={...asset,id:savedAsset.id,version:1,status:'qa'};
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(editedAsset)})).status,200);
    assert.equal((await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(editedAsset)})).status,409);
    const assetList=await (await fetch(inventoryUrl+'?search=serial-123&status=qa',{headers:customerHeaders})).json();
    assert.equal(assetList.total,1);assert.equal(assetList.assets[0].history.length,2);assert.equal(assetList.assets[0].history[0].actor_email,customerEmail);
    const inventorySnapshotDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
      let updatedDuringRead=false;const wrapped={connect:async()=>{const client=await inventorySnapshotDb.connect();return {query:async(...args)=>{const result=await client.query(...args);if(!updatedDuringRead&&String(args[0]).startsWith('SELECT a.*,p.name AS product_name')){updatedDuringRead=true;const response=await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...retryAsset,id:retryAsset.createId,createId:undefined,version:1,status:'qa',location:'New shelf'})});assert.equal(response.status,200);}return result;},release:()=>client.release()};}};
      const {listInventory}=await import('../inventory.mjs');const snapshot=await listInventory(wrapped,new URLSearchParams({search:'retry-asset-123',status:'received'}));assert.equal(updatedDuringRead,true);assert.equal(snapshot.total,1);assert.equal(snapshot.assets.length,1);assert.equal(snapshot.assets[0].status,'received');assert.equal(snapshot.assets[0].history[0].new_data.status,'received');
      const fresh=await listInventory(inventorySnapshotDb,new URLSearchParams({search:'retry-asset-123',status:'received'}));assert.equal(fresh.total,0);assert.equal(fresh.assets.length,0);const updated=await listInventory(inventorySnapshotDb,new URLSearchParams({search:'retry-asset-123',status:'qa'}));assert.equal(updated.assets[0].history[0].new_data.status,'qa');const replay=await fetch(inventoryUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(retryAsset)});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).asset,createdCopies[0]);const afterReplay=await listInventory(inventorySnapshotDb,new URLSearchParams({assetId:retryAsset.createId}));assert.equal(afterReplay.assets[0].status,'qa');assert.equal(afterReplay.assets[0].location,'New shelf');assert.equal(afterReplay.assets[0].history.length,2);
    }finally{await inventorySnapshotDb.end();}
    const historyDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await historyDb.query("INSERT INTO inventory_asset_history(asset_id,actor_user_id,new_data) SELECT $1,$2,jsonb_build_object('serial_number','HISTORY-'||n,'status','qa') FROM generate_series(1,30) n",[savedAsset.id,customerId]);}finally{await historyDb.end();}
    const limited=(await (await fetch(inventoryUrl+'?search=serial-123',{headers:customerHeaders})).json()).assets[0];assert.equal(limited.history.length,25);assert.equal(limited.historyHasMore,true);const inventoryHistoryUrl=inventoryUrl+'/history?assetId='+savedAsset.id+'&before='+limited.history.at(-1).id;const historyResult=await (await fetch(inventoryHistoryUrl,{headers:customerHeaders})).json();assert.equal(historyResult.history.length,7);assert.equal(historyResult.hasMore,false);assert.equal(new Set([...limited.history,...historyResult.history].map(h=>h.id)).size,32);assert.equal((await fetch(inventoryHistoryUrl)).status,403);assert.equal((await fetch(inventoryUrl+'/history?assetId='+savedAsset.id+'&before=bad',{headers:customerHeaders})).status,400);

    const otherInventoryHistoryDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);const otherInventoryId=(await otherInventoryHistoryDb.query('SELECT id::text FROM inventory_asset_history WHERE asset_id<>$1 LIMIT 1',[savedAsset.id])).rows[0].id;await otherInventoryHistoryDb.end();
    assert.equal((await fetch(inventoryUrl+'/history?assetId='+savedAsset.id+'&before='+otherInventoryId,{headers:customerHeaders})).status,404);assert.equal((await fetch(inventoryUrl+'/history?assetId='+savedAsset.id+'&before=999999999999999999',{headers:customerHeaders})).status,404);
    assert.equal(JSON.stringify(assetList).includes('Test supplier'),false);assert.equal(JSON.stringify(assetList).includes('12345'),false);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['service'],expectedPermissions:['inventory'],expectedRevision:await permissionVersion()})})).status,200);
    const serviceUrl=`http://127.0.0.1:${port}/api/admin/service`, serviceBody={serialNumber:'Test-Serial-123',description:'Screen issue',resolution:'',status:'open'};
    assert.equal((await fetch(inventoryUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(purchaseUrl+'?serial=Test-Serial-123',{headers:customerHeaders})).status,403);
    assert.equal((await fetch(serviceUrl,{method:'POST',headers:{...staffHeaders,origin:'http://evil.invalid'},body:JSON.stringify(serviceBody)})).status,403);
    assert.equal((await fetch(serviceUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify({...serviceBody,serialNumber:'missing'})})).status,404);
    const ticketResponse=await fetch(serviceUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(serviceBody)});assert.equal(ticketResponse.status,200);
    const ticket=(await ticketResponse.json()).ticket;
    assert.equal((await fetch(serviceUrl+'/replacement',{method:'POST',headers:staffHeaders,body:JSON.stringify({ticketId:ticket.id,action:'issue',serialNumber:'Test-Serial-123',notes:''})})).status,403);
    const ticketUpdate={...serviceBody,id:ticket.id,version:1,status:'resolved',resolution:'Cable replaced'};
    assert.equal((await fetch(serviceUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(ticketUpdate)})).status,200);
    assert.equal((await fetch(serviceUrl,{method:'POST',headers:staffHeaders,body:JSON.stringify(ticketUpdate)})).status,409);
    const foundTickets=await (await fetch(serviceUrl+'?search=serial-123&status=resolved',{headers:customerHeaders})).json();
    assert.equal(foundTickets.total,1);assert.equal(foundTickets.tickets[0].history.length,2);assert.equal(foundTickets.tickets[0].resolution,'Cable replaced');
    assert.equal(JSON.stringify(foundTickets).includes('Test supplier'),false);
    const unchangedAsset=await (await fetch(inventoryUrl+'?search=serial-123',{headers:adminHeaders})).json();assert.equal(unchangedAsset.assets[0].status,'qa');
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:[],expectedPermissions:['service'],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(serviceUrl,{headers:customerHeaders})).status,403);
    const contractsUrl=`http://127.0.0.1:${port}/api/admin/contracts`;
    assert.equal((await fetch(contractsUrl+'?review=unknown',{headers:adminHeaders})).status,400);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['contracts'],expectedPermissions:[],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(contractsUrl,{headers:customerHeaders})).status,200);
    assert.equal((await fetch(inventoryUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(usersUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:[],expectedPermissions:['contracts'],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(contractsUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(inventoryUrl,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(rolesUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:JSON.stringify({id:customerId,role:'admin',expectedRole:'customer',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:await permissionVersion()})})).status,403);
    assert.equal((await fetch(rolesUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:accounts.currentUserId,role:'customer',expectedRole:'admin',expectedRevision:(await (await fetch(usersUrl+'?search='+customerId,{headers:adminHeaders})).json()).users[0].role_revision,expectedActivationRevision:'0',expectedPermissionRevision:await permissionVersion()})})).status,400);
    assert.equal((await fetch(rolesUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,role:'admin',expectedRole:'customer',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(usersUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,200);
    assert.equal((await fetch(rolesUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,role:'customer',expectedRole:'customer',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:await permissionVersion()})})).status,409);
    assert.equal((await fetch(rolesUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,role:'customer',expectedRole:'admin',expectedRevision:(await (await fetch(usersUrl+'?search='+customerId,{headers:adminHeaders})).json()).users[0].role_revision,expectedActivationRevision:'0',expectedPermissionRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(usersUrl,{headers:{cookie:customer.headers.get('set-cookie')}})).status,403);
    const accessHistory=(await (await fetch(historyUrl,{headers:adminHeaders})).json()).events;
    assert.ok(accessHistory.some(e=>e.kind==='permissions'&&e.new_permissions.includes('orders')));
    assert.ok(accessHistory.some(e=>e.kind==='role'&&e.old_role==='customer'&&e.new_role==='admin'&&e.actor_email===adminEmail));
    assert.ok(accessHistory.some(e=>e.kind==='role'&&e.old_role==='admin'&&e.new_role==='customer'));
    assert.equal((await fetch(historyUrl,{headers:customerHeaders})).status,403);
    const activeUrl=`${usersUrl}/active`,disable={id:customerId,active:false,expectedActive:true,expectedRevision:'0',expectedRoleRevision:(await (await fetch(usersUrl+'?search='+customerId,{headers:adminHeaders})).json()).users[0].role_revision};
    assert.equal((await fetch(activeUrl,{method:'POST',headers:{...adminHeaders,...customerHeaders},body:JSON.stringify(disable)})).status,403);
    assert.equal((await fetch(activeUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:JSON.stringify(disable)})).status,403);
    assert.equal((await fetch(activeUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(disable)})).status,200);
    const disabledFilter=await (await fetch(`${usersUrl}?search=${customerId}&role=customer&active=inactive`,{headers:adminHeaders})).json();assert.equal(disabledFilter.total,1);assert.equal(disabledFilter.users[0].active,false);assert.equal((await (await fetch(`${usersUrl}?search=${customerId}&active=active`,{headers:adminHeaders})).json()).total,0);
    assert.equal((await fetch(activeUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(disable)})).status,409);
    assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/auth/me`,{headers:customerHeaders})).json()).user,null);
    assert.equal((await signIn(customerEmail,'client-password-123')).status,400);
    assert.equal((await fetch(activeUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,active:true,expectedActive:false,expectedRevision:disabledFilter.users[0].activation_revision,expectedRoleRevision:disabledFilter.users[0].role_revision})})).status,200);
    assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/auth/me`,{headers:customerHeaders})).json()).user,null);
    assert.equal((await signIn(customerEmail,'client-password-123')).status,200);
    const activationHistory=(await (await fetch(historyUrl,{headers:adminHeaders})).json()).events;assert.equal(activationHistory.filter(e=>e.kind==='activation').length,2);
    const dbForUsers=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
    const marker=randomUUID();
    for(let i=0;i<27;i++) await dbForUsers.query('INSERT INTO users (id,email,password_hash,role) VALUES ($1,$2,$3,$4)',[randomUUID(),`${marker}-${i}@example.invalid`,'test-hash','customer']);
    await dbForUsers.end();
    const pageOne=await (await fetch(`${usersUrl}?search=${marker}`,{headers:{...adminHeaders,connection:"close"}})).json();
    const pageTwo=await (await fetch(`${usersUrl}?search=${marker}&offset=25`,{headers:{...adminHeaders,connection:"close"}})).json();
    assert.equal(pageOne.total,27);assert.equal(pageOne.users.length,25);assert.equal(pageOne.hasMore,true);assert.equal(pageTwo.users.length,2);
    assert.equal((await fetch(`${usersUrl}?offset=-1`,{headers:{...adminHeaders,connection:"close"}})).status,400);
    const orgUrl=`http://127.0.0.1:${port}/api/admin/organizations`;
    const org={name:'Example Company',registrationNumber:'123',contactName:'Tester',email:'test@example.invalid',phone:'123',address:'Test address'};
    const orgBody=JSON.stringify(org);
    assert.equal((await fetch(orgUrl)).status,403);
    assert.equal((await fetch(orgUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:orgBody})).status,403);
    assert.equal((await fetch(orgUrl,{method:'POST',headers:{...adminHeaders,cookie:customer.headers.get('set-cookie')},body:orgBody})).status,403);
    const companyMarker='company-page-'+randomUUID(),companyPageDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await companyPageDb.query("INSERT INTO organizations(id,name) SELECT gen_random_uuid()::text,$1||'-'||lpad(n::text,2,'0') FROM generate_series(1,30) n",[companyMarker]);const url=orgUrl+'?search='+encodeURIComponent(companyMarker);const first=await (await fetch(url,{headers:adminHeaders})).json();const oldNext=await (await fetch(url+'&offset=25',{headers:adminHeaders})).json();assert.equal(first.organizations.length,25);assert.equal(first.cursorSupported,true);assert.equal(first.hasMore,true);assert.ok(first.nextCursor);await companyPageDb.query('INSERT INTO organizations(id,name) VALUES($1,$2)',[randomUUID(),companyMarker+'-00']);const next=await (await fetch(url+'&before='+encodeURIComponent(first.nextCursor),{headers:adminHeaders})).json();assert.deepEqual(next.organizations.map(o=>o.id),oldNext.organizations.map(o=>o.id));assert.equal(new Set([...first.organizations,...next.organizations].map(o=>o.id)).size,30);assert.equal((await fetch(url+'&before=bad',{headers:adminHeaders})).status,400);assert.equal((await fetch(url+'&offset=25&before='+encodeURIComponent(first.nextCursor),{headers:adminHeaders})).status,400);assert.equal((await fetch(url+'&before='+encodeURIComponent(first.nextCursor),{headers:customerHeaders})).status,403);await companyPageDb.query("DELETE FROM organizations WHERE strpos(name,$1)=1",[companyMarker]);}finally{await companyPageDb.end();}
    const retryOrg={...org,name:'Retry Company',createId:randomUUID()};const concurrentOrgs=await Promise.all([1,2,3].map(()=>fetch(orgUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(retryOrg)})));assert.deepEqual(concurrentOrgs.map(r=>r.status),[200,200,200]);assert.ok((await Promise.all(concurrentOrgs.map(r=>r.json()))).every(x=>x.organization.id===retryOrg.createId));assert.equal((await fetch(orgUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...retryOrg,name:'Changed'})})).status,409);
    const createdOrg=await fetch(orgUrl,{method:'POST',headers:adminHeaders,body:orgBody});assert.equal(createdOrg.status,200);
    const savedOrg=(await createdOrg.json()).organization;assert.equal(savedOrg.name,org.name);
    const userLinkUrl=`http://127.0.0.1:${port}/api/admin/users/organization`, userLink=JSON.stringify({id:customerId,organizationId:savedOrg.id,expectedVersion:1});
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:{...adminHeaders,cookie:customer.headers.get('set-cookie')},body:userLink})).status,403);
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:userLink})).status,403);
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:adminHeaders,body:userLink})).status,200);
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:adminHeaders,body:userLink})).status,409);
    assert.equal((await fetch(`${usersUrl}?organizationId=${savedOrg.id}`,{headers:customerHeaders})).status,403);assert.equal((await fetch(`${usersUrl}?organizationId=bad`,{headers:adminHeaders})).status,400);const companyUsers=await (await fetch(`${usersUrl}?organizationId=${savedOrg.id}`,{headers:adminHeaders})).json();assert.equal(companyUsers.total,1);assert.equal(companyUsers.users[0].id,customerId);assert.equal((await (await fetch(`${usersUrl}?organizationId=${randomUUID()}`,{headers:adminHeaders})).json()).total,0);
    const linkedUser=(await (await fetch(`${usersUrl}?search=${encodeURIComponent(customerEmail)}`,{headers:adminHeaders})).json()).users[0];
    assert.equal(linkedUser.organization_id,savedOrg.id);assert.equal(linkedUser.organization_history[0].actor_email,adminEmail);assert.equal(linkedUser.role,'customer');assert.equal(linkedUser.first_name,'Test');
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,organizationId:randomUUID(),expectedVersion:2})})).status,404);
    assert.equal((await fetch(userLinkUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,organizationId:null,expectedVersion:2})})).status,200);
    const unlinkedUser=(await (await fetch(`${usersUrl}?search=${encodeURIComponent(customerEmail)}`,{headers:adminHeaders})).json()).users[0];
    assert.equal(unlinkedUser.organization_id,null);assert.equal(unlinkedUser.organization_history.length,2);
    const userHistoryDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await userHistoryDb.query("INSERT INTO user_organization_history(user_id,previous_organization_name,new_organization_name,actor_user_id) SELECT $1,'Previous','Current',(SELECT id FROM users WHERE email=$2) FROM generate_series(1,30)",[customerId,adminEmail]);}finally{await userHistoryDb.end();}
    const historyAccount=(await (await fetch(`${usersUrl}?search=${customerId}`,{headers:adminHeaders})).json()).users[0];assert.equal(historyAccount.organization_history.length,25);assert.equal(historyAccount.organization_history_has_more,true);
    const userOrgHistoryUrl=`http://127.0.0.1:${port}/api/admin/users/organization-history?userId=${customerId}&before=${historyAccount.organization_history.at(-1).id}`;
    assert.equal((await fetch(userOrgHistoryUrl)).status,403);assert.equal((await fetch(userOrgHistoryUrl,{headers:customerHeaders})).status,403);
    const olderUserLinks=await (await fetch(userOrgHistoryUrl,{headers:adminHeaders})).json();assert.equal(olderUserLinks.history.length,7);assert.equal(olderUserLinks.hasMore,false);assert.equal(new Set([...historyAccount.organization_history,...olderUserLinks.history].map(e=>e.id)).size,32);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/users/organization-history?userId=${customerId}&before=bad`,{headers:adminHeaders})).status,400);
    const accessAuditDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{for(const table of ['user_organization_history','staff_permission_history','user_role_history','user_activation_history']){assert.ok((await accessAuditDb.query(`SELECT 1 FROM ${table} WHERE user_id=$1 LIMIT 1`,[customerId])).rowCount);await assert.rejects(accessAuditDb.query(`UPDATE ${table} SET actor_user_id=actor_user_id WHERE user_id=$1`,[customerId]),/append only/);await assert.rejects(accessAuditDb.query(`DELETE FROM ${table} WHERE user_id=$1`,[customerId]),/append only/);}}finally{await accessAuditDb.end();}
    assert.equal((await (await fetch(`${orgUrl}?search=Example`,{headers:adminHeaders})).json()).organizations[0].id,savedOrg.id);
    const updateOrg={...org,id:savedOrg.id,version:1,name:'Updated Company'};
    assert.equal((await fetch(orgUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(updateOrg)})).status,200);
    assert.equal((await fetch(orgUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(updateOrg)})).status,409);
    assert.equal((await fetch(orgUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...org,email:'bad'})})).status,400);
    const orgHistory=orgUrl+'/history?id='+savedOrg.id;assert.equal((await fetch(orgHistory)).status,403);assert.equal((await fetch(orgHistory,{headers:customerHeaders})).status,403);const orgEvents=(await (await fetch(orgHistory,{headers:adminHeaders})).json()).events;assert.equal(orgEvents.length,2);assert.equal(orgEvents[0].previous_data.name,'Example Company');assert.equal(orgEvents[0].new_data.name,'Updated Company');assert.equal(orgEvents[0].actor_email,adminEmail);assert.equal(orgEvents[1].previous_data,null);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:['orders'],expectedPermissions:[],expectedRevision:await permissionVersion()})})).status,200);
    assert.equal((await fetch(orgHistory,{headers:customerHeaders})).status,403);
    assert.equal((await fetch(permissionsUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({id:customerId,permissions:[],expectedPermissions:['orders'],expectedRevision:await permissionVersion()})})).status,200);
    const orgAuditDb=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{await assert.rejects(orgAuditDb.query('UPDATE organization_history SET new_data=$1 WHERE organization_id=$2',[JSON.stringify({name:'altered'}),savedOrg.id]),/append only/);await assert.rejects(orgAuditDb.query('DELETE FROM organization_history WHERE organization_id=$1',[savedOrg.id]),/append only/);}finally{await orgAuditDb.end();}
    const contactUrl = `http://127.0.0.1:${port}/api/contact`;
    assert.equal((await fetch(contactUrl, { method:'POST', headers:{ 'content-type':'application/json', origin:'http://evil.invalid' }, body:'{}' })).status,403);
    assert.equal((await fetch(contactUrl, { method:'POST', headers:adminHeaders, body:JSON.stringify({name:'',email:'invalid',phone:'',message:'x'}) })).status,400);
    for (const section of ['workspace', 'featured', 'calculator', 'story', 'faq', 'about', 'contact']) {
      const sectionUrl = `http://127.0.0.1:${port}/api/admin/site/${section}`;
      assert.equal((await fetch(sectionUrl)).status, 403);
      assert.equal((await fetch(sectionUrl, { headers: { cookie: customer.headers.get('set-cookie') } })).status, 403);
      const original = await (await fetch(sectionUrl, { headers: adminHeaders })).json();
      const edited = { ...original, content: { ...original.content, titleEn: `Test ${section}` } };
      const saved = await fetch(sectionUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(edited) });
      assert.equal(saved.status, 200);
      const savedBlock = await saved.json();
      assert.equal(savedBlock.version, original.version + 1);
      assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/${section}`)).json()).content.titleEn, `Test ${section}`);
      assert.equal((await fetch(sectionUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(edited) })).status, 409);
      assert.equal((await fetch(sectionUrl, { method: 'POST', headers: { ...adminHeaders, origin: 'http://evil.invalid' }, body: JSON.stringify(savedBlock) })).status, 403);
      assert.equal((await fetch(sectionUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...savedBlock, content: { ...savedBlock.content, titleEn: '' } }) })).status, 400);
      if (section === 'calculator') {
        const updated={...savedBlock,content:{...savedBlock.content,preset7En:'Seven days test',preset7He:'שבעה ימי בדיקה',leaseModeEn:'Custom lease',leaseUnavailableHe:'ליסינג חסום לבדיקה',priceOnRequestEn:'Contact for price'}};
        const changed=await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(updated)});assert.equal(changed.status,200);
        const current=await changed.json();assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/calculator`)).json()).content.preset7En,'Seven days test');
        assert.equal((await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...current,content:{...current.content,preset7En:''}})})).status,400);
        const legacy={...current,content:Object.fromEntries(Object.entries(current.content).filter(([k])=>!/^(?:preset|leaseMode|leaseUnavailable|priceOnRequest)/.test(k)))};
        const legacySave=await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(legacy)});assert.equal(legacySave.status,200);const afterLegacy=await legacySave.json();assert.equal(afterLegacy.content.preset7En,'Seven days test');assert.equal(afterLegacy.content.leaseModeEn,'Custom lease');assert.equal(afterLegacy.content.leaseUnavailableHe,'ליסינג חסום לבדיקה');assert.equal(afterLegacy.content.priceOnRequestEn,'Contact for price');
        const competing=['First editor','Second editor'].map(titleEn=>fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...afterLegacy,content:{...afterLegacy.content,titleEn}})}));
        const results=await Promise.all(competing);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winning=await results.find(r=>r.status===200).json();const published=await (await fetch(`http://127.0.0.1:${port}/api/site/calculator`)).json();assert.equal(published.content.titleEn,winning.content.titleEn);assert.equal(published.content.priceOnRequestEn,'Contact for price');
      }
      if (section === 'contact') {
        const updated={...savedBlock,content:{...savedBlock.content,recipientEmail:'private@example.invalid',publicEmail:'public@example.invalid',publicPhone:'+972 50 123 4567',publicWhatsApp:'972501234567'}};
        assert.equal((await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(updated)})).status,200);
        const publicBlock=(await (await fetch(`http://127.0.0.1:${port}/api/site/contact`)).json()).content;assert.equal(publicBlock.publicEmail,'public@example.invalid');assert.equal(publicBlock.publicPhone,'+972 50 123 4567');assert.equal(publicBlock.publicWhatsApp,'972501234567');assert.equal(publicBlock.recipientEmail,undefined);
        const latest=await (await fetch(sectionUrl,{headers:adminHeaders})).json();assert.equal(latest.content.recipientEmail,'private@example.invalid');
        for(const data of [{publicEmail:'bad address'},{publicPhone:'tel:123?x=1'},{publicWhatsApp:'+972501234567'},{publicWhatsApp:'012345678'}])assert.equal((await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...latest,content:{...latest.content,...data}})})).status,400);
        assert.equal((await fetch(sectionUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...latest,content:{...latest.content,publicEmail:'',publicPhone:'',publicWhatsApp:''}})})).status,200);
      }
      if (section === 'story' || section === 'faq') {
        const field = section === 'story' ? 'step1TitleEn' : 'answer1En';
        const updated = { ...savedBlock, content: { ...savedBlock.content, [field]: `Changed ${section}` } };
        assert.equal((await fetch(sectionUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(updated) })).status, 200);
        assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/${section}`)).json()).content[field], `Changed ${section}`);
      }
      if (section === 'faq') {
        const latest = await (await fetch(sectionUrl, { headers: adminHeaders })).json();
        const largeContent = Object.fromEntries(Object.entries(latest.content).map(([key, value]) => [key, typeof value === 'string' ? 'א'.repeat(500) : value]));
        assert.equal((await fetch(sectionUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...latest, content: largeContent }) })).status, 200);
      }
    }
    const footerUrl=`http://127.0.0.1:${port}/api/admin/site/footer`;assert.equal((await fetch(footerUrl)).status,403);assert.equal((await fetch(footerUrl,{headers:customerHeaders})).status,403);const footer=await (await fetch(footerUrl,{headers:adminHeaders})).json();const footerEdit={...footer,content:{...footer.content,taglineEn:'Updated footer',showContact:true}};const footerSave=await fetch(footerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(footerEdit)});assert.equal(footerSave.status,200);const publicFooter=(await (await fetch(`http://127.0.0.1:${port}/api/site/footer`)).json()).content;assert.equal(publicFooter.taglineEn,'Updated footer');assert.equal(publicFooter.showContact,true);assert.equal((await fetch(footerUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(footerEdit)})).status,409);assert.equal((await fetch(footerUrl,{method:'POST',headers:{...adminHeaders,origin:'http://evil.invalid'},body:JSON.stringify(await footerSave.json())})).status,403);
    const navUrl=`http://127.0.0.1:${port}/api/admin/site/navigation`;assert.equal((await fetch(navUrl,{headers:customerHeaders})).status,403);const nav=await (await fetch(navUrl,{headers:adminHeaders})).json();assert.equal((await fetch(navUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...nav,content:{...nav.content,modelsEn:'x'.repeat(41)}})})).status,400);assert.equal((await fetch(navUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...nav,content:{...nav.content,visible:false}})})).status,400);const navSave=await fetch(navUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...nav,content:{...nav.content,modelsEn:'Browse models'}})});assert.equal(navSave.status,200);assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/navigation`)).json()).content.modelsEn,'Browse models');assert.equal((await fetch(navUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(nav)})).status,409);
    const layoutUrl = `http://127.0.0.1:${port}/api/admin/site/layout`;
    assert.equal((await fetch(layoutUrl,{headers:customerHeaders})).status,403);
    const layout = await (await fetch(layoutUrl,{headers:adminHeaders})).json();
    assert.deepEqual(layout.content.order,['hero','trust','featured','calculator','story','workspace','faq']);
    for (const order of [layout.content.order.slice(1), [...layout.content.order.slice(0,-1),'hero'], [...layout.content.order.slice(0,-1),'unknown']]) assert.equal((await fetch(layoutUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...layout,content:{order}})})).status,400);
    const reordered = [...layout.content.order]; [reordered[0],reordered[1]] = [reordered[1],reordered[0]];
    assert.equal((await fetch(layoutUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...layout,content:{order:reordered}})})).status,200);
    assert.deepEqual((await (await fetch(`http://127.0.0.1:${port}/api/site/layout`)).json()).content.order,reordered);
    assert.equal((await fetch(layoutUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify(layout)})).status,409);
    assert.deepEqual((await (await fetch(`http://127.0.0.1:${port}/api/admin/site/history?key=layout`,{headers:adminHeaders})).json()).events[0].previous_content.order,layout.content.order);
    const heroUrl = `http://127.0.0.1:${port}/api/admin/site/hero`;
    assert.equal((await fetch(heroUrl)).status, 403);
    assert.equal((await fetch(heroUrl, { headers: { cookie: customer.headers.get('set-cookie') } })).status, 403);
    const initialHero = await (await fetch(heroUrl, { headers: adminHeaders })).json();
    const changedHero = { ...initialHero, content: { ...initialHero.content, titleEn: 'Test heading', imageUrl: 'https://example.invalid/banner.jpg',primaryAction:'contact' } };
    const saveHero = await fetch(heroUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(changedHero) });
    assert.equal(saveHero.status, 200);
    const savedHero = await saveHero.json();
    assert.equal(savedHero.version, initialHero.version + 1);assert.equal(savedHero.content.primaryAction,'contact');
    const siteHistoryUrl=`http://127.0.0.1:${port}/api/admin/site/history?key=hero`;
    assert.equal((await fetch(siteHistoryUrl)).status,403);assert.equal((await fetch(siteHistoryUrl,{headers:customerHeaders})).status,403);
    const heroHistory=await (await fetch(siteHistoryUrl,{headers:adminHeaders})).json();assert.equal(heroHistory.events[0].actor_email,adminEmail);assert.equal(heroHistory.events[0].previous_content.titleEn,initialHero.content.titleEn);assert.equal(heroHistory.events[0].new_content.titleEn,'Test heading');
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/site/history?key=wrong`,{headers:adminHeaders})).status,400);
    assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/hero`)).json()).content.titleEn, 'Test heading');
    assert.equal((await fetch(heroUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(changedHero) })).status, 409);
    assert.equal((await fetch(heroUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...savedHero, content: { ...savedHero.content, imageUrl: 'javascript:alert(1)' } }) })).status, 400);
    assert.equal((await fetch(heroUrl, { method: 'POST', headers: { ...adminHeaders, origin: 'http://evil.invalid' }, body: JSON.stringify(savedHero) })).status, 403);
    const heroAlt=await (await fetch(heroUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...savedHero,content:{...savedHero.content,imageAltHe:'תמונה',imageAltEn:'Banner image'}})})).json();assert.equal(heroAlt.content.imageAltEn,'Banner image');
    const {imageAltHe:ignoredHeroHe,imageAltEn:ignoredHeroEn,...legacyHeroContent}=heroAlt.content;const legacyHeroAltSave=await (await fetch(heroUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...heroAlt,content:legacyHeroContent})})).json();assert.equal(legacyHeroAltSave.content.imageAltEn,'Banner image');
    const aboutUrl=`http://127.0.0.1:${port}/api/admin/site/about`;const aboutBefore=await (await fetch(aboutUrl,{headers:adminHeaders})).json();const aboutSaved=await (await fetch(aboutUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...aboutBefore,content:{...aboutBefore.content,imageAltHe:'תמונה',imageAltEn:'About image'}})})).json();const {imageAltHe:ignoredAboutHe,imageAltEn:ignoredAboutEn,...legacyAboutContent}=aboutSaved.content;const aboutLegacy=await (await fetch(aboutUrl,{method:'POST',headers:adminHeaders,body:JSON.stringify({...aboutSaved,content:legacyAboutContent})})).json();assert.equal(aboutLegacy.content.imageAltEn,'About image');assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/site/about`)).json()).content.imageAltEn,'About image');
    const legacyDb = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
    const { primaryAction: _primaryAction, secondaryAction: _secondaryAction, ...legacyHero } = savedHero.content;
    await legacyDb.query("UPDATE site_blocks SET content = $1 WHERE block_key = 'hero'", [legacyHero]);
    await legacyDb.end();
    const legacyRead = await (await fetch(heroUrl, { headers: adminHeaders })).json();
    assert.equal(legacyRead.content.primaryAction, 'models');
    assert.equal(legacyRead.content.secondaryAction, 'calculator');
    assert.equal(legacyRead.content.titleEn, 'Test heading');
    assert.equal((await fetch(heroUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(legacyRead) })).status, 200);
    const initialTrust = await (await fetch(trustUrl, { headers: adminHeaders })).json();
    const editedTrust = { ...initialTrust, content: { ...initialTrust.content, titleEn: 'Test editable heading' } };
    const writeTrust = await fetch(trustUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(editedTrust) });
    assert.equal(writeTrust.status, 200);
    const savedTrust = await writeTrust.json();
    assert.equal(savedTrust.version, initialTrust.version + 1);
    const rereadTrust = await (await fetch(`http://127.0.0.1:${port}/api/site/trust`)).json();
    assert.equal(rereadTrust.content.titleEn, 'Test editable heading');
    assert.equal((await fetch(trustUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify(editedTrust) })).status, 409);
    assert.equal((await fetch(trustUrl, { method: 'POST', headers: { ...adminHeaders, origin: 'http://evil.invalid' }, body: JSON.stringify(savedTrust) })).status, 403);
    assert.equal((await fetch(trustUrl, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ ...savedTrust, content: { ...savedTrust.content, titleEn: '' } }) })).status, 400);
    const customerProducts = await fetch(`http://127.0.0.1:${port}/api/admin/products`, {headers:{cookie:customer.headers.get('set-cookie')}});
    assert.equal(customerProducts.status, 403);
    const deniedWrite = await fetch(`http://127.0.0.1:${port}/api/admin/products`, { method:'POST',headers:{cookie:customer.headers.get('set-cookie'),'content-type':'application/json',origin:'http://localhost:3000'},body:'{}' });
    assert.equal(deniedWrite.status, 403);
    const adminProducts = await fetch(`http://127.0.0.1:${port}/api/admin/products`, {headers:{cookie:admin.headers.get('set-cookie')}});
    assert.equal(adminProducts.status, 200);
    const adminView = await fetch(`http://127.0.0.1:${port}/api/admin/requests`, {headers:{cookie:admin.headers.get('set-cookie')}});
    assert.equal(adminView.status, 200);
    assert.ok((await adminView.json()).requests.length > 0);
    const badOrigin = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {method:'POST',headers:{'content-type':'application/json',origin:'http://evil.invalid'},body:'{}'});
    assert.equal(badOrigin.status, 403);
    assert.equal((await fetch(`http://127.0.0.1:${port}/users`)).status, 404);
  } finally { child.kill(); await once(child, 'exit'); }
});


test('logout remains available after authentication rate limit', async () => {
  const database = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  const email = randomUUID() + '@example.invalid';
  await register(database, email, 'test-password-123', 'customer');
  await database.end();
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PC_LEASE_SERVER_PORT: String(port), PC_LEASE_DATABASE_URL: process.env.PC_LEASE_TEST_DATABASE_URL }, stdio: ['ignore','pipe','inherit'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(([code]) => { throw Error('Server exited: ' + code); })]);
    const base = 'http://127.0.0.1:' + port, headers = { 'content-type':'application/json', origin:'http://localhost:3000' };
    const login = password => fetch(base+'/api/auth/login', {method:'POST',headers,body:JSON.stringify({email,password})});
    const signedIn = await login('test-password-123'); assert.equal(signedIn.status,200);
    const cookie = signedIn.headers.get('set-cookie');
    for(let i=0;i<9;i++) assert.equal((await login('incorrect-password')).status,400);
    assert.equal((await login('incorrect-password')).status,429);
    assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,origin:'https://attacker.invalid',cookie},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,cookie},body:'{}'})).status,200);
    const me = await fetch(base+'/api/auth/me',{headers:{cookie}});
    assert.equal((await me.json()).user,null);
    assert.equal((await login('test-password-123')).status,429);
  } finally { child.kill(); await once(child,'exit'); }
});

 test('legacy contact settings preserve the existing public address',async()=>{const {getSection}=await import('../site-blocks.mjs');const {sectionDefaults}=await import('../../src/data/section-defaults.mjs');const {publicEmail,publicPhone,publicWhatsApp,...old}=sectionDefaults.contact;old.recipientEmail='old@example.invalid';const db={query:async()=>({rowCount:1,rows:[{content:old,version:7}]})};const block=await getSection(db,'contact');assert.equal(block.content.publicEmail,old.recipientEmail);assert.equal(block.content.publicPhone,'');assert.equal(block.content.publicWhatsApp,'');assert.equal(block.version,7);});
 test('legacy calculator preserves saved headings and fills new labels',async()=>{const {getSection}=await import('../site-blocks.mjs');const db={query:async()=>({rowCount:1,rows:[{content:{visible:true,kickerHe:'א',kickerEn:'A',titleHe:'ב',titleEn:'Saved heading',subtitleHe:'ג',subtitleEn:'C'},version:3}]})};const block=await getSection(db,'calculator');assert.equal(block.content.titleEn,'Saved heading');assert.equal(block.content.continueCtaEn,'Continue to order or estimate');assert.equal(block.content.priceOnRequestEn,'Price on request');assert.equal(block.content.leaseModeEn,'Lease for 36 months');assert.equal(block.content.leaseUnavailableHe,'ליסינג לא זמין');assert.equal(block.version,3);});
