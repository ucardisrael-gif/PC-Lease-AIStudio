import { INITIAL_PRODUCTS } from '../src/data/initialProducts.ts';
import {sortProducts} from './product-order.mjs';

export async function seedCatalog(db) {
  const initialPlans={'hp-elitebook-840-g4':['silver',99],'lenovo-thinkcentre-m720q-tiny':['silver',99],'dell-latitude-5420':['gold',139],'dell-latitude-7410':['gold',139],'lenovo-thinkpad-x1-carbon-gen-6':['gold',139],'dell-latitude-7420':['platinum',179],'dell-optiplex-7080-micro':['platinum',179]};
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const product of INITIAL_PRODUCTS) {
      const plan=initialPlans[product.slug];
      const inserted=await client.query(`INSERT INTO products (id, slug, name, category, details_json, published)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
        [product.id, product.slug, product.model, product.category ?? 'laptop', JSON.stringify({ ...product, ...(plan?{leasePriceMonthly:plan[1]}:{}), rentalRates: product.rentalRates ?? { dailyShort: 35, dailyWeek: 18, monthly: 199 } }), product.published]);
      if(inserted.rowCount&&plan)await client.query('INSERT INTO lease_plan_products(plan_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[plan[0],product.id]);
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
