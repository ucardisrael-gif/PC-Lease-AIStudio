import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote } from '../../src/data/quote-calculation.mjs';

const product = { slug: 'model-a', editVersion: 1, pricingConfirmed: true, leaseTermMonths: 36, leasePriceMonthly: 100, purchasePrice: 2000, rentalRates: { dailyShort: 35, dailyWeek: 18, monthly: 199 } };
const second = { ...product, slug: 'model-b', leasePriceMonthly: 200 };

test('unpriced request keeps missing amounts unknown and preserves priced lines',()=>{
 const missing={...second,purchasePrice:null,rentalRates:{dailyShort:35,dailyWeek:null,monthly:199}};
 const lines=[{product,mode:'lease',quantity:2},{product:missing,mode:'purchase',quantity:1}];
 assert.throws(()=>calculateQuote(lines,1800),/price_unavailable/);
 const quote=calculateQuote(lines,1800,{allowUnpriced:true});
 assert.equal(quote.items[0].periodTotalMinor,20000);assert.equal(quote.items[1].periodTotalMinor,null);assert.equal(quote.items[1].unitAmountMinor,null);assert.equal(quote.totalMinor,null);assert.equal(quote.subtotalMinor,null);assert.equal(quote.vatMinor,null);
 assert.equal(calculateQuote([{product:missing,mode:'short_rental',quantity:1,rentalDays:7}],1800,{allowUnpriced:true}).items[0].periodTotalMinor,null);
 assert.throws(()=>calculateQuote([{product:missing,mode:'short_rental',quantity:1,rentalDays:6}],1800,{allowUnpriced:true}),/invalid_price/);
 assert.throws(()=>calculateQuote([{product:missing,mode:'short_rental',quantity:1,rentalDays:366}],1800,{allowUnpriced:true}),/invalid_price/);
 assert.throws(()=>calculateQuote([{product:{...missing,leaseTermMonths:12},mode:'lease',quantity:1}],1800,{allowUnpriced:true}),/price_unavailable/);
});

test('lease quotes preserve monthly amounts without calculating full-term totals', () => {
  const quote = calculateQuote([{ product, mode: 'lease', quantity: 2 }, { product: second, mode: 'lease', quantity: 1 }], 1800);
  assert.equal(quote.items.length, 2);
  assert.equal(quote.items[0].periodTotalMinor, 20000);
  assert.equal(quote.items[0].contractTotalMinor,null);
  assert.equal(quote.subtotalMinor,null);
  assert.equal(quote.vatMinor,null);
  assert.equal(quote.totalMinor,null);
});

test('quote rejects missing or unconfirmed prices and handles unknown VAT', () => {
  const line = { product, mode: 'short_rental', quantity: 2, rentalDays: 31 };
  const quote = calculateQuote([line], null);
  assert.equal(quote.items[0].contractTotalMinor, 41200);
  assert.equal(quote.vatMinor, null);
  assert.equal(quote.subtotalMinor, null);
  assert.equal(quote.totalMinor, 41200);
  assert.throws(() => calculateQuote([{ ...line, product: { ...product, rentalRates: undefined } }], 1800), /price_unavailable/);
  assert.throws(() => calculateQuote([{ ...line, quantity: 0 }], 1800), /invalid_price/);
  assert.throws(() => calculateQuote([line], 1800.5), /invalid_vat/);
});

test('only comparable one-time amounts are aggregated',()=>{
 const purchase={product,mode:'purchase',quantity:1};const rental={product:second,mode:'short_rental',quantity:1,rentalDays:31};
 const mixed=calculateQuote([purchase,rental],1800);assert.equal(mixed.totalMinor,null);assert.equal(mixed.vatMinor,null);assert.equal(mixed.items[0].periodTotalMinor,200000);assert.equal(mixed.items[1].periodTotalMinor,20600);
 assert.equal(calculateQuote([rental,{...rental,rentalDays:30}],1800).totalMinor,null);
 const same=calculateQuote([rental,{...rental,quantity:2}],1800);assert.equal(same.totalMinor,61800);assert.equal(same.subtotalMinor+same.vatMinor,same.totalMinor);
});
