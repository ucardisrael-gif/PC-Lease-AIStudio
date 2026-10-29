import { calculateQuote } from '../src/data/quote-calculation.mjs';
import { getTaxSettings } from './tax-settings.mjs';

// Resolve prices on the server; never accept prices supplied by the browser.
export async function previewQuote(db, selections) {
  if (!Array.isArray(selections) || selections.length < 1 || selections.length > 25) throw new Error('invalid_quote');
  const slugs = selections.map(line => line?.productSlug);
  if (slugs.some(slug => typeof slug !== 'string' || !slug || slug.length > 120)) throw new Error('invalid_quote');
  const result = await db.query('SELECT slug, details_json, edit_version FROM products WHERE published=true AND slug=ANY($1::text[])', [slugs]);
  const products = new Map(result.rows.map(row => [row.slug, row]));
  const lines = selections.map(selection => {
    const row = products.get(selection.productSlug);
    if (!row) throw new Error('product_unavailable');
    if (selection.productVersion !== row.edit_version) throw new Error('price_changed');
    return { product: { ...row.details_json, slug: row.slug, editVersion: row.edit_version }, mode: selection.mode, quantity: selection.quantity, rentalDays: selection.rentalDays };
  });
  const tax = await getTaxSettings(db);
  return { ...calculateQuote(lines, tax.vat_basis_points, { allowUnpriced: true }), products: lines.map(({ product }) => ({ model: product.model, title: product.title, slug: product.slug, sku: product.sku || '' })) };
}
