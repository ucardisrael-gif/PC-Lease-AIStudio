import { calculatePrice } from '../src/data/calculate-price.mjs';
import { createHash } from 'node:crypto';
import {getOrderNotificationSettings} from './order-notification-settings.mjs';

export async function saveRequest(db, payload) {
  const { id, productSlug, productVersion, mode, quantity, rentalDays, companyName, contactName, email, phone, taxId, city, notes } = payload;
  const fields = [companyName, contactName, email, phone];
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      typeof productSlug !== 'string' || productSlug.length > 120 || !Number.isInteger(productVersion) || productVersion < 1 || !['lease', 'purchase', 'short_rental'].includes(mode) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 ||
      (mode === 'short_rental' && (!Number.isInteger(rentalDays) || rentalDays < 1 || rentalDays > 365)) ||
      fields.some(value => typeof value !== 'string' || !value.trim() || value.length > 200) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      [taxId, city, notes].some(value => value != null && (typeof value !== 'string' || value.length > 2000))) {
    throw new Error('invalid_request');
  }
  const normalized = { productSlug, productVersion, mode, quantity, rentalDays: mode === 'short_rental' ? rentalDays : null,
    companyName: companyName.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(),
    taxId: taxId?.trim() || '', city: city?.trim() || '', notes: notes?.trim() || '' };
  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  const existing = await db.query('SELECT id, request_hash, notification_status FROM requests WHERE id = $1', [id]);
  if (existing.rowCount) {
    if (existing.rows[0].request_hash !== hash) throw new Error('request_conflict');
    return { id, created: false, notification: existing.rows[0].notification_status };
  }
  if(fields.some(value=>/[\u0000-\u001f\u007f]/.test(value))||[taxId,city].some(value=>typeof value==='string'&&/[\u0000-\u001f\u007f]/.test(value))||(typeof notes==='string'&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes)))throw new Error('invalid_request');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id, details_json, edit_version FROM products WHERE slug=$1 AND published=true FOR SHARE', [productSlug]);
    if (!product.rowCount) throw new Error('product_unavailable');
    const row = product.rows[0];
    if (row.edit_version !== productVersion) throw new Error('price_changed');
    const snapshot = row.details_json;
    const price = calculatePrice(snapshot, mode, quantity, normalized.rentalDays);
    const contact = { companyName: normalized.companyName, contactName: normalized.contactName, email: normalized.email, phone: normalized.phone, taxId: normalized.taxId, city: normalized.city, notes: normalized.notes };
    const terms = { mode, price, productVersion: row.edit_version, demo: true };
    const inserted = await client.query(`INSERT INTO requests (id, product_id, product_snapshot_json, tariff_snapshot_json, contact_json, quantity, request_hash)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [id, row.id, JSON.stringify(snapshot), JSON.stringify(terms), JSON.stringify(contact), quantity, hash]);
    if (!inserted.rowCount) {
      const found = await client.query('SELECT request_hash, notification_status FROM requests WHERE id = $1', [id]);
      if (found.rows[0].request_hash !== hash) throw new Error('request_conflict');
      await client.query('COMMIT');
      return { id, created: false, notification: found.rows[0].notification_status };
    }
    await client.query('COMMIT');
    return { id, created: true, notification: 'pending', details: { product: snapshot.title?.en || snapshot.model || productSlug, mode, quantity, rentalDays: normalized.rentalDays, price, ...contact } };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

}

export async function notifyRequest(db, mailer, request) {
  let status = 'failed';
  try {
    if (mailer) {
      const settings=await getOrderNotificationSettings(db);
      status = 'pending';
      const result = await mailer.send({ to: settings.recipient_email, subject: 'PC-LEASE: новая заявка', text: `Новая заявка PC-LEASE\nНомер: ${request.id}\nМодель: ${request.details.product}\nРежим: ${request.details.mode}\nКоличество: ${request.details.quantity}\nДней: ${request.details.rentalDays ?? '—'}\nКомпания: ${request.details.companyName}\nКонтакт: ${request.details.contactName}\nEmail: ${request.details.email}\nТелефон: ${request.details.phone}\nГород: ${request.details.city || '—'}\nПримечание: ${request.details.notes || '—'}\nРасчёт: ₪${request.details.price.totalAmountMinor / 100} (${request.details.price.period}). Наличие требует подтверждения.` });
      if (result.accepted.length && !result.rejected.length) status = 'sent';
      else if (!result.accepted.length && result.rejected.length) status = 'failed';
    }
  } catch { /* The request remains saved if notification cannot be delivered. */ }
  await db.query("UPDATE requests SET notification_status=$1, notification_pending_at=CASE WHEN $1='pending' THEN COALESCE(notification_pending_at,clock_timestamp()) ELSE NULL END WHERE id=$2", [status, request.id]);
  return status;
}
