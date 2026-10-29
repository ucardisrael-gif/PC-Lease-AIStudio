import test from 'node:test';
import assert from 'node:assert/strict';
import {renderContractDraft,contractOrderLines} from '../contract-pdf.mjs';

test('legacy lease and rental drafts use saved duration and period amounts',()=>{
 const lease={products:{model:'Model A',sku:'SKU-A'},quantity:2,terms:{mode:'lease',price:{termMonths:36,period:'month',totalAmountMinor:19800}}};
 const rental={products:{model:'Model B'},quantity:1,terms:{mode:'short_rental',price:{rentalDays:5,period:'rental_period',totalAmountMinor:17500}}};
 assert.match(contractOrderLines(lease,'en')[0],/Model A.*SKU-A.*Quantity: 2.*36 months.*198\.00 \/ per month/);
 assert.doesNotMatch(contractOrderLines(lease,'en')[0],/7128|712,800/);
 assert.match(contractOrderLines(rental,'en')[0],/Model B.*5 days.*175\.00/);
 assert.match(contractOrderLines({products:{model:'Model C'},quantity:1,terms:{mode:'lease'}},'en')[0],/Price not recorded/);
 assert.match(contractOrderLines({products:{},terms:{quote:{}}},'en')[0],/Saved item details unavailable/);
});

test('draft uses saved model, SKU and rental duration without inventing prices',()=>{
 const order={products:{quoteProducts:[{model:'Model A',sku:'SKU-A'},{model:'Model B'}]},terms:{quote:{items:[{quantity:2,mode:'short_rental',rentalDays:31,period:'rental_period',periodTotalMinor:41200},{quantity:1,mode:'lease',termMonths:36,period:'month',periodTotalMinor:null}]}}};
 const lines=contractOrderLines(order,'en');assert.match(lines[0],/Model A.*SKU-A.*Quantity: 2.*31 days.*412\.00/);assert.match(lines[1],/Model B.*36 months.*Price on request/);assert.doesNotMatch(lines[1],/SKU|₪0/);
 const hebrew=contractOrderLines(order,'he');assert.match(hebrew[0],/SKU-A/);assert.match(hebrew[0],/31 ימים/);assert.match(hebrew[1],/מחיר לפי בקשה/);
});

test('contract PDF paginates long runs of blank lines',async()=>{
 const pdf=await renderContractDraft({id:'test',version:1,requestId:'order',title:'Draft',terms:'Start\n'+ '\n'.repeat(100)+'End',order:{contact:{},products:{},terms:{}}},'en');
 const source=pdf.toString('latin1');
 assert.equal(source.startsWith('%PDF-'),true);
 assert.ok((source.match(/\/Type\s*\/Page\b/g)||[]).length>=3);
});

test('incomplete contract snapshots do not invent prices or fail PDF generation',async()=>{
 const lines=contractOrderLines({products:{quoteProducts:[]},terms:{quote:{items:[null,{quantity:1,mode:'purchase'},{quantity:1,mode:'lease',period:'one_time',periodTotalMinor:356400},{quantity:1,mode:'lease',period:'month',periodTotalMinor:null}]}}},'en');
 assert.match(lines[0],/Order item data is inconsistent/);assert.equal(lines[1],'Saved item details unavailable');assert.match(lines[2],/Price not recorded/);assert.match(lines[3],/Price not recorded/);assert.doesNotMatch(lines[3],/3564|356,400/);assert.match(lines[4],/Price on request/);
 const pdf=await renderContractDraft({id:'test',version:1,requestId:'order',title:'Draft',terms:'',order:{terms:{quote:{items:[null,{quantity:1,mode:'purchase'}]}}}},'en');assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
});
