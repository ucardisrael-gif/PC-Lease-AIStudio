import test from 'node:test';
import assert from 'node:assert/strict';
import {renderQuotePdf} from '../quote-pdf.mjs';
import {calculateQuote} from '../../src/data/quote-calculation.mjs';

test('order PDF paginates a maximum-sized selection with distinct rental periods',async()=>{
 const products=Array.from({length:25},(_,i)=>({model:`Test model ${i+1}`,sku:`SKU-${i+1}`}));
 const items=products.map((_,i)=>({mode:'short_rental',rentalDays:i+1,quantity:1,unitAmountMinor:19900,periodTotalMinor:19900,period:'rental_period'}));
 const record={id:'test',orderNumber:'42',contact:{companyName:'Example',contactName:'Person',email:'test@example.invalid',phone:'123'},products,quote:{items}};
 for(const lang of ['he','en']){const pdf=await renderQuotePdf(record,lang),source=pdf.toString('latin1');assert.equal(source.startsWith('%PDF-'),true);assert.ok((source.match(/\/Type\s*\/Page\b/g)||[]).length>=3);}
});

test('mixed lease, rental and purchase render with no combined contract total',async()=>{
 const base={slug:'a',editVersion:1,leaseTermMonths:36,leasePriceMonthly:99,purchasePrice:2000,rentalRates:{dailyShort:35,dailyWeek:18,monthly:199}};
 const quote=calculateQuote([{product:base,mode:'lease',quantity:2},{product:{...base,slug:'b'},mode:'short_rental',quantity:1,rentalDays:31},{product:{...base,slug:'c'},mode:'purchase',quantity:1}],1800);
 assert.equal(quote.totalMinor,null);assert.equal(quote.items[0].contractTotalMinor,null);
 const record={kind:'order',orderNumber:'123',contact:{companyName:'Example',contactName:'Person',email:'test@example.invalid',phone:'123'},products:[{model:'A'},{model:'B'},{model:'C'}],quote};
 for(const lang of ['he','en']){const pdf=await renderQuotePdf(record,lang);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>3000);}
});

test('long item identifiers and contacts render across pages',async()=>{
 const products=Array.from({length:12},(_,i)=>({title:{he:'מחשב עסקי '.repeat(15)+i,en:'Long business computer '.repeat(8)+i},sku:'S'+String(i)+'-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(2)}));
 const items=products.map((_,i)=>({mode:i%2?'short_rental':'lease',rentalDays:31,quantity:1,unitAmountMinor:9900,periodTotalMinor:9900,period:i%2?'rental_period':'month'}));
 const record={kind:'order',orderNumber:'123',contact:{companyName:'Long company '.repeat(12),contactName:'Long name '.repeat(12),email:'long-test-address@example.invalid',phone:'123'},products,quote:{items}};
 for(const lang of ['he','en']){const pdf=await renderQuotePdf(record,lang),source=pdf.toString('latin1');assert.equal(source.startsWith('%PDF-'),true);assert.ok((source.match(/\/Type\s*\/Page\b/g)||[]).length>=3);}
});
