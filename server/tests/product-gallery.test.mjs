import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {openDatabase} from '../database.mjs';
import {register} from '../auth.mjs';
import {uploadProductMedia,readProductMedia} from '../product-media.mjs';
import {createAdminProduct,saveAdminProduct,listProductHistory} from '../admin-products.mjs';
import {getCatalog} from '../catalog.mjs';

test('multiple product photos and custom specifications persist with approval and access checks',async()=>{
 const db=await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);let productId;
 try{
  const actor=await register(db,randomUUID()+'@example.invalid','test-password-123','admin');
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#2684ff'}}).png().toBuffer();
  const images=[];for(let i=0;i<2;i++)images.push((await uploadProductMedia(db,actor.id,{data:bytes.toString('base64')},'catalog')).path);
  const specs=[{nameHe:'צבע',nameEn:'Color',valueHe:'כחול',valueEn:'Blue'}];
  const draft=await createAdminProduct(db,{slug:'gallery-'+randomUUID(),model:'Fixture',category:'laptop',manufacturer:'Dell',title:{he:'בדיקה',en:'Test'},description:{he:'בדיקה',en:'Test'},purchasePrice:null,leasePriceMonthly:99,leaseTermMonths:36,rentalRates:{dailyShort:35,dailyWeek:18,monthly:199},imagePath:images[0],gallery:images,customSpecs:specs},actor.id);
  productId=draft.id;assert.deepEqual(draft.gallery,images);assert.deepEqual(draft.customSpecs,specs);await assert.rejects(readProductMedia(db,images[1].slice(11)),/not_found/);
  const published=await saveAdminProduct(db,{...draft,published:true,imageVerified:true,detailsConfirmed:true},actor.id);
  assert.ok((await readProductMedia(db,images[1].slice(11))).length>0);assert.deepEqual((await getCatalog(db)).find(p=>p.id===draft.id).customSpecs,specs);
  const history=await listProductHistory(db,new URLSearchParams({id:draft.id}));assert.deepEqual(history.events[0].new_data.gallery,images);
  await assert.rejects(saveAdminProduct(db,{...published,gallery:['/api/media/'+randomUUID()]} ,actor.id),/invalid_product/);
  await assert.rejects(saveAdminProduct(db,{...published,customSpecs:[{...specs[0],valueEn:''}]},actor.id),/invalid_product/);
  const changed=await saveAdminProduct(db,{...published,gallery:[images[0]],imageVerified:true},actor.id);assert.equal(changed.gallery.length,1);await assert.rejects(readProductMedia(db,images[1].slice(11)),/not_found/);
 }finally{if(productId)await db.query('UPDATE products SET published=false WHERE id=$1',[productId]);await db.end();}
});
