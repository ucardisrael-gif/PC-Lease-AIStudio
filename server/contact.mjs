import { getSection } from './site-blocks.mjs';

export async function sendContactMessage(db, mailer, body) {
  const { name, email, phone, message } = body ?? {};
  if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
      typeof email !== 'string' || email.length > 200 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      typeof phone !== 'string' || phone.length > 80 || /[\r\n]/.test(phone) ||
      (!email.trim() && !phone.trim()) || typeof message !== 'string' || !message.trim() || message.length > 4000) throw new Error('invalid_contact');
  const block = await getSection(db, 'contact');
  if (!block.content.visible || !mailer) throw new Error('contact_unavailable');
  let result;
  try { result = await mailer.send({ to: block.content.recipientEmail, ...(email ? {replyTo: email} : {}), subject: 'PC-LEASE: сообщение с сайта',
    text: `Сообщение с сайта PC-LEASE\nИсточник: ${body.source || 'не указан'}\nМодель: ${body.product_model || '—'}\nАртикул: ${body.product_sku || '—'}\nИмя: ${name.trim()}\nКомпания: ${body.company || '—'}\nКоличество устройств: ${body.desired_quantity ?? '—'}\nEmail: ${email}\nТелефон: ${phone.trim() || '—'}\n\n${message.trim()}` }); } catch { throw new Error('notification_uncertain'); }
  if (!result.accepted?.length && result.rejected?.length) throw new Error('contact_unavailable');
  if (!result.accepted?.length || result.rejected?.length) throw new Error('notification_uncertain');
}
