import { previewQuote } from './quote-preview.mjs';
import { renderQuotePdf } from './quote-pdf.mjs';
import {previewLeaseSelection} from './lease-selection.mjs';

export async function createOfferPdf(db, lines, lang, contact, leaseSelection=null) {
  if (!contact || [contact.companyName, contact.contactName, contact.email, contact.phone].some(v => typeof v !== 'string' || !v.trim() || v.length > 200) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error('invalid_contact');
  const selection=leaseSelection?await previewLeaseSelection(db,{...leaseSelection,lines}):null;
  const quote = selection?{...selection.quote,leasePlan:selection.plan,addons:selection.extras,monthlyMinor:selection.monthlyMinor,oneTimeMinor:selection.oneTimeMinor}:await previewQuote(db, lines);
  return renderQuotePdf({ kind: 'offer', quote, products: quote.products, contact }, lang === 'en' ? 'en' : 'he');
}

export async function sendOffer(mailer, email, pdf, lang) {
  if (typeof email !== 'string' || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_email');
  if (!mailer) throw new Error('mail_unavailable');
  const en = lang === 'en';
  let result;
  try { result = await mailer.send({
    to: email.trim(), subject: en ? 'PC-LEASE price estimate' : 'PC-LEASE הצעת מחיר',
    text: en ? 'Your requested price estimate is attached. This is not an order; availability and terms require confirmation.' : 'מצורפת הצעת המחיר שביקשת. זו אינה הזמנה; הזמינות והתנאים כפופים לאישור.',
    attachments: [{ filename: 'pc-lease-estimate.pdf', content: pdf, contentType: 'application/pdf' }],
  }); } catch { throw new Error('mail_uncertain'); }
  if (!result.accepted?.length && result.rejected?.length) throw new Error('mail_unavailable');
  if (!result.accepted?.length || result.rejected?.length) throw new Error('mail_uncertain');
}
