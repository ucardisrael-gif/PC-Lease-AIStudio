import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../database.mjs';
import { readFile } from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

test('PostgreSQL migration is repeatable and enforces data constraints', async () => {
  const url = process.env.PC_LEASE_TEST_DATABASE_URL;
  if (!url) throw new Error('PC_LEASE_TEST_DATABASE_URL must point to an isolated test database');
  const db = await openDatabase(url);
  try {
    const repeated = await openDatabase(url);
    await repeated.end();
    assert.equal(Number((await db.query('SELECT count(*) FROM schema_migrations WHERE version = 1')).rows[0].count), 1);
    assert.equal((await db.query("SELECT to_regclass('service_tickets_order_idx') IS NOT NULL AS present")).rows[0].present,true);
    const client = await db.connect();
    await client.query('BEGIN');
    try {
      await client.query("INSERT INTO products (id, slug, name, category, details_json) VALUES ('test-id', 'test-slug', 'test', 'laptop', '{}')");
      await client.query('SAVEPOINT valid_product');
      await assert.rejects(db.query("INSERT INTO tariffs (id, product_id, mode, amount_minor) VALUES ('t', 'missing', 'purchase', 1)"));
      await client.query('ROLLBACK TO SAVEPOINT valid_product');
      assert.equal(Number((await client.query("SELECT count(*) FROM products WHERE id = 'test-id'")).rows[0].count), 1);
    } finally { await client.query('ROLLBACK'); client.release(); }
  } finally { await db.end(); }
});

test('upgrade from migration 33 preserves existing records and creates history protection',async()=>{
 const base=process.env.PC_LEASE_TEST_DATABASE_URL;const admin=new pg.Client({connectionString:base});await admin.connect();
 const schema='upgrade_'+randomUUID().replaceAll('-','');
 await admin.query(`CREATE SCHEMA "${schema}"`);
 let upgraded;
 try{
  await admin.query(`SET search_path TO "${schema}"`);
  await admin.query('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const files=['001_initial.sql','002_request_delivery.sql','003_auth.sql','004_product_version.sql','005_site_blocks.sql','006_confirm_rental_rates.sql','007_user_display_name.sql','008_request_status_history.sql','009_user_profiles.sql','010_organizations.sql','011_request_organization.sql','012_user_organization.sql','013_staff_permissions.sql','014_inventory.sql','015_asset_reservations.sql','016_asset_handover.sql','017_asset_purchase.sql','018_service_tickets.sql','019_service_replacements.sql','020_contract_drafts.sql','021_financial_entries.sql','022_product_media.sql','023_user_role_history.sql','024_user_activation.sql','025_request_customer.sql','026_email_verification.sql','027_request_internal_notes.sql','028_contract_history_integrity.sql','029_contact_inquiries.sql','030_inquiry_notes.sql','031_inquiry_notification_attempts.sql','032_request_notification_attempts.sql','033_order_notification_settings.sql'];
  for(let i=0;i<files.length;i++){await admin.query(await readFile(new URL('../migrations/'+files[i],import.meta.url),'utf8'));await admin.query('INSERT INTO schema_migrations(version) VALUES($1)',[i+1]);}
  await admin.query("INSERT INTO users(id,email,password_hash,role) VALUES('test-user','upgrade@example.invalid','hash','admin')");
  await admin.query("INSERT INTO products(id,slug,name,category,details_json,published) VALUES('test-product','upgrade-product','Before upgrade','laptop',$1,true)",[JSON.stringify({model:'Before upgrade',purchasePrice:1234})]);
  await admin.query("INSERT INTO organizations(id,name) VALUES('test-company','Before upgrade')");
  await admin.query("INSERT INTO inventory_assets(id,serial_number,product_id,status) VALUES('test-asset','test-serial','test-product','received')");
  await admin.query("INSERT INTO requests(id,product_id,product_snapshot_json,tariff_snapshot_json,contact_json,quantity) VALUES('finance-old','test-product','{}','{}','{}',1)");
  await admin.query("INSERT INTO inventory_assets(id,serial_number,product_id,status) VALUES('replacement-old','replacement-serial','test-product','service_issued')");
  await admin.query("INSERT INTO asset_reservations(id,asset_id,request_id,line_index,reserved_by) VALUES('reservation-old','test-asset','finance-old',0,'test-user')");
  await admin.query("INSERT INTO service_tickets(id,asset_id,reservation_id,description,status,created_by) VALUES('ticket-old','test-asset','reservation-old','Old ticket','open','test-user')");
  await admin.query("INSERT INTO service_replacements(id,ticket_id,asset_id,issued_by,issue_notes) VALUES('replacement-record-old','ticket-old','replacement-old','test-user','Old issue')");
  await admin.query("INSERT INTO financial_entries(id,request_id,kind,amount_minor,reference,notes,created_by) VALUES('finance-original','finance-old','payment',100,'','','test-user')");
  await admin.query("INSERT INTO financial_entries(id,request_id,kind,amount_minor,reference,notes,reverses_id,created_by) VALUES('finance-old-reversal','finance-old','reversal',200,'','','finance-original','test-user')");
  const url=new URL(base);url.searchParams.set('options',`-c search_path=${schema}`);upgraded=await openDatabase(url.toString());
  assert.deepEqual((await upgraded.query('SELECT name,details_json,published FROM products WHERE id=$1',['test-product'])).rows[0],{name:'Before upgrade',details_json:{model:'Before upgrade',purchasePrice:1234},published:true});
  assert.equal((await upgraded.query("SELECT name FROM organizations WHERE id='test-company'")).rows[0].name,'Before upgrade');
  assert.equal((await upgraded.query("SELECT serial_number FROM inventory_assets WHERE id='test-asset'")).rows[0].serial_number,'test-serial');
  assert.equal((await upgraded.query('SELECT max(version)::integer AS version FROM schema_migrations')).rows[0].version,87);
  assert.equal((await upgraded.query("SELECT amount_minor FROM financial_entries WHERE id='finance-old-reversal'")).rows[0].amount_minor,200);
  const oldReservation=(await upgraded.query("SELECT asset_id,request_id,serial_at_reservation FROM asset_reservations WHERE id='reservation-old'")).rows[0];assert.deepEqual(oldReservation,{asset_id:'test-asset',request_id:'finance-old',serial_at_reservation:null});
  const oldTicket=(await upgraded.query("SELECT asset_id,reservation_id FROM service_tickets WHERE id='ticket-old'")).rows[0];assert.deepEqual(oldTicket,{asset_id:'test-asset',reservation_id:'reservation-old'});await upgraded.query("UPDATE service_tickets SET description='Updated description' WHERE id='ticket-old'");await assert.rejects(upgraded.query("UPDATE service_tickets SET reservation_id=NULL WHERE id='ticket-old'"),/service ticket identity cannot be changed/);const oldReplacement=(await upgraded.query("SELECT ticket_id,asset_id,issue_notes,serial_at_issue FROM service_replacements WHERE id='replacement-record-old'")).rows[0];assert.deepEqual(oldReplacement,{ticket_id:'ticket-old',asset_id:'replacement-old',issue_notes:'Old issue',serial_at_issue:null});
  await upgraded.query("UPDATE asset_reservations SET released_at=now(),released_by='test-user' WHERE id='reservation-old'");
  await upgraded.query("UPDATE service_replacements SET returned_at=now(),returned_by='test-user',return_notes='Returned' WHERE id='replacement-record-old'");
  await assert.rejects(upgraded.query("UPDATE asset_reservations SET released_at=NULL,released_by=NULL WHERE id='reservation-old'"),/reservation history cannot be changed/);
  await assert.rejects(upgraded.query("UPDATE service_replacements SET returned_at=NULL,returned_by=NULL WHERE id='replacement-record-old'"),/replacement history cannot be changed/);
  await upgraded.query("INSERT INTO inventory_asset_history(asset_id,actor_user_id,new_data) VALUES('test-asset','test-user','{}')");
  await assert.rejects(upgraded.query("DELETE FROM inventory_asset_history WHERE asset_id='test-asset'"),/append only/);
 }finally{if(upgraded)await upgraded.end();await admin.query('SET search_path TO public');await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();}
});

test('upgrade from migration 7 preserves existing products and orders',async()=>{
 const base=process.env.PC_LEASE_TEST_DATABASE_URL,admin=new pg.Client({connectionString:base});await admin.connect();const schema='upgrade7_'+randomUUID().replaceAll('-','');await admin.query(`CREATE SCHEMA "${schema}"`);let upgraded;
 try{await admin.query(`SET search_path TO "${schema}"`);await admin.query('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const files=['001_initial.sql','002_request_delivery.sql','003_auth.sql','004_product_version.sql','005_site_blocks.sql','006_confirm_rental_rates.sql','007_user_display_name.sql'];
  for(let i=0;i<files.length;i++){await admin.query(await readFile(new URL('../migrations/'+files[i],import.meta.url),'utf8'));await admin.query('INSERT INTO schema_migrations(version) VALUES($1)',[i+1]);}
  const product={model:'Old model',purchasePrice:1234,rentalRates:{dailyShort:35,dailyWeek:18,monthly:199}};
  await admin.query("INSERT INTO products(id,slug,name,category,details_json,published) VALUES('old-product','old-product','Old model','laptop',$1,true)",[JSON.stringify(product)]);
  await admin.query("INSERT INTO requests(id,product_id,product_snapshot_json,tariff_snapshot_json,contact_json,quantity) VALUES('old-order','old-product',$1,$2,$3,1)",[JSON.stringify(product),JSON.stringify({amount:1234}),JSON.stringify({companyName:'Test company'})]);
  const url=new URL(base);url.searchParams.set('options',`-c search_path=${schema}`);upgraded=await openDatabase(url.toString());
  assert.deepEqual((await upgraded.query("SELECT details_json FROM products WHERE id='old-product'")).rows[0].details_json,product);
  const order=(await upgraded.query("SELECT product_snapshot_json,tariff_snapshot_json,contact_json FROM requests WHERE id='old-order'")).rows[0];assert.deepEqual(order,{product_snapshot_json:product,tariff_snapshot_json:{amount:1234},contact_json:{companyName:'Test company'}});
  assert.equal((await upgraded.query('SELECT max(version)::integer AS version FROM schema_migrations')).rows[0].version,87);
  await assert.rejects(upgraded.query("UPDATE requests SET tariff_snapshot_json='{}'::jsonb WHERE id='old-order'"),/request commercial snapshot cannot be changed/);
  assert.equal((await upgraded.query("UPDATE requests SET status='reviewed' WHERE id='old-order' RETURNING status")).rows[0].status,'reviewed');
 }finally{if(upgraded)await upgraded.end();await admin.query('SET search_path TO public');await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();}
});

test('confirmed monthly tariff preserves daily rates and is repeatable', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO products (id,slug,name,category,details_json) VALUES ('prod-dell-5420','tariff-migration-test','test','laptop', $1::jsonb) ON CONFLICT (id) DO UPDATE SET details_json=EXCLUDED.details_json", [JSON.stringify({ rentalRates: { dailyShort: 40, dailyWeek: 20, monthly: 149 } })]);
    const sql = await readFile(new URL('../migrations/006_confirm_rental_rates.sql', import.meta.url), 'utf8');
    await client.query(sql);
    const row = (await client.query("SELECT details_json,edit_version FROM products WHERE id='prod-dell-5420'")).rows[0];
    assert.deepEqual(row.details_json.rentalRates, { dailyShort: 40, dailyWeek: 20, monthly: 199 });
    await client.query(sql);
    assert.equal((await client.query("SELECT edit_version FROM products WHERE id='prod-dell-5420'")).rows[0].edit_version, row.edit_version);
  } finally { await client.query('ROLLBACK'); client.release(); await db.end(); }
});
