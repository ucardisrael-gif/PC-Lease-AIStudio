import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../database.mjs';
import { register, login, currentUser, beginReset, finishReset, verifyPassword } from '../auth.mjs';
import { setUserActive, listAccessHistory, listUsers, saveStaffPermissions, changeUserRole, saveUserProfileAsAdmin, linkUserOrganization } from '../admin-users.mjs';
import {sendVerification,confirmVerification} from '../email-verification.mjs';
import {getTaxSettings,saveTaxSettings,listTaxSettingsHistory} from '../tax-settings.mjs';

test('tax history cursor stays stable when another administrator changes settings',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const created=(await db.query('INSERT INTO tax_settings_history(actor_user_id,previous_basis_points,new_basis_points) SELECT $1,1800,1700 FROM generate_series(1,30) RETURNING id::text',[admin.id])).rows.map(row=>row.id);
  const first=await listTaxSettingsHistory(db,new URLSearchParams());assert.equal(first.cursorSupported,true);assert.equal(first.events.length,25);assert.ok(first.hasMore);
  const anchor=first.events.at(-1).id;
  await db.query('INSERT INTO tax_settings_history(actor_user_id,previous_basis_points,new_basis_points) VALUES($1,1700,1800)',[admin.id]);
  const second=await listTaxSettingsHistory(db,new URLSearchParams({before:anchor}));const seen=new Set([...first.events,...second.events].map(row=>row.id));
  assert.equal(seen.size,first.events.length+second.events.length);assert.ok(created.every(id=>seen.has(id)));
  await assert.rejects(listTaxSettingsHistory(db,new URLSearchParams({before:'999999999999999999'})),/invalid_input/);
  await assert.rejects(listTaxSettingsHistory(db,new URLSearchParams({before:anchor,offset:'25'})),/invalid_input/);
 }finally{await db.end();}
});

test('access changes reject an administrator demoted while waiting for the access lock', async () => {
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);const guard=await db.connect();
 try {
  const actor=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const target=await register(db,`${randomUUID()}@example.invalid`,'test-password-123');
  await guard.query('BEGIN');await guard.query('SELECT pg_advisory_xact_lock($1)',[68499002]);
  const attempts=[saveStaffPermissions(db,actor.id,{id:target.id,permissions:['finance'],expectedPermissions:[],expectedRevision:'0:0:0'}),changeUserRole(db,actor.id,{id:target.id,role:'admin',expectedRole:'customer',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:'0:0:0'}),setUserActive(db,actor.id,{id:target.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:(await db.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[target.id])).rows[0].revision}),saveUserProfileAsAdmin(db,actor.id,{id:target.id,version:1,firstName:'Changed',lastName:'Test',phone:'12345',companyName:''}),linkUserOrganization(db,actor.id,{id:target.id,organizationId:randomUUID(),expectedVersion:1})];
  const results=Promise.allSettled(attempts);
  let waiting=0;for(let i=0;i<100&&waiting<4;i++){waiting=Number((await guard.query("SELECT count(*) AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted")).rows[0].n);if(waiting<4)await new Promise(resolve=>setTimeout(resolve,20));}
  assert.ok(waiting>=4,'access operations must wait for the lock');
  await guard.query("UPDATE users SET role='customer' WHERE id=$1",[actor.id]);await guard.query('COMMIT');
  for(const result of await results){assert.equal(result.status,'rejected');assert.equal(result.reason.message,'forbidden');}
  const targetState=(await db.query('SELECT role,active,first_name,organization_id FROM users WHERE id=$1',[target.id])).rows[0];assert.equal(targetState.role,'customer');assert.equal(targetState.active,true);assert.equal(targetState.first_name,'');assert.equal(targetState.organization_id,null);
  assert.equal((await db.query('SELECT 1 FROM staff_permissions WHERE user_id=$1',[target.id])).rowCount,0);
 } finally { await guard.query('ROLLBACK');guard.release();await db.end(); }
});

test('competing administrators cannot demote each other after losing access', async () => {
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
 try{
  const first=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const second=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const results=await Promise.allSettled([changeUserRole(db,first.id,{id:second.id,role:'customer',expectedRole:'admin',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:'0:0:0'}),changeUserRole(db,second.id,{id:first.id,role:'customer',expectedRole:'admin',expectedRevision:'0',expectedActivationRevision:'0',expectedPermissionRevision:'0:0:0'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const rejected=results.find(r=>r.status==='rejected');assert.equal(rejected.reason.message,'forbidden');
  const roles=(await db.query('SELECT role FROM users WHERE id=ANY($1::text[])',[[first.id,second.id]])).rows.map(r=>r.role).sort();assert.deepEqual(roles,['admin','customer']);
 }finally{await db.end();}
});

test('company users cursor remains stable and rejects unrelated anchors', async () => {
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
 try{
  const company=randomUUID(),otherCompany=randomUUID();await db.query('INSERT INTO organizations(id,name) VALUES($1,$2),($3,$4)',[company,'Cursor test',otherCompany,'Other test']);
  await db.query("INSERT INTO users(id,email,password_hash,role,organization_id,created_at) SELECT x.id,x.id||'@example.invalid','test','customer',$1,now()-interval '1 day'+n*interval '1 second' FROM generate_series(1,26) n CROSS JOIN LATERAL (SELECT gen_random_uuid()::text||substring(n::text,1,0) AS id) x",[company]);
  const first=await listUsers(db,new URLSearchParams({organizationId:company}));assert.equal(first.users.length,25);assert.equal(first.hasMore,true);const anchor=first.users.at(-1).id;
  const newcomer=randomUUID();await db.query("INSERT INTO users(id,email,password_hash,role,organization_id,created_at) VALUES($1,$2,'test','customer',$3,now()-interval '2 days')",[newcomer,`${newcomer}@example.invalid`,company]);
  const second=await listUsers(db,new URLSearchParams({organizationId:company,after:anchor}));assert.equal(second.users.length,1);assert.equal(new Set([...first.users,...second.users].map(u=>u.id)).size,26);assert.ok(!second.users.some(u=>u.id===newcomer));
  await assert.rejects(listUsers(db,new URLSearchParams({organizationId:otherCompany,after:anchor})),/invalid_input/);assert.equal((await listUsers(db,new URLSearchParams({after:anchor}))).cursorSupported,true);
  await db.query('UPDATE users SET organization_id=NULL WHERE id=$1',[anchor]);await assert.rejects(listUsers(db,new URLSearchParams({organizationId:company,after:anchor})),/invalid_input/);
 }finally{await db.end();}
});

test('tax settings persist with version checks and immutable audit history', async () => {
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
 try {
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin');
  const before=await getTaxSettings(db);
  const saved=await saveTaxSettings(db,admin.id,{vatBasisPoints:1700,version:before.version});
  assert.equal((await getTaxSettings(db)).vat_basis_points,1700);
  await assert.rejects(saveTaxSettings(db,admin.id,{vatBasisPoints:1800,version:before.version}),/version_conflict/);
  await assert.rejects(saveTaxSettings(db,admin.id,{vatBasisPoints:10001,version:saved.version}),/invalid_input/);
  const events=await db.query('SELECT id,previous_basis_points,new_basis_points FROM tax_settings_history WHERE actor_user_id=$1',[admin.id]);
  assert.equal(events.rows.length,1);assert.equal(events.rows[0].previous_basis_points,before.vat_basis_points);assert.equal(events.rows[0].new_basis_points,1700);
  await assert.rejects(db.query('DELETE FROM tax_settings_history WHERE id=$1',[events.rows[0].id]));
  await saveTaxSettings(db,admin.id,{vatBasisPoints:before.vat_basis_points,version:saved.version});
 } finally { await db.end(); }
});

test('email verification is optional, one-time, expires and respects account suspension',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin'),email=`${randomUUID()}@example.invalid`,user=await register(db,email,'test-password-123');let message='';const mailer={send:async x=>{message=x.text;return {accepted:[email],rejected:[]};}};
  const session=await login(db,email,'test-password-123');assert.equal(session.user.emailVerified,false);
  await assert.rejects(sendVerification(db,null,user.id,'http://localhost:3000','en'),/mail_unavailable/);
  await sendVerification(db,mailer,user.id,'http://localhost:3000','en');const first=message.match(/#verify=([a-f0-9]{64})/)[1];
  await sendVerification(db,mailer,user.id,'http://localhost:3000','en');const second=message.match(/#verify=([a-f0-9]{64})/)[1];await assert.rejects(confirmVerification(db,first),/invalid_verification/);
  await setUserActive(db,admin.id,{id:user.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:(await db.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[user.id])).rows[0].revision});await assert.rejects(confirmVerification(db,second),/invalid_verification/);await setUserActive(db,admin.id,{id:user.id,active:true,expectedActive:false,expectedRoleRevision:'0',expectedRevision:(await db.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[user.id])).rows[0].revision});await assert.rejects(confirmVerification(db,second),/invalid_verification/);
  await sendVerification(db,mailer,user.id,'http://localhost:3000','he');const valid=message.match(/#verify=([a-f0-9]{64})/)[1];await confirmVerification(db,valid);await assert.rejects(confirmVerification(db,valid),/invalid_verification/);assert.equal((await login(db,email,'test-password-123')).user.emailVerified,true);assert.equal((await sendVerification(db,mailer,user.id,'http://localhost:3000','en')).alreadyVerified,true);
  const other=await register(db,`${randomUUID()}@example.invalid`,'test-password-123');await sendVerification(db,mailer,other.id,'http://localhost:3000','en');const expired=message.match(/#verify=([a-f0-9]{64})/)[1];await db.query("UPDATE email_verifications SET expires_at=now()-interval '1 minute' WHERE user_id=$1",[other.id]);await assert.rejects(confirmVerification(db,expired),/invalid_verification/);
  await assert.rejects(sendVerification(db,{send:async()=>({accepted:[],rejected:['x']})},other.id,'http://localhost:3000','en'),/mail_unavailable/);assert.equal((await db.query('SELECT count(*)::integer AS n FROM email_verifications WHERE user_id=$1 AND used_at IS NULL AND expires_at>now()',[other.id])).rows[0].n,0);
 }finally{await db.end();}
});

test('disabled account loses sessions and reset tokens and requires a fresh login after reactivation',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,`${randomUUID()}@example.invalid`,'test-password-123','admin'),email=`${randomUUID()}@example.invalid`,user=await register(db,email,'test-password-123');
  const session=await login(db,email,'test-password-123');let message='';const mailer={send:async x=>{message=x.text;}};await beginReset(db,mailer,email,'http://localhost:3000');const token=message.match(/#reset=([a-f0-9]{64})/)[1];
  await assert.rejects(setUserActive(db,admin.id,{id:admin.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:'0'}),/cannot_disable_self/);
  await setUserActive(db,admin.id,{id:user.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:(await db.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[user.id])).rows[0].revision});assert.equal(await currentUser(db,session.token),null);await assert.rejects(login(db,email,'test-password-123'),/invalid_credentials/);await assert.rejects(finishReset(db,token,'new-password-123'),/invalid_reset/);
  message='';await beginReset(db,mailer,email,'http://localhost:3000');assert.equal(message,'');
  await assert.rejects(setUserActive(db,admin.id,{id:user.id,active:true,expectedActive:true,expectedRoleRevision:'0',expectedRevision:'0'}),/invalid_input/);
  await setUserActive(db,admin.id,{id:user.id,active:true,expectedActive:false,expectedRoleRevision:'0',expectedRevision:(await db.query('SELECT COALESCE(max(id),0)::text AS revision FROM user_activation_history WHERE user_id=$1',[user.id])).rows[0].revision});assert.equal(await currentUser(db,session.token),null);await assert.rejects(finishReset(db,token,'new-password-123'),/invalid_reset/);assert.equal((await login(db,email,'test-password-123')).user.id,user.id);
  const history=await listAccessHistory(db,new URLSearchParams({userId:user.id}));assert.equal(history.events.filter(e=>e.kind==='activation').length,2);
 }finally{await db.end();}
});

test('stale account block is rejected after promotion to administrator',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),target=await register(db,randomUUID()+'@example.invalid','test-password-123');const read=async()=>(await listUsers(db,new URLSearchParams({search:target.id}))).users[0];const old=await read();await changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:old.role,expectedRevision:old.role_revision,expectedActivationRevision:old.activation_revision,expectedPermissionRevision:old.permission_revision});await assert.rejects(setUserActive(db,admin.id,{id:target.id,active:false,expectedActive:true,expectedRevision:old.activation_revision,expectedRoleRevision:old.role_revision}),/version_conflict/);const current=await read();assert.equal(current.active,true);assert.equal(current.role,'admin');await setUserActive(db,admin.id,{id:target.id,active:false,expectedActive:true,expectedRevision:current.activation_revision,expectedRoleRevision:current.role_revision});assert.equal((await read()).active,false);
 }finally{await db.end();}
});

test('stale employee permissions are rejected after permissions or role return',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),target=await register(db,randomUUID()+'@example.invalid','test-password-123');const read=async()=>(await listUsers(db,new URLSearchParams({search:target.id}))).users[0];const initial=await read();await saveStaffPermissions(db,admin.id,{id:target.id,permissions:['orders'],expectedPermissions:[],expectedRevision:initial.permission_revision});const granted=await read();await saveStaffPermissions(db,admin.id,{id:target.id,permissions:[],expectedPermissions:['orders'],expectedRevision:granted.permission_revision});await assert.rejects(saveStaffPermissions(db,admin.id,{id:target.id,permissions:['finance'],expectedPermissions:[],expectedRevision:initial.permission_revision}),/version_conflict/);
 const beforeRole=await read();await changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:'customer',expectedRevision:beforeRole.role_revision,expectedActivationRevision:beforeRole.activation_revision,expectedPermissionRevision:beforeRole.permission_revision});const promoted=await read();await changeUserRole(db,admin.id,{id:target.id,role:'customer',expectedRole:'admin',expectedRevision:promoted.role_revision,expectedActivationRevision:promoted.activation_revision,expectedPermissionRevision:promoted.permission_revision});await assert.rejects(saveStaffPermissions(db,admin.id,{id:target.id,permissions:['finance'],expectedPermissions:[],expectedRevision:beforeRole.permission_revision}),/version_conflict/);const beforeActivation=await read();await setUserActive(db,admin.id,{id:target.id,active:false,expectedActive:true,expectedRevision:beforeActivation.activation_revision,expectedRoleRevision:beforeActivation.role_revision});const disabled=await read();await setUserActive(db,admin.id,{id:target.id,active:true,expectedActive:false,expectedRevision:disabled.activation_revision,expectedRoleRevision:disabled.role_revision});await assert.rejects(saveStaffPermissions(db,admin.id,{id:target.id,permissions:['finance'],expectedPermissions:[],expectedRevision:beforeActivation.permission_revision}),/version_conflict/);const current=await read();await saveStaffPermissions(db,admin.id,{id:target.id,permissions:['finance'],expectedPermissions:[],expectedRevision:current.permission_revision});assert.deepEqual((await read()).permissions,['finance']);await assert.rejects(saveStaffPermissions(db,admin.id,{id:target.id,permissions:[],expectedPermissions:['finance']}),/invalid_input/);
 }finally{await db.end();}
});

test('stale account activation changes are rejected after state returns',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),email=randomUUID()+'@example.invalid',user=await register(db,email,'test-password-123');const read=async()=>(await listUsers(db,new URLSearchParams({search:user.id}))).users[0];const initial=await read();assert.equal(initial.activation_revision,'0');
 await setUserActive(db,admin.id,{id:user.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:initial.activation_revision});const disabled=await read();await setUserActive(db,admin.id,{id:user.id,active:true,expectedActive:false,expectedRoleRevision:'0',expectedRevision:disabled.activation_revision});const session=await login(db,email,'test-password-123');await assert.rejects(setUserActive(db,admin.id,{id:user.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:initial.activation_revision}),/version_conflict/);assert.ok(await currentUser(db,session.token));const current=await read();assert.equal(current.active,true);await setUserActive(db,admin.id,{id:user.id,active:false,expectedActive:true,expectedRoleRevision:'0',expectedRevision:current.activation_revision});assert.equal(await currentUser(db,session.token),null);await assert.rejects(setUserActive(db,admin.id,{id:user.id,active:true,expectedActive:false}),/invalid_input/);
 }finally{await db.end();}
});

test('stale administrator role changes are rejected after role returns',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),target=await register(db,randomUUID()+'@example.invalid','test-password-123');const read=async()=>(await listUsers(db,new URLSearchParams({search:target.id}))).users[0];const initial=await read();assert.equal(initial.role_revision,'0');
 await changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:initial.role,expectedRevision:initial.role_revision,expectedActivationRevision:initial.activation_revision,expectedPermissionRevision:initial.permission_revision});const promoted=await read();await changeUserRole(db,admin.id,{id:target.id,role:'customer',expectedRole:promoted.role,expectedRevision:promoted.role_revision,expectedActivationRevision:promoted.activation_revision,expectedPermissionRevision:promoted.permission_revision});await assert.rejects(changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:initial.role,expectedRevision:initial.role_revision,expectedActivationRevision:initial.activation_revision,expectedPermissionRevision:initial.permission_revision}),/version_conflict/);const current=await read();assert.equal(current.role,'customer');await changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:current.role,expectedRevision:current.role_revision,expectedActivationRevision:current.activation_revision,expectedPermissionRevision:current.permission_revision});
 await assert.rejects(changeUserRole(db,admin.id,{id:target.id,role:'customer',expectedRole:'admin'}),/invalid_input/);
 }finally{await db.end();}
});

test('user cursor remains stable when filtered accounts change',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const marker='cursor-'+randomUUID();await db.query("INSERT INTO users(id,email,password_hash,role,created_at) SELECT gen_random_uuid()::text,$1||'-'||n||'@example.invalid','fixture','customer',now()-interval '1 day' FROM generate_series(1,30) n",[marker]);const params={search:marker,active:'active'};const first=await listUsers(db,new URLSearchParams(params));assert.equal(first.cursorSupported,true);assert.equal(first.users.length,25);const anchor=first.users.at(-1).id;
 await db.query('UPDATE users SET active=false WHERE id=$1',[first.users[0].id]);await db.query("INSERT INTO users(id,email,password_hash,role) VALUES(gen_random_uuid()::text,$1||'-new@example.invalid','fixture','customer')",[marker]);const second=await listUsers(db,new URLSearchParams({...params,after:anchor}));assert.equal(second.users.length,6);assert.equal(new Set([...first.users,...second.users].map(u=>u.id)).size,31);await assert.rejects(listUsers(db,new URLSearchParams({after:randomUUID()})),/invalid_input/);await assert.rejects(listUsers(db,new URLSearchParams({after:anchor,offset:'25'})),/invalid_input/);
 }finally{await db.end();}
});

test('access history cursor is stable across all event types',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),user=await register(db,randomUUID()+'@example.invalid','test-password-123');
 await db.query("INSERT INTO user_role_history(user_id,actor_user_id,old_role,new_role,created_at) SELECT $1,$2,'customer','admin','2024-01-01T00:00:00Z' FROM generate_series(1,10)",[user.id,admin.id]);
 await db.query("INSERT INTO staff_permission_history(user_id,actor_user_id,old_permissions,new_permissions,created_at) SELECT $1,$2,'[]','[\"orders\"]','2024-01-01T00:00:00Z' FROM generate_series(1,10)",[user.id,admin.id]);
 await db.query("INSERT INTO user_activation_history(user_id,actor_user_id,old_active,new_active,created_at) SELECT $1,$2,true,false,'2024-01-01T00:00:00Z' FROM generate_series(1,10)",[user.id,admin.id]);
 const first=await listAccessHistory(db,new URLSearchParams({userId:user.id}));assert.equal(first.cursorSupported,true);assert.equal(first.events.length,25);const anchor=first.events.at(-1);
 await db.query("INSERT INTO user_role_history(user_id,actor_user_id,old_role,new_role) VALUES($1,$2,'customer','admin')",[user.id,admin.id]);
 const second=await listAccessHistory(db,new URLSearchParams({userId:user.id,beforeKind:anchor.kind,beforeId:anchor.id}));assert.equal(second.events.length,5);assert.equal(second.hasMore,false);assert.equal(new Set([...first.events,...second.events].map(e=>e.kind+':'+e.id)).size,30);
 await assert.rejects(listAccessHistory(db,new URLSearchParams({userId:admin.id,beforeKind:anchor.kind,beforeId:anchor.id})),/invalid_input/);await assert.rejects(listAccessHistory(db,new URLSearchParams({userId:user.id,beforeKind:'role',beforeId:'bad'})),/invalid_input/);assert.equal((await listAccessHistory(db,new URLSearchParams({userId:user.id,offset:'25'}))).events.length,6);
 }finally{await db.end();}
});

test('concurrent password reset attempts cannot both consume the same link', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  try {
    const email = `${randomUUID()}@example.invalid`;
    await register(db, email, 'old-password-123', 'admin');
    const previousSession = await login(db, email, 'old-password-123');
    let message = '';
    await beginReset(db, { send: async x => { message = x.text; } }, email, 'http://localhost:3000');
    const token = message.match(/#reset=([a-f0-9]{64})/)[1];
    const passwords = ['new-password-one-123', 'new-password-two-123'];
    const results = await Promise.allSettled(passwords.map(password => finishReset(db, token, password)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const rejected = results.find(result => result.status === 'rejected');
    assert.match(rejected.reason.message, /invalid_reset/);
    assert.equal(await currentUser(db, previousSession.token), null);
    const winner = results.findIndex(result => result.status === 'fulfilled');
    assert.equal((await login(db, email, passwords[winner])).user.role, 'admin');
    await assert.rejects(login(db, email, passwords[1 - winner]), /invalid_credentials/);
    await assert.rejects(login(db, email, 'old-password-123'), /invalid_credentials/);
  } finally { await db.end(); }
});

test('password reset closes all owner sessions without affecting other accounts', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  try {
    const email = `${randomUUID()}@example.invalid`;
    const otherEmail = `${randomUUID()}@example.invalid`;
    const user = await register(db, email, 'old-password-123', 'admin');
    await register(db, otherEmail, 'other-password-123');
    const first = await login(db, email, 'old-password-123');
    const second = await login(db, email, 'old-password-123');
    const other = await login(db, otherEmail, 'other-password-123');
    let message = '';
    await beginReset(db, { send: async x => { message = x.text; } }, email, 'http://localhost:3000');
    const token = message.match(/#reset=([a-f0-9]{64})/)[1];
    await finishReset(db, token, 'new-password-123');
    assert.equal(await currentUser(db, first.token), null);
    assert.equal(await currentUser(db, second.token), null);
    assert.ok(await currentUser(db, other.token));
    await assert.rejects(login(db, email, 'old-password-123'), /invalid_credentials/);
    const renewed = await login(db, email, 'new-password-123');
    assert.equal(renewed.user.id, user.id);
    assert.equal(renewed.user.role, 'admin');
    await assert.rejects(finishReset(db, token, 'another-password-123'), /invalid_reset/);
  } finally { await db.end(); }
});

test('registration, roles, sessions, reset and one-time tokens', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  try {
    const email = `${randomUUID()}@example.invalid`;
    const user = await register(db, email, 'long-password-123');
    assert.equal(user.role, 'customer');
    await assert.rejects(register(db, email.toUpperCase(), 'long-password-123'), /already_exists/);
    await assert.rejects(login(db, `${randomUUID()}@example.invalid`, 'incorrect-password'), /invalid_credentials/);
    await assert.rejects(login(db, email, 'incorrect-password'), /invalid_credentials/);
    const session = await login(db, email, 'long-password-123');
    assert.equal((await currentUser(db, session.token)).role, 'customer');
    let message = '';
    await beginReset(db, { send: async x => { message = x.text; return { accepted: [email], rejected: [] }; } }, email, 'http://localhost:3000');
    const previousToken = message.match(/#reset=([a-f0-9]{64})/)[1];
    await beginReset(db, { send: async x => { message = x.text; return { accepted: [email], rejected: [] }; } }, email, 'http://localhost:3000');
    const token = message.match(/#reset=([a-f0-9]{64})/)[1];
    await assert.rejects(finishReset(db, previousToken, 'another-password-123'), /invalid_reset/);
    await finishReset(db, token, 'new-password-123');
    assert.equal(await currentUser(db, session.token), null);
    await assert.rejects(finishReset(db, token, 'another-password-123'), /invalid_reset/);
    await assert.rejects(login(db, email, 'long-password-123'), /invalid_credentials/);
    assert.equal((await login(db, email, 'new-password-123')).user.id, user.id);
    assert.equal(await verifyPassword('new-password-123', 'invalid'), false);
  } finally { await db.end(); }
});

test('role changes reject a view predating account deactivation and reactivation', async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),target=await register(db,randomUUID()+'@example.invalid','test-password-123');
  const read=async()=>(await listUsers(db,new URLSearchParams({search:target.id}))).users[0];const old=await read();
  await setUserActive(db,admin.id,{id:target.id,active:false,expectedActive:true,expectedRevision:old.activation_revision,expectedRoleRevision:old.role_revision});const disabled=await read();
  await setUserActive(db,admin.id,{id:target.id,active:true,expectedActive:false,expectedRevision:disabled.activation_revision,expectedRoleRevision:disabled.role_revision});
  await assert.rejects(changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:old.role,expectedRevision:old.role_revision,expectedActivationRevision:old.activation_revision,expectedPermissionRevision:old.permission_revision}),/version_conflict/);
  const current=await read();assert.equal(current.role,'customer');await changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:current.role,expectedRevision:current.role_revision,expectedActivationRevision:current.activation_revision,expectedPermissionRevision:current.permission_revision});assert.equal((await read()).role,'admin');
 }finally{await db.end();}
});

test('role changes reject views predating individual permission changes, including reverted permissions', async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);try{
  const admin=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),target=await register(db,randomUUID()+'@example.invalid','test-password-123');
  const read=async()=>(await listUsers(db,new URLSearchParams({search:target.id}))).users[0];const old=await read();
  const promote=view=>changeUserRole(db,admin.id,{id:target.id,role:'admin',expectedRole:view.role,expectedRevision:view.role_revision,expectedActivationRevision:view.activation_revision,expectedPermissionRevision:view.permission_revision});
  await saveStaffPermissions(db,admin.id,{id:target.id,permissions:['orders'],expectedPermissions:[],expectedRevision:old.permission_revision});
  await assert.rejects(promote(old),/version_conflict/);const granted=await read();assert.deepEqual(granted.permissions,['orders']);
  await saveStaffPermissions(db,admin.id,{id:target.id,permissions:[],expectedPermissions:['orders'],expectedRevision:granted.permission_revision});
  await assert.rejects(promote(old),/version_conflict/);const current=await read();assert.equal(current.role,'customer');await promote(current);assert.equal((await read()).role,'admin');
 }finally{await db.end();}
});

test('site blocks retain bilingual edits and reject stale versions',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL),c=await db.connect();
 try{
  const {sectionDefaults}=await import('../../src/data/section-defaults.mjs');
  const {getSection,saveSection,getHero,saveHero,getTrust,saveTrust}=await import('../site-blocks.mjs');
  await c.query('BEGIN');
  for(const key of [...Object.keys(sectionDefaults),'hero','trust']){
   const get=key==='hero'?()=>getHero(c):key==='trust'?()=>getTrust(c):()=>getSection(c,key);
   const save=input=>key==='hero'?saveHero(c,input):key==='trust'?saveTrust(c,input):saveSection(c,key,input);
   const initial=await get(),content={...initial.content};const bilingual=Object.keys(content).filter(name=>/(He|En)$/.test(name));
   for(const name of bilingual)content[name]=name.endsWith('He')?'טקסט בדיקה':'Test text';
   const result=await save({version:initial.version,content}),reread=await get();assert.equal(reread.version,result.version,`${key} version`);
   for(const name of bilingual)assert.equal(reread.content[name],content[name],`${key}.${name}`);
   await assert.rejects(save({version:initial.version,content}),/version_conflict/);
  }
 }finally{await c.query('ROLLBACK');c.release();await db.end();}
});

test('site history pages remain stable after a new edit and reject foreign anchors',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL),actor=await register(db,randomUUID()+'@example.invalid','test-password-123','admin'),c=await db.connect();
 try{
  const {listSiteBlockHistory}=await import('../site-history.mjs');await c.query('BEGIN');
  await c.query("INSERT INTO site_block_history(block_key,actor_user_id,previous_content,new_content,new_version) SELECT 'trust',$1,'{}'::jsonb,'{}'::jsonb,n FROM generate_series(1,30) n",[actor.id]);
  const adapter={connect:async()=>({query:(sql,args)=>/^(BEGIN ISOLATION|COMMIT|ROLLBACK)/.test(sql)?Promise.resolve({rows:[],rowCount:0}):c.query(sql,args),release:()=>{}})};
  const first=await listSiteBlockHistory(adapter,new URLSearchParams({key:'trust'}));assert.equal(first.events.length,25);assert.equal(first.hasMore,true);const legacy=await listSiteBlockHistory(adapter,new URLSearchParams({key:'trust',offset:'25'}));
  await c.query("INSERT INTO site_block_history(block_key,actor_user_id,previous_content,new_content,new_version) VALUES('trust',$1,'{}','{}',31)",[actor.id]);
  const second=await listSiteBlockHistory(adapter,new URLSearchParams({key:'trust',before:first.events.at(-1).id}));assert.deepEqual(second.events.map(e=>e.id),legacy.events.map(e=>e.id));assert.equal(new Set([...first.events,...second.events].map(e=>e.id)).size,30);
  const foreign=(await c.query("INSERT INTO site_block_history(block_key,actor_user_id,previous_content,new_content,new_version) VALUES('hero',$1,'{}','{}',1) RETURNING id::text",[actor.id])).rows[0].id;
  for(const params of [{key:'trust',before:foreign},{key:'trust',before:'bad'},{key:'trust',before:first.events.at(-1).id,offset:'25'}])await assert.rejects(listSiteBlockHistory(adapter,new URLSearchParams(params)),/invalid_input/);
 }finally{await c.query('ROLLBACK');c.release();await db.end();}
});
