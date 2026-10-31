import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice } from '../../src/data/calculate-price.mjs';
const product = { purchasePrice: 2000, leasePriceMonthly: 99, leaseTermMonths: 36, rentalRates: { dailyShort:35, dailyWeek:18, monthly:199 } };
test('only a confirmed applicable rental tier is used',()=>{
 const partial={...product,rentalRates:{dailyShort:35,dailyWeek:null,monthly:null}};
 for(const days of [1,2,6]) assert.throws(()=>calculatePrice(partial,'short_rental',1,days),/invalid_price/);
 assert.throws(()=>calculatePrice(partial,'short_rental',1,7),/price_unavailable/);
 assert.throws(()=>calculatePrice(partial,'short_rental',1,30),/price_unavailable/);
 assert.throws(()=>calculatePrice({...partial,purchasePrice:null},'purchase',1),/price_unavailable/);
});
test('rounds per unit to nearest shekel at all rental boundaries', () => {
  for (const [days, expected] of [[7,126],[29,522],[30,199],[31,206],[365,2421]]) {
    const result = calculatePrice(product,'short_rental',3,days);
    assert.equal(result.unitAmountMinor,expected*100);
    assert.equal(result.totalAmountMinor,expected*300);
  }
  assert.equal(calculatePrice(product,'lease',3).totalAmountMinor,29700);
  assert.equal(calculatePrice(product,'purchase',3).totalAmountMinor,600000);
  assert.throws(() => calculatePrice(product,'short_rental',1,366));
});
test('missing rental rates never create a fallback price', () => {
  const {rentalRates,...withoutRates}=product;
  assert.throws(()=>calculatePrice(withoutRates,'short_rental',1,30),/price_unavailable/);
  assert.equal(calculatePrice({...product,rentalRates:{dailyShort:35,dailyWeek:18,monthly:250}},'short_rental',1,30).unitAmountMinor,25000);
});

test('uses each model’s configured rental boundaries and preserves rounding',()=>{
 const custom={...product,rentalRates:{...product.rentalRates,shortMaxDays:10,weekMaxDays:20}};
 for(const [days,expected] of [[7,245],[10,350],[11,198],[20,360],[21,139],[31,206]])assert.equal(calculatePrice(custom,'short_rental',2,days).totalAmountMinor,expected*200);
 assert.throws(()=>calculatePrice({...custom,rentalRates:{...custom.rentalRates,shortMaxDays:20,weekMaxDays:20}},'short_rental',1,21),/price_unavailable/);
});
