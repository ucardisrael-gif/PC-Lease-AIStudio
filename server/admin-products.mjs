import {randomUUID} from 'node:crypto';
import {requireTransactionPermission} from './transaction-permissions.mjs';
import {sortProducts} from './product-order.mjs';
import {readProductMedia} from './product-media.mjs';
async function validateMedia(db,path,access){if(!path?.startsWith('/api/media/'))return;try{await readProductMedia(db,path.slice(11),access);}catch(error){if(error.message==='not_found')throw Error('invalid_product');throw error;}}
export async function listAdminProducts(db) {
  const result = await db.query('SELECT details_json,published,edit_version FROM products ORDER BY created_at,id');
  return sortProducts(result.rows.map(row => ({ ...row.details_json, published: row.published, editVersion: row.edit_version })));
}
function validateProduct(input) {
  const { id, editVersion, model, sku, title, description, purchasePrice, leasePriceMonthly, leaseTermMonths, rentalRates, published, imagePath, imageVerified, detailsConfirmed } = input ?? {};
  const validText = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  const money = n => n === null || (Number.isSafeInteger(n) && n >= 0 && n <= 10000000);
  if (!validText(id,120) || !Number.isInteger(editVersion) || editVersion < 1 || !validText(model,120) ||
      !validText(title?.he,200) || !validText(title?.en,200) || !validText(description?.he,2000) || !validText(description?.en,2000) ||
      !money(purchasePrice) || !money(leasePriceMonthly) || !Number.isInteger(leaseTermMonths) || leaseTermMonths < 1 || leaseTermMonths > 120 ||
      !money(rentalRates?.dailyShort) || !money(rentalRates?.dailyWeek) || !money(rentalRates?.monthly) || typeof published !== 'boolean') throw new Error('invalid_product');
  if (imageVerified !== undefined && typeof imageVerified !== 'boolean') throw new Error('invalid_product');
  if (sku !== undefined && (typeof sku !== 'string' || sku.length > 80)) throw new Error('invalid_product');
  if (detailsConfirmed !== undefined && typeof detailsConfirmed !== 'boolean') throw new Error('invalid_product');
  if (input.availability !== undefined && !['unconfirmed','available','onRequest'].includes(input.availability)) throw new Error('invalid_product');
  if (input.displayOrder !== undefined && input.displayOrder !== null && (!Number.isSafeInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 999999)) throw new Error('invalid_product');
  if (input.featured !== undefined && typeof input.featured !== 'boolean') throw new Error('invalid_product');
  if (input.imageAlt !== undefined && (!input.imageAlt || typeof input.imageAlt !== 'object' || Array.isArray(input.imageAlt) || Object.keys(input.imageAlt).length !== 2 || !['he','en'].every(k => typeof input.imageAlt[k] === 'string' && input.imageAlt[k].length <= 200 && !/[\u0000-\u001f\u007f]/.test(input.imageAlt[k])))) throw new Error('invalid_product');
  const hasSpecs=['cpu','ramGB','storage','screen','operatingSystem'].some(key=>Object.hasOwn(input,key));
  if(hasSpecs){
    const {cpu,ramGB,storage,screen,operatingSystem}=input;
    const text=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
    const bounded=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
    if(!cpu||!text(cpu.family,120)||!bounded(cpu.generation,100)||(cpu.exactModel!==undefined&&!text(cpu.exactModel,120))||!bounded(ramGB,65536)||!storage||!bounded(storage.capacityGB,10000000)||(storage.type!==undefined&&!text(storage.type,120))||!screen||typeof screen.diagonalInches!=='number'||!Number.isFinite(screen.diagonalInches)||screen.diagonalInches<0||screen.diagonalInches>100||(screen.touch!==undefined&&typeof screen.touch!=='boolean')||!text(operatingSystem,200))throw Error('invalid_product');
  }
  const shortMax=rentalRates.shortMaxDays,weekMax=rentalRates.weekMaxDays;
  if ((shortMax!==undefined&&!Number.isInteger(shortMax))||(weekMax!==undefined&&!Number.isInteger(weekMax))||(shortMax!==undefined&&(shortMax<1||shortMax>363))||(weekMax!==undefined&&(weekMax<2||weekMax>364))||(shortMax!==undefined&&weekMax!==undefined&&shortMax>=weekMax))throw new Error('invalid_product');
  if (imagePath !== undefined && (typeof imagePath !== 'string' || imagePath.length > 500 || (imagePath !== '' && (!(/^(?:\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\/brand\/[\w./-]+\.(?:png|jpe?g|webp|avif)|https:\/\/[^\s/]+\/[^\s]*)$/i.test(imagePath)) || imagePath.includes('..') || imagePath.includes('\\'))))) throw new Error('invalid_product');
  if (imageVerified === true && !imagePath) throw new Error('invalid_product');
  if (input.gallery !== undefined && (!Array.isArray(input.gallery) || input.gallery.length > 10 || new Set(input.gallery).size !== input.gallery.length || input.gallery.some(path => typeof path !== 'string' || !/^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path)))) throw Error('invalid_product');
  if (input.customSpecs !== undefined && (!Array.isArray(input.customSpecs) || input.customSpecs.length > 30 || input.customSpecs.some(spec => !spec || typeof spec !== 'object' || Array.isArray(spec) || !['nameHe','nameEn','valueHe','valueEn'].every(k => typeof spec[k] === 'string' && spec[k].trim().length > 0 && spec[k].length <= 200 && !/[\u0000-\u001f\u007f]/.test(spec[k]))))) throw Error('invalid_product');
  const fields = { model: model.trim(), title: { he: title.he.trim(), en: title.en.trim() }, description: { he: description.he.trim(), en: description.en.trim() }, purchasePrice, leasePriceMonthly, leaseTermMonths, rentalRates };
  if (sku !== undefined) fields.sku = sku.trim();
  if (imagePath !== undefined) fields.imagePath = imagePath;
  if (input.gallery !== undefined) fields.gallery = input.gallery;
  if (input.customSpecs !== undefined) fields.customSpecs = input.customSpecs.map(spec=>Object.fromEntries(['nameHe','nameEn','valueHe','valueEn'].map(k=>[k,spec[k].trim()])));
  if (input.imageAlt !== undefined) fields.imageAlt = {he:input.imageAlt.he.trim(),en:input.imageAlt.en.trim()};
  if (imageVerified !== undefined) fields.imageVerified = imageVerified;
  if (detailsConfirmed !== undefined) fields.detailsConfirmed = detailsConfirmed;
  if (input.availability !== undefined) fields.availability = input.availability;
  if (input.displayOrder !== undefined) fields.displayOrder = input.displayOrder;
  if (input.featured !== undefined) fields.featured = input.featured;
  if(hasSpecs){fields.cpu={family:input.cpu.family.trim(),generation:input.cpu.generation,...(input.cpu.exactModel!==undefined?{exactModel:input.cpu.exactModel.trim()}:{})};fields.ramGB=input.ramGB;fields.storage={capacityGB:input.storage.capacityGB,...(input.storage.type!==undefined?{type:input.storage.type.trim()}:{})};fields.screen={diagonalInches:input.screen.diagonalInches,...(input.screen.touch!==undefined?{touch:input.screen.touch}:{})};fields.operatingSystem=input.operatingSystem.trim();}
  return {id,editVersion,published,fields};
}
export async function saveAdminProduct(db,input,actorId,access={userId:actorId,catalog:true}){
 const {id,editVersion,published,fields}=validateProduct(input);const c=await db.connect();try{await c.query('BEGIN');
 access=await requireTransactionPermission(c,actorId,'catalog');
 await validateMedia(c,fields.imagePath,access);
 for(const path of fields.gallery||[]) await validateMedia(c,path,access);
 const old=(await c.query('SELECT details_json,published,edit_version FROM products WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!old||old.edit_version!==editVersion)throw Error('version_conflict');
 if(fields.leaseTermMonths!==36&&fields.leaseTermMonths!==old.details_json.leaseTermMonths)throw Error('invalid_product');
 const previous=old.details_json.rentalRates||{};fields.rentalRates={...fields.rentalRates,shortMaxDays:fields.rentalRates.shortMaxDays??previous.shortMaxDays??6,weekMaxDays:fields.rentalRates.weekMaxDays??previous.weekMaxDays??29};if(fields.rentalRates.shortMaxDays>=fields.rentalRates.weekMaxDays)throw Error('invalid_product');
 const row=(await c.query('UPDATE products SET name=$1,details_json=details_json || $2::jsonb,published=$3,edit_version=edit_version+1 WHERE id=$4 RETURNING details_json,published,edit_version',[fields.model,JSON.stringify(fields),published,id])).rows[0];
 const snapshot=x=>({...x.details_json,published:x.published,editVersion:x.edit_version});await c.query('INSERT INTO product_history(product_id,actor_user_id,previous_data,new_data) VALUES($1,$2,$3,$4)',[id,actorId,JSON.stringify(snapshot(old)),JSON.stringify(snapshot(row))]);await c.query('COMMIT');return snapshot(row);
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
export async function createAdminProduct(db,input,actorId,access={userId:actorId,catalog:true}){
 if(!input||typeof input.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)||input.slug.length>120||!['laptop','desktop'].includes(input.category)||!['Dell','HP','Lenovo'].includes(input.manufacturer))throw Error('invalid_product');
 const id=randomUUID();const {fields}=validateProduct({...input,id,editVersion:1,published:false,imageVerified:false,detailsConfirmed:false});
 if(fields.leaseTermMonths!==36)throw Error('invalid_product');
 fields.rentalRates={...fields.rentalRates,shortMaxDays:fields.rentalRates.shortMaxDays??6,weekMaxDays:fields.rentalRates.weekMaxDays??29};if(fields.rentalRates.shortMaxDays>=fields.rentalRates.weekMaxDays)throw Error('invalid_product');
 const details={...fields,id,slug:input.slug,category:input.category,manufacturer:input.manufacturer,cpu:fields.cpu||{family:'',generation:0},ramGB:fields.ramGB??0,storage:fields.storage||{capacityGB:0},screen:fields.screen||{diagonalInches:0},operatingSystem:fields.operatingSystem||'',availability:'unconfirmed',featured:fields.featured??false,imageVerified:false,detailsConfirmed:false};
 const c=await db.connect();try{await c.query('BEGIN');access=await requireTransactionPermission(c,actorId,'catalog');await validateMedia(c,fields.imagePath,access);for(const path of fields.gallery||[]) await validateMedia(c,path,access);
 const row=(await c.query('INSERT INTO products(id,slug,name,category,details_json,published) VALUES($1,$2,$3,$4,$5,false) RETURNING details_json,published,edit_version',[id,input.slug,fields.model,input.category,JSON.stringify(details)])).rows[0];const snapshot={...row.details_json,published:row.published,editVersion:row.edit_version};await c.query('INSERT INTO product_history(product_id,actor_user_id,new_data) VALUES($1,$2,$3)',[id,actorId,JSON.stringify(snapshot)]);await c.query('COMMIT');return snapshot;
 }catch(error){await c.query('ROLLBACK');if(error.code==='23505')throw Error('duplicate_slug');throw error;}finally{c.release();}
}
export async function listProductHistory(db,params){
 const id=params.get('id')||'',offset=params.get('offset')||'0';if(!id||id.length>120||/[\u0000-\u001f\u007f]/.test(id)||!/^\d{1,7}$/.test(offset))throw Error('invalid_input');
 if(!(await db.query('SELECT 1 FROM products WHERE id=$1',[id])).rowCount)throw Error('not_found');const rows=(await db.query('SELECT h.id,h.previous_data,h.new_data,h.created_at,u.email AS actor_email FROM product_history h JOIN users u ON u.id=h.actor_user_id WHERE h.product_id=$1 ORDER BY h.id DESC LIMIT 26 OFFSET $2',[id,Number(offset)])).rows;return {events:rows.slice(0,25),hasMore:rows.length>25,offset:Number(offset)};
}
