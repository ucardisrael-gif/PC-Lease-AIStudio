import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../database.mjs';
import { seedCatalog, getCatalog } from '../catalog.mjs';
import { listAdminProducts } from '../admin-products.mjs';

test('missing rental rates stay missing in public and admin catalogues', async () => {
  const db={query:async()=>({rows:[{details_json:{id:'example',model:'Example'},published:true,edit_version:1}]})};
  assert.equal((await getCatalog(db))[0].rentalRates,undefined);
  assert.equal((await listAdminProducts(db))[0].rentalRates,undefined);
});

test('catalog seed preserves edits and excludes unpublished products', async () => {
  const db = await openDatabase(process.env.PC_LEASE_TEST_DATABASE_URL);
  try {
    await seedCatalog(db);
    const initial = await getCatalog(db);
    assert.equal(initial.length, 7);
    const slug = initial[0].slug;
    await db.query('UPDATE products SET published = false WHERE slug = $1', [slug]);
    await seedCatalog(db);
    const visible = await getCatalog(db);
    assert.equal(visible.length, 6);
    assert.equal(visible.some(product => product.slug === slug), false);
  } finally { await db.end(); }
});
