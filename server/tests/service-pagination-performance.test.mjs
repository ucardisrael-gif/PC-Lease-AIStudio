import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {listServiceTickets} from '../service-tickets.mjs';

test('service pagination compares index plans without changing saved records',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL),client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query('DROP INDEX service_tickets_order_idx');
  const actor=randomUUID(),product=randomUUID(),assets=Array.from({length:100},()=>randomUUID());
  await client.query("INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,'test','admin')",[actor,`${actor}@example.invalid`]);
  await client.query("INSERT INTO products(id,slug,name,category,details_json) VALUES($1,$2,'Test','laptop','{}')",[product,product]);
  await client.query("INSERT INTO inventory_assets(id,serial_number,product_id,status) SELECT a,a,$2,'available' FROM unnest($1::text[]) a",[assets,product]);
  await client.query("INSERT INTO service_tickets(id,asset_id,description,created_by,created_at) SELECT gen_random_uuid()::text,a,'Synthetic service performance',$2,now()-(n*interval '1 second') FROM unnest($1::text[]) a CROSS JOIN generate_series(1,100) n",[assets,actor]);
  await client.query('ANALYZE service_tickets');
  const all='SELECT id FROM service_tickets ORDER BY created_at DESC,id DESC LIMIT 26';
  const perAsset='SELECT id FROM service_tickets WHERE asset_id=$1 ORDER BY created_at DESC,id DESC LIMIT 26';
  const anchor=(await client.query("SELECT id FROM service_tickets WHERE description='Synthetic service performance' ORDER BY created_at DESC,id DESC OFFSET 5000 LIMIT 1")).rows[0].id;
  const page="SELECT id FROM service_tickets WHERE (created_at,id)<(SELECT created_at,id FROM service_tickets WHERE id=$1) ORDER BY created_at DESC,id DESC LIMIT 26";
  const samples=[[all,[]],[perAsset,[assets[0]]],[page,[anchor]]];
  const before=[];for(const [sql,params] of samples)before.push({rows:(await client.query(sql,params)).rows,plan:(await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,params)).rows[0]['QUERY PLAN'][0]});
  let productionPlan;const adapter={connect:async()=>({release(){},query:async(sql,params)=>{if(sql.startsWith('BEGIN ')||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[],rowCount:0};if(sql.startsWith('SELECT t.*'))productionPlan=(await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,params)).rows[0]['QUERY PLAN'][0];return client.query(sql,params);}})};
  const productionBefore=await listServiceTickets(adapter,new URLSearchParams());const productionBeforePlan=productionPlan;
  await client.query('CREATE INDEX service_test_order_idx ON service_tickets(created_at DESC,id DESC)');
  await client.query('CREATE INDEX service_test_asset_order_idx ON service_tickets(asset_id,created_at DESC,id DESC)');
  await client.query('ANALYZE service_tickets');
  for(let i=0;i<samples.length;i++){const [sql,params]=samples[i],rows=(await client.query(sql,params)).rows,plan=(await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,params)).rows[0]['QUERY PLAN'][0];assert.deepEqual(rows,before[i].rows);assert.equal(rows.length,26);console.log(`Service ${['first page','asset page','cursor page'][i]}, 10,000 synthetic tickets: before ${before[i].plan['Execution Time']} ms, candidate ${plan['Execution Time']} ms; candidate index ${JSON.stringify(plan.Plan).includes(i===1?'service_test_asset_order_idx':'service_test_order_idx')?'selected':'not selected'}.`);}
  const productionAfter=await listServiceTickets(adapter,new URLSearchParams());assert.deepEqual(productionAfter.tickets.map(t=>t.id),productionBefore.tickets.map(t=>t.id));assert.equal(productionAfter.total,productionBefore.total);console.log(`Service full page query, 10,000 synthetic tickets: before ${productionBeforePlan['Execution Time']} ms, candidate ${productionPlan['Execution Time']} ms; candidate index ${JSON.stringify(productionPlan.Plan).includes('service_test_order_idx')?'selected':'not selected'}.`);
 }finally{await client.query('ROLLBACK');client.release();await db.end();}
});
