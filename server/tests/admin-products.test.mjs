import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../database.mjs';
import { listAdminProducts, saveAdminProduct as saveProduct, createAdminProduct as createProduct, listProductHistory } from '../admin-products.mjs';
import {register} from '../auth.mjs';
import {randomUUID} from 'node:crypto';
import { getCatalog, seedCatalog } from '../catalog.mjs';
import { saveMultiQuote } from '../multi-quote.mjs';

test('multi-model order rejects an outdated price when a concurrent catalogue edit commits',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);let lock;const fixtureIds=[];
 try{
  const actor=await register(db,randomUUID()+'@example.invalid','test-password-123','admin');
  const input={slug:'price-race-'+randomUUID(),model:'Test Model',category:'desktop',manufacturer:'Dell',title:{he:'בדיקה',en:'Test'},description:{he:'תיאור',en:'Description'},purchasePrice:2000,leasePriceMonthly:99,leaseTermMonths:36,rentalRates:{dailyShort:35,dailyWeek:18,monthly:199},imagePath:'',published:false};
  const created=await createProduct(db,input,actor.id);fixtureIds.push(created.id);const published=await saveProduct(db,{...created,published:true},actor.id);
  const otherCreated=await createProduct(db,{...input,slug:'price-race-other-'+randomUUID(),model:'Other Model',purchasePrice:1500},actor.id);fixtureIds.push(otherCreated.id);const other=await saveProduct(db,{...otherCreated,published:true},actor.id);
  const body={id:randomUUID(),companyName:'Test',contactName:'Test',email:'test@example.invalid',phone:'123',lines:[{productSlug:published.slug,productVersion:published.editVersion,mode:'purchase',quantity:1},{productSlug:other.slug,productVersion:other.editVersion,mode:'purchase',quantity:2}]};
  lock=await db.connect();await lock.query('BEGIN');await lock.query('SELECT id FROM products WHERE id=$1 FOR UPDATE',[published.id]);
  let markWaiting;const waiting=new Promise(resolve=>{markWaiting=resolve;});
  const observedDb={connect:async()=>{const client=await db.connect();return {query:(...args)=>{if(typeof args[0]==='string'&&args[0].includes('ORDER BY slug FOR SHARE'))markWaiting();return client.query(...args);},release:()=>client.release()};}};
  const pending=saveMultiQuote(observedDb,body);await waiting;
  await lock.query("UPDATE products SET details_json=jsonb_set(details_json,'{purchasePrice}','2500'::jsonb),edit_version=edit_version+1 WHERE id=$1",[published.id]);
  await lock.query('COMMIT');lock.release();lock=null;
  await assert.rejects(pending,/price_changed/);
  assert.equal((await db.query('SELECT 1 FROM requests WHERE id=$1',[body.id])).rowCount,0);
  const fresh=await saveMultiQuote(db,{...body,lines:[{...body.lines[0],productVersion:published.editVersion+1},body.lines[1]]});
  assert.equal(fresh.quote.items[0].periodTotalMinor,250000);assert.equal(fresh.quote.items[1].periodTotalMinor,300000);
 }finally{if(lock){await lock.query('ROLLBACK');lock.release();}if(fixtureIds.length)await db.query('UPDATE products SET published=false WHERE id=ANY($1::text[])',[fixtureIds]);await db.end();}
});

test('new products start hidden and use only explicitly entered prices', async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
 try{const actor=await register(db,randomUUID()+'@example.invalid','test-password-123','admin');const saveAdminProduct=(db,input)=>saveProduct(db,input,actor.id),createAdminProduct=(db,input)=>createProduct(db,input,actor.id);const input={slug:'test-new-product',model:'Test Model',category:'desktop',manufacturer:'Dell',title:{he:'בדיקה',en:'Test'},description:{he:'תיאור',en:'Description'},purchasePrice:2500,leasePriceMonthly:125,leaseTermMonths:36,rentalRates:{dailyShort:36,dailyWeek:19,monthly:220},imagePath:'',published:true,imageVerified:true,detailsConfirmed:true};
  await assert.rejects(createAdminProduct(db,{...input,rentalRates:undefined}),/invalid_product/);
  await assert.rejects(createAdminProduct(db,{...input,slug:'invalid-lease-term',leaseTermMonths:12}),/invalid_product/);
  const created=await createAdminProduct(db,input);assert.equal(created.published,false);assert.equal(created.availability,'unconfirmed');assert.equal(created.featured,false);assert.equal(created.detailsConfirmed,false);assert.equal(created.imageVerified,false);assert.equal(created.rentalRates.monthly,220);assert.equal(created.category,'desktop');
  await assert.rejects(saveAdminProduct(db,{...created,leaseTermMonths:24}),/invalid_product/);
  const legacy=await createAdminProduct(db,{...input,slug:'legacy-lease-product'});await db.query("UPDATE products SET details_json=jsonb_set(details_json,'{leaseTermMonths}','12'::jsonb) WHERE id=$1",[legacy.id]);
  const legacyEdit=await saveAdminProduct(db,{...legacy,leaseTermMonths:12,model:'Legacy changed'});assert.equal(legacyEdit.leaseTermMonths,12);await assert.rejects(saveAdminProduct(db,{...legacyEdit,leaseTermMonths:24}),/invalid_product/);const corrected=await saveAdminProduct(db,{...legacyEdit,leaseTermMonths:36});assert.equal(corrected.leaseTermMonths,36);
  assert.equal((await getCatalog(db)).some(p=>p.id===created.id),false);await assert.rejects(createAdminProduct(db,input),/duplicate_slug/);
  const saved=await saveAdminProduct(db,{...created,published:true,displayOrder:20});assert.equal((await getCatalog(db)).find(p=>p.id===saved.id).rentalRates.monthly,220);
  const changedBounds=await saveAdminProduct(db,{...saved,rentalRates:{...saved.rentalRates,shortMaxDays:8,weekMaxDays:20}});assert.equal((await getCatalog(db)).find(p=>p.id===saved.id).rentalRates.shortMaxDays,8);assert.equal(changedBounds.rentalRates.weekMaxDays,20);await assert.rejects(saveAdminProduct(db,{...changedBounds,rentalRates:{...changedBounds.rentalRates,shortMaxDays:20,weekMaxDays:20}}),/invalid_product/);const legacyPayload={...changedBounds,rentalRates:{dailyShort:36,dailyWeek:19,monthly:220}};const keptBounds=await saveAdminProduct(db,legacyPayload);assert.equal(keptBounds.rentalRates.shortMaxDays,8);assert.equal(keptBounds.rentalRates.weekMaxDays,20);
  const order={id:randomUUID(),companyName:'Test',contactName:'Test',email:'test@example.invalid',phone:'123',lines:[{productSlug:keptBounds.slug,productVersion:keptBounds.editVersion,mode:'short_rental',quantity:1,rentalDays:7}]};const quote=await saveMultiQuote(db,order);assert.equal(quote.quote.items[0].periodTotalMinor,25200);const newBounds=await saveAdminProduct(db,{...keptBounds,rentalRates:{...keptBounds.rentalRates,shortMaxDays:6,weekMaxDays:29}});assert.equal((await saveMultiQuote(db,order)).quote.items[0].periodTotalMinor,25200);const newOrder=await saveMultiQuote(db,{...order,id:randomUUID(),lines:[{...order.lines[0],productVersion:newBounds.editVersion}]});assert.equal(newOrder.quote.items[0].periodTotalMinor,13300);
  const hidden=await saveAdminProduct(db,{...newBounds,published:false});
  const incomplete=await createAdminProduct(db,{...input,slug:'test-product-unknown',purchasePrice:null,leasePriceMonthly:null,rentalRates:{dailyShort:35,dailyWeek:null,monthly:null}});
  assert.equal(incomplete.purchasePrice,null);assert.equal(incomplete.rentalRates.dailyWeek,null);assert.equal(incomplete.published,false);
  const published=await saveAdminProduct(db,{...incomplete,published:true,displayOrder:10});const republished=await saveAdminProduct(db,{...hidden,published:true});const ordered=(await getCatalog(db)).filter(p=>[created.id,incomplete.id].includes(p.id));assert.deepEqual(ordered.map(p=>p.id),[incomplete.id,created.id]);assert.equal((await listProductHistory(db,new URLSearchParams({id:incomplete.id}))).events[0].new_data.displayOrder,10);await assert.rejects(saveAdminProduct(db,{...republished,displayOrder:-1}),/invalid_product/);await assert.rejects(saveAdminProduct(db,{...republished,displayOrder:1.5}),/invalid_product/);const cleared=await saveAdminProduct(db,{...republished,displayOrder:null,published:false});assert.equal(cleared.displayOrder,null);assert.equal(published.purchasePrice,null);assert.equal((await getCatalog(db)).find(p=>p.id===published.id).rentalRates.dailyWeek,null);
  const edited=await saveAdminProduct(db,{...published,published:false,title:{he:'חדש',en:'Updated'}});assert.equal(edited.purchasePrice,null);assert.equal(edited.rentalRates.dailyShort,35);
 }finally{await db.end();}
});

test('product edits persist, conflicts are rejected and unpublished products stay available to admin', async () => {
  const url = process.env.PC_LEASE_TEST_DATABASE_URL;
  let db = await openDatabase(url);
  await seedCatalog(db);
  const actor=await register(db,randomUUID()+'@example.invalid','test-password-123','admin');const saveAdminProduct=(db,input)=>saveProduct(db,input,actor.id);
  let products = await listAdminProducts(db);
  const original = products.find(p => p.published);
  const saved = await saveAdminProduct(db, { ...original, cpu:{family:'Test CPU',generation:12,exactModel:'T-12'},ramGB:32,storage:{capacityGB:1024,type:'SSD'},screen:{diagonalInches:14.5,touch:true},operatingSystem:'Test OS',availability:'onRequest',featured:false,purchasePrice: 2345, rentalRates: { dailyShort: 40, dailyWeek: 20, monthly: 199 }, imagePath: 'https://example.invalid/model.jpg', imageAlt:{he:'מחשב לדוגמה',en:'Test computer'}, imageVerified: true, detailsConfirmed: false, published: false });
  assert.equal(saved.editVersion, original.editVersion + 1);
  const history=await listProductHistory(db,new URLSearchParams({id:original.id}));assert.equal(history.events[0].new_data.purchasePrice,2345);assert.equal(history.events[0].new_data.availability,'onRequest');assert.equal(history.events[0].new_data.featured,false);assert.equal(history.events[0].previous_data.purchasePrice,original.purchasePrice);assert.equal(history.events[0].actor_email,actor.email);await assert.rejects(db.query('DELETE FROM product_history WHERE product_id=$1',[original.id]),/append only/);
  await assert.rejects(saveAdminProduct(db, { ...original, purchasePrice: 1 }), /version_conflict/);
  await assert.rejects(saveAdminProduct(db, { ...saved, purchasePrice: -1 }), /invalid_product/);await assert.rejects(saveAdminProduct(db, { ...saved, availability: 'invented' }), /invalid_product/);await assert.rejects(saveAdminProduct(db, { ...saved, featured: 'yes' }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, imagePath: 'javascript:alert(1)' }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, imageAlt:{he:'x',en:'x'.repeat(201)} }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, imageAlt:{he:'x',en:'bad\ntext'} }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, imageAlt:{he:'x'} }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, ramGB: -1 }), /invalid_product/);
  await assert.rejects(saveAdminProduct(db, { ...saved, screen:{diagonalInches:101} }), /invalid_product/);
  await db.end(); db = await openDatabase(url);
  try {
    products = await listAdminProducts(db);
    const found = products.find(p => p.id === original.id);
    assert.equal(found.purchasePrice, 2345);assert.equal(found.availability,'onRequest');assert.equal(found.featured,false);
    assert.deepEqual(found.cpu,{family:'Test CPU',generation:12,exactModel:'T-12'});assert.equal(found.ramGB,32);assert.equal(found.storage.capacityGB,1024);assert.equal(found.screen.diagonalInches,14.5);assert.equal(found.operatingSystem,'Test OS');
    assert.equal(found.rentalRates.monthly, 199);
    assert.equal(found.imageVerified, true);
    assert.equal(found.detailsConfirmed, false);
    assert.equal(found.imagePath, 'https://example.invalid/model.jpg');
    assert.deepEqual(found.imageAlt,{he:'מחשב לדוגמה',en:'Test computer'});
    assert.equal(found.published, false);
    assert.equal((await getCatalog(db)).some(p => p.id === original.id), false);
    const restored=await saveAdminProduct(db, { ...original, editVersion: found.editVersion, published: true });assert.deepEqual(restored.imageAlt,found.imageAlt);assert.deepEqual((await getCatalog(db)).find(p=>p.id===found.id).imageAlt,found.imageAlt);
  } finally { await db.end(); }
});
