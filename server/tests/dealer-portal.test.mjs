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
  assert.equal((await (await fetch(base+'/api/auth/me',{headers:ha})).json()).user.dealerAccess,true);
  const roleGrant=await fetch(base+'/api/admin/access-roles/assign',{method:'POST',headers:ah,body:JSON.stringify({userId:a.id,roles:['sales'],expectedRoles:[],expectedVersion:1})});assert.equal(roleGrant.status,409);
  const permissionGrant=await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:a.id,permissions:['orders'],expectedPermissions:[],expectedRevision:'0:0:0'})});assert.equal(permissionGrant.status,409);
  assert.equal((await fetch(base+'/api/admin/users/permissions',{method:'POST',headers:ah,body:JSON.stringify({id:visitor.id,permissions:['orders'],expectedPermissions:[],expectedRevision:'0:0:0'})})).status,200);
  assert.equal((await post(ah,{userId:visitor.id,dealerId:da.id,expectedVersion:1})).status,409);

  const ar=await (await fetch(base+'/api/dealer/orders?dealerId='+dbb.id,{headers:ha})).json(),br=await (await fetch(base+'/api/dealer/orders',{headers:hb})).json();assert.deepEqual(ar.orders.map(x=>x.id),[oa]);assert.deepEqual(br.orders.map(x=>x.id),[ob]);assert.equal(JSON.stringify(ar).includes('OnlyB'),false);assert.equal('contractTotalMinor' in (ar.orders[0].items[0]||{}),false);
  const clients=await (await fetch(base+'/api/dealer/clients?dealerId='+dbb.id,{headers:ha})).json();assert.deepEqual(clients.clients.map(x=>x.company),['OnlyA']);assert.equal((await fetch(base+'/api/dealer/orders?before='+ob,{headers:ha})).status,400);assert.equal((await fetch(base+'/api/admin/requests',{headers:ha})).status,403);assert.equal((await fetch(base+'/api/admin/users',{headers:ha})).status,403);
  assert.equal((await post(ah,{userId:a.id,dealerId:dbb.id,expectedVersion:2})).status,200);
  const switched=await (await fetch(base+'/api/dealer/orders',{headers:ha})).json();assert.deepEqual(switched.orders.map(x=>x.id),[ob]);assert.equal(JSON.stringify(switched).includes('OnlyA'),false);
  assert.equal((await post(ah,{userId:a.id,dealerId:da.id,expectedVersion:3})).status,200);
  assert.equal((await post(ah,{userId:a.id,dealerId:null,expectedVersion:1})).status,409);assert.equal((await post(ah,{userId:a.id,dealerId:null,expectedVersion:4})).status,200);assert.equal((await fetch(base+'/api/dealer/orders',{headers:ha})).status,403);assert.equal((await (await fetch(base+'/api/auth/me',{headers:ha})).json()).user.dealerAccess,false);
  await db.query('UPDATE dealers SET active=false WHERE id=$1',[dbb.id]);assert.equal((await fetch(base+'/api/dealer/clients',{headers:hb})).status,403);
 }finally{server.kill();await db.end();}
});
