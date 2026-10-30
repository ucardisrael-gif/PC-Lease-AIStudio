import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {openDatabase} from '../database.mjs';
import {register} from '../auth.mjs';

test('custom roles grant, change and revoke access for existing sessions',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
 const admin=await register(db,randomUUID()+'@example.invalid','test-password-123');
 const staff=await register(db,randomUUID()+'@example.invalid','test-password-123');
 const staff2=await register(db,randomUUID()+'@example.invalid','test-password-123');
 await db.query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);
 const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
 const server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PC_LEASE_SERVER_PORT:String(port),PC_LEASE_DATABASE_URL:process.env.PC_LEASE_TEST_DATABASE_URL},stdio:['ignore','pipe','inherit']});
 try{
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server exited');})]);
  const base=`http://127.0.0.1:${port}`,origin='http://127.0.0.1:3000';
  async function login(user){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:user.email,password:'test-password-123'})});assert.equal(r.status,200);return {origin,'content-type':'application/json',cookie:r.headers.get('set-cookie')};}
  const ah=await login(admin),sh=await login(staff),post=(path,headers,body)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/api/admin/access-roles',{headers:sh})).status,403);
  const created=await post('/api/admin/access-roles',ah,{id:null,name:'Test '+randomUUID(),permissions:['orders']});assert.equal(created.status,200);const role=(await created.json()).role;
  assert.equal((await post('/api/admin/access-roles/assign',sh,{userId:staff.id,roles:[role.id],expectedRoles:[],expectedVersion:1})).status,403);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[role.id],expectedRoles:[],expectedVersion:1})).status,200);
  assert.equal((await fetch(base+'/api/admin/requests',{headers:sh})).status,200);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh})).status,403);
  assert.equal((await post('/api/admin/access-roles',ah,{id:role.id,name:role.name,permissions:['finance'],version:role.version})).status,200);
  assert.equal((await fetch(base+'/api/admin/requests',{headers:sh})).status,403);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh})).status,200);
  assert.equal((await post('/api/admin/access-roles',ah,{id:role.id,name:role.name,permissions:['orders'],version:role.version})).status,409);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[],expectedRoles:[role.id],expectedVersion:3})).status,200);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh})).status,403);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[role.id],expectedRoles:[],expectedVersion:1})).status,409);
  assert.equal((await post('/api/admin/access-roles',ah,{id:null,name:role.name,permissions:[]})).status,409);
  await db.query("INSERT INTO staff_permissions(user_id,permission) VALUES($1,'catalog')",[staff.id]);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[role.id],expectedRoles:[],expectedVersion:4})).status,200);
  assert.equal((await fetch(base+'/api/admin/products',{headers:sh})).status,200);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[],expectedRoles:[role.id],expectedVersion:5})).status,200);
  assert.equal((await fetch(base+'/api/admin/products',{headers:sh})).status,200);
  assert.equal((await post('/api/admin/access-roles',ah,{id:null,name:'Invalid',permissions:['invented']})).status,400);
  const getRoles=async()=>(await (await fetch(base+'/api/admin/access-roles',{headers:ah})).json()).roles;
  const oldRole=(await getRoles()).find(r=>r.id===role.id);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[role.id,'sales'],expectedRoles:[],expectedVersion:6})).status,200);
  assert.equal((await post('/api/admin/access-roles/delete',ah,{id:role.id,version:oldRole.version,assignmentFingerprint:oldRole.assignment_fingerprint})).status,409);
  await db.query("INSERT INTO staff_permissions(user_id,permission) VALUES($1,'finance')",[staff2.id]);
  const sh2=await login(staff2);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff2.id,roles:[role.id],expectedRoles:[],expectedVersion:1})).status,200);
  const assignedRole=(await getRoles()).find(r=>r.id===role.id);
  assert.equal(assignedRole.user_count,2);
  assert.equal((await post('/api/admin/access-roles/delete',sh,{id:role.id,version:assignedRole.version,assignmentFingerprint:assignedRole.assignment_fingerprint})).status,403);
  assert.equal((await post('/api/admin/access-roles/delete',{...ah,origin:'https://evil.invalid'},{id:role.id,version:assignedRole.version,assignmentFingerprint:assignedRole.assignment_fingerprint})).status,403);
  assert.equal((await post('/api/admin/access-roles/delete',ah,{id:role.id,version:assignedRole.version-1,assignmentFingerprint:assignedRole.assignment_fingerprint})).status,409);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh})).status,200);
  assert.equal((await post('/api/admin/access-roles/delete',ah,{id:role.id,version:assignedRole.version,assignmentFingerprint:assignedRole.assignment_fingerprint})).status,200);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh})).status,403);
  assert.equal((await fetch(base+'/api/admin/finance',{headers:sh2})).status,200);
  assert.equal((await fetch(base+'/api/admin/products',{headers:sh})).status,200);
  assert.equal((await fetch(base+'/api/admin/requests',{headers:sh})).status,200);
  assert.equal((await post('/api/admin/access-roles/assign',ah,{userId:staff.id,roles:[],expectedRoles:[role.id,'sales'],expectedVersion:7})).status,409);
  assert.equal((await fetch(base+'/api/admin/access-roles/history',{headers:sh})).status,403);
  const history=await (await fetch(base+'/api/admin/access-roles/history',{headers:ah})).json();
  assert.ok(history.events.some(e=>e.action==='delete'&&e.role_id===role.id&&e.before_data.name===role.name&&e.after_data.removedUserCount===2));
  assert.ok(history.events.some(e=>e.action==='assign'&&e.target_email===staff.email));assert.equal(history.roleNames[role.id],role.name);
  assert.equal((await fetch(base+'/api/admin/access-roles/history?before=bad',{headers:ah})).status,400);
  await db.query("INSERT INTO access_role_history(actor_id,action,role_id,before_data,after_data) SELECT $1,'update','sales','{}'::jsonb,'{}'::jsonb FROM generate_series(1,27)",[admin.id]);
  const first=await (await fetch(base+'/api/admin/access-roles/history',{headers:ah})).json();assert.equal(first.events.length,25);assert.equal(first.hasMore,true);
  const second=await (await fetch(base+'/api/admin/access-roles/history?before='+first.events.at(-1).id,{headers:ah})).json();assert.ok(second.events.length);assert.ok(second.events.every(e=>!first.events.some(x=>x.id===e.id)));


 }finally{server.kill();await db.end();}
});
