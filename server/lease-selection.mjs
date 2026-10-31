import {previewQuote} from './quote-preview.mjs';
// Only explicitly enabled and fully priced add-ons are sent to the site.
export async function getPublicLeaseOptions(db){
 const plans=(await db.query('SELECT id,name,monthly_price,description_he,description_en,version FROM lease_plans ORDER BY monthly_price,id')).rows;
 const links=(await db.query("SELECT pp.plan_id,p.slug FROM lease_plan_products pp JOIN products p ON p.id=pp.product_id JOIN lease_plans lp ON lp.id=pp.plan_id WHERE p.published=true AND p.details_json->>'leasePriceMonthly'=lp.monthly_price::text ORDER BY pp.plan_id,p.slug")).rows;
 const addons=(await db.query("SELECT id,category,name_he,name_en,terms_he,terms_en,price,billing,version FROM lease_addons WHERE active=true AND price IS NOT NULL AND billing IS NOT NULL AND length(trim(terms_he))>0 AND length(trim(terms_en))>0 ORDER BY category,id")).rows;
 return {plans:plans.map(p=>({...p,productSlugs:links.filter(x=>x.plan_id===p.id).map(x=>x.slug)})),addons};
}
export async function previewLeaseSelection(db,input){
 if(!input||typeof input.planId!=='string'||!Number.isInteger(input.planVersion)||!Array.isArray(input.lines)||!Array.isArray(input.addons)||input.addons.length>50)throw Error('invalid_quote');
 const c=await db.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const result=await calculateLeaseSelection(c,input);
  await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
// The caller owns the transaction. For orders, lock each mutable price until
// the immutable order snapshot has been saved.
export async function calculateLeaseSelection(c,input,{lock=false}={}){
 if(!input||typeof input.planId!=='string'||!Number.isInteger(input.planVersion)||!Array.isArray(input.lines)||!Array.isArray(input.addons)||input.addons.length>50)throw Error('invalid_quote');
  const plan=(await c.query('SELECT * FROM lease_plans WHERE id=$1'+(lock?' FOR SHARE':''),[input.planId])).rows[0];if(!plan||plan.version!==input.planVersion)throw Error('price_changed');
  const slugs=input.lines.map(x=>x?.productSlug);const allowed=(await c.query("SELECT p.slug FROM lease_plan_products pp JOIN products p ON p.id=pp.product_id JOIN lease_plans lp ON lp.id=pp.plan_id WHERE pp.plan_id=$1 AND p.published=true AND p.details_json->>'leasePriceMonthly'=lp.monthly_price::text AND p.slug=ANY($2::text[])",[plan.id,slugs])).rows.map(x=>x.slug);
  if(input.lines.some(x=>!allowed.includes(x?.productSlug)||x?.mode!=='lease'))throw Error('invalid_quote');
  const ids=input.addons.map(a=>a?.id);if(ids.some(x=>typeof x!=='string'||!x||x.length>120)||new Set(ids).size!==ids.length||input.addons.some(a=>!Number.isInteger(a.version)||!Number.isInteger(a.quantity)||a.quantity<1||a.quantity>1000))throw Error('invalid_quote');
  const records=(await c.query('SELECT * FROM lease_addons WHERE id=ANY($1::text[]) ORDER BY id'+(lock?' FOR SHARE':''),[ids])).rows;const map=new Map(records.map(a=>[a.id,a]));
  const extras=input.addons.map(a=>{const x=map.get(a.id);if(!x||!x.active||x.version!==a.version||x.price===null||!x.billing||!x.terms_he.trim()||!x.terms_en.trim())throw Error('price_changed');return {id:x.id,version:x.version,nameHe:x.name_he,nameEn:x.name_en,termsHe:x.terms_he,termsEn:x.terms_en,quantity:a.quantity,unitMinor:x.price*100,totalMinor:x.price*100*a.quantity,billing:x.billing};});
  const quote=await previewQuote(c,input.lines);const monthly=quote.items.reduce((sum,x)=>x.periodTotalMinor===null?null:sum===null?null:sum+x.periodTotalMinor,0);const monthlyExtras=extras.filter(x=>x.billing==='month').reduce((s,x)=>s+x.totalMinor,0),once=extras.filter(x=>x.billing==='once').reduce((s,x)=>s+x.totalMinor,0);
  return {plan:{id:plan.id,name:plan.name,version:plan.version},quote,extras,monthlyMinor:monthly===null?null:monthly+monthlyExtras,oneTimeMinor:once};
}
