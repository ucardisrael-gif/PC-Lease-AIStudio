import { INITIAL_PRODUCTS } from '../src/data/initialProducts.ts';
import {sortProducts} from './product-order.mjs';

export async function seedCatalog(db) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const product of INITIAL_PRODUCTS) {
      await client.query(`INSERT INTO products (id, slug, name, category, details_json, published)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [product.id, product.slug, product.model, product.category ?? 'laptop', JSON.stringify({ ...product, rentalRates: product.rentalRates ?? { dailyShort: 35, dailyWeek: 18, monthly: 199 } }), product.published]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function getCatalog(db) {
  const result = await db.query('SELECT details_json, published, edit_version FROM products WHERE published = true ORDER BY created_at, id');
  return sortProducts(result.rows.map(row => ({ ...row.details_json, published: row.published, editVersion: row.edit_version })));
}
