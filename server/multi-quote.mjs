import { createHash } from 'node:crypto';
import { calculateQuote } from '../src/data/quote-calculation.mjs';
import { getTaxSettings } from './tax-settings.mjs';

export async function saveMultiQuote(db, payload) {
  const { id, lines, companyName, contactName, email, phone, taxId, city, notes, lang, source } = payload ?? {};
  const required = [companyName, contactName, email, phone];
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      !Array.isArray(lines) || !lines.length || lines.length > 25 ||
      required.some(v => typeof v !== 'string' || !v.trim() || v.length > 200) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      [taxId, city, notes].some(v => v != null && (typeof v !== 'string' || v.length > 2000)) ||
      (lang != null && !['he','en'].includes(lang)) || (source != null && source !== 'website')) throw new Error('invalid_request');
  const selections = lines.map(l => {
    if (!l || typeof l.productSlug !== 'string' || !l.productSlug || l.productSlug.length > 120 || !Number.isInteger(l.productVersion) || l.productVersion < 1 ||
        !['lease','purchase','short_rental'].includes(l.mode) || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 1000 ||
        (l.mode === 'short_rental' && (!Number.isInteger(l.rentalDays) || l.rentalDays < 1 || l.rentalDays > 365))) throw new Error('invalid_request');
    return { productSlug: l.productSlug, productVersion: l.productVersion, mode: l.mode, quantity: l.quantity, rentalDays: l.mode === 'short_rental' ? l.rentalDays : null };
  });
  const contact = { companyName: companyName.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(), taxId: taxId?.trim() || '', city: city?.trim() || '', notes: notes?.trim() || '' };
  const invalidControls=required.some(v=>/[\u0000-\u001f\u007f]/.test(v))||[taxId,city].some(v=>typeof v==='string'&&/[\u0000-\u001f\u007f]/.test(v))||(typeof notes==='string'&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes));
  const hash = createHash('sha256').update(JSON.stringify({ selections, contact })).digest('hex');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, order_number, request_hash, notification_status, product_snapshot_json, tariff_snapshot_json, contact_json, created_at FROM requests WHERE id=$1', [id]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.request_hash !== hash || !row.tariff_snapshot_json.quote) throw new Error('request_conflict');
      await client.query('COMMIT');
      return { id, orderNumber: row.order_number, created: false, notification: row.notification_status, quote: row.tariff_snapshot_json.quote, products: row.product_snapshot_json.quoteProducts, contact: row.contact_json, createdAt: row.created_at };
    }
    if(invalidControls)throw new Error('invalid_request');
    const slugs = [...new Set(selections.map(s => s.productSlug))].sort();
    const result = await client.query('SELECT id, slug, details_json, edit_version FROM products WHERE published=true AND slug=ANY($1::text[]) ORDER BY slug FOR SHARE', [slugs]);
    const products = new Map(result.rows.map(r => [r.slug, r]));
    const resolved = selections.map(selection => {
      const row = products.get(selection.productSlug);
      if (!row) throw new Error('product_unavailable');
      if (row.edit_version !== selection.productVersion) throw new Error('price_changed');
      return { product: { ...row.details_json, slug: row.slug, editVersion: row.edit_version }, ...selection };
    });
    const tax = await getTaxSettings(client, true);
    const quote = calculateQuote(resolved, tax.vat_basis_points, {allowUnpriced:true});
    const snapshots = resolved.map(l => ({ model: l.product.model, title: l.product.title, slug: l.product.slug, sku: l.product.sku || '', purchasePrice:l.product.purchasePrice ?? null, leasePriceMonthly:l.product.leasePriceMonthly ?? null, leaseTermMonths:l.product.leaseTermMonths ?? null, rentalRates:l.product.rentalRates ? {...l.product.rentalRates,shortMaxDays:l.product.rentalRates.shortMaxDays??6,weekMaxDays:l.product.rentalRates.weekMaxDays??29} : null }));
    const first = resolved[0], firstRow = products.get(first.productSlug);
    const price = quote.items[0].periodTotalMinor===null ? null : { totalAmountMinor: quote.items[0].periodTotalMinor, period: quote.items[0].period, includesVat: true };
    const productSnapshot = { ...first.product, quoteProducts: snapshots };
    const terms = { mode: first.mode, price, quote, kind: 'order', language: lang ?? null, source: source ?? null };
    const inserted = await client.query('INSERT INTO requests (id, product_id, product_snapshot_json, tariff_snapshot_json, contact_json, quantity, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING created_at,order_number', [id, firstRow.id, JSON.stringify(productSnapshot), JSON.stringify(terms), JSON.stringify(contact), first.quantity, hash]);
    if (!inserted.rowCount) {
      // A concurrent identical request may have committed after our initial lookup.
      const row = (await client.query('SELECT order_number, request_hash, notification_status, product_snapshot_json, tariff_snapshot_json, contact_json, created_at FROM requests WHERE id=$1', [id])).rows[0];
      if (!row || row.request_hash !== hash || !row.tariff_snapshot_json.quote) throw new Error('request_conflict');
      await client.query('COMMIT');
      return { id, orderNumber: row.order_number, created: false, notification: row.notification_status, quote: row.tariff_snapshot_json.quote, products: row.product_snapshot_json.quoteProducts, contact: row.contact_json, createdAt: row.created_at };
    }
    await client.query('COMMIT');
    return { id, orderNumber: inserted.rows[0].order_number, created: true, notification: 'pending', quote, products: snapshots, contact, createdAt: inserted.rows[0].created_at };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

export async function notifyMultiQuote(db, mailer, record, adminOrigin = null) {
  let status = 'failed';
  try {
    if (mailer) {
      const lines = record.quote.items.map((item, i) => {
        const product=record.products[i];
        const sku=product.sku?` · артикул: ${product.sku}`:'';
        const duration=item.mode==='short_rental'&&item.rentalDays!=null?` · срок: ${item.rentalDays} дн.`:item.mode==='lease'&&item.termMonths!=null?` · срок: ${item.termMonths} мес.`:'';
        const amount=item.periodTotalMinor===null?'цена по запросу':`₪${(item.periodTotalMinor / 100).toFixed(2)} (${item.period})`;
        return `${i+1}. ${product.model}${sku} · ${item.mode} · количество: ${item.quantity}${duration} · ${amount}`;
      }).join('\n');
      const settings=await getOrderNotificationSettings(db);
      const contact=record.contact;
      const extra=[contact.taxId&&`Регистрационный номер: ${contact.taxId}`,contact.city&&`Город: ${contact.city}`,contact.notes&&`Примечание: ${contact.notes}`].filter(Boolean).join('\n');
      const adminLink=adminOrigin?`\n\nОткрыть заказ после входа: ${adminOrigin}/#admin-order=${record.id}`:'';
      status = 'pending';
      const result = await mailer.send({ to: settings.recipient_email, subject: 'PC-LEASE: новый заказ', text: `Новый заказ без оплаты ${record.orderNumber ? `№${record.orderNumber}` : record.id}\n\n${lines}\n\nКомпания: ${contact.companyName}\nКонтакт: ${contact.contactName}\nEmail: ${contact.email}\nТелефон: ${contact.phone}${extra?`\n${extra}`:''}${adminLink}` });
      if (result.accepted.length && !result.rejected.length) status = 'sent';
      else if (!result.accepted.length && result.rejected.length) status = 'failed';
    }
  } catch { /* The request remains saved. */ }
  await db.query("UPDATE requests SET notification_status=$1, notification_pending_at=CASE WHEN $1='pending' THEN COALESCE(notification_pending_at,clock_timestamp()) ELSE NULL END WHERE id=$2", [status, record.id]);
  return status;
}
import {getOrderNotificationSettings} from './order-notification-settings.mjs';
