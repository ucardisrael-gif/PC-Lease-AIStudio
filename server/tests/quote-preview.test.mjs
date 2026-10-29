import test from 'node:test';
import assert from 'node:assert/strict';
import { previewQuote } from '../quote-preview.mjs';

test('preview uses published server prices and rejects stale selections', async () => {
  const db = { query: async (sql) => sql.includes('tax_settings') ? ({rowCount:1,rows:[{vat_basis_points:1800}]}) : ({ rows: [
    { slug: 'a', edit_version: 2, details_json: { leaseTermMonths: 36, leasePriceMonthly: 100, purchasePrice: 2000, rentalRates: { dailyShort: 35, dailyWeek: 18, monthly: 199 } } },
    { slug: 'b', edit_version: 1, details_json: { leaseTermMonths: 36, leasePriceMonthly: 150, purchasePrice: 3000, rentalRates: { dailyShort: 35, dailyWeek: 18, monthly: 199 } } },
  ] }) };
  const lines = [
    { productSlug: 'a', productVersion: 2, mode: 'purchase', quantity: 2, purchasePrice: 1 },
    { productSlug: 'b', productVersion: 1, mode: 'short_rental', quantity: 2, rentalDays: 31 },
  ];
  const quote = await previewQuote(db, lines);
  assert.equal(quote.totalMinor, null);
  assert.equal(quote.subtotalMinor, null);
  assert.equal(quote.vatMinor, null);
  await assert.rejects(previewQuote(db, [{ ...lines[0], productVersion: 1 }]), /price_changed/);
  await assert.rejects(previewQuote(db, [{ ...lines[0], productSlug: 'missing' }]), /product_unavailable/);
});


test('preview preserves missing prices without hiding priced items', async () => {
  const db = { query: async (sql) => sql.includes('tax_settings') ? ({rowCount:1,rows:[{vat_basis_points:1800}]}) : ({ rows: [
    { slug: 'known', edit_version: 1, details_json: { leaseTermMonths: 36, leasePriceMonthly: 100, purchasePrice: 2000, rentalRates: { dailyShort: 35, dailyWeek: 18, monthly: 199 } } },
    { slug: 'unknown', edit_version: 1, details_json: { leaseTermMonths: 36, leasePriceMonthly: null, purchasePrice: null, rentalRates: { dailyShort: 35, dailyWeek: null, monthly: null } } },
  ] }) };
  const lines = [{ productSlug: 'known', productVersion: 1, mode: 'purchase', quantity: 2 }, { productSlug: 'unknown', productVersion: 1, mode: 'lease', quantity: 1 }];
  const quote = await previewQuote(db, lines);
  assert.equal(quote.items[0].periodTotalMinor, 400000);
  assert.equal(quote.items[1].periodTotalMinor, null);
  assert.equal(quote.totalMinor, null);
  await assert.rejects(previewQuote(db, [{ ...lines[1], quantity: 0 }]), /invalid/);
});
