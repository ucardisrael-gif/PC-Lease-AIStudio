import { defaultTrust } from '../src/data/trust-defaults.mjs';
import { defaultHero } from '../src/data/hero-defaults.mjs';
import { sectionDefaults } from '../src/data/section-defaults.mjs';
import { readProductMedia } from './product-media.mjs';
const mediaPath = /^\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
// Update only the former built-in wording; preserve independently edited text.
function currentRentalWording(key, content) {
  const old = key === 'calculator' ? {
    shortRentalModeHe:'השכרה גמישה (מיום עד שנה)', shortRentalModeEn:'Flexible Rental (1 Day to 1 Year)',
    rentalTermLabelHe:'תקופת השכרה מבוקשת (מיום 1 עד שנה)', rentalTermLabelEn:'Rental Duration (1 Day up to 1 Year)',
    disclaimerHe:'מסלול השכרה ניתן לבחירה מיום אחד ועד שנה (365 יום). זמינות ותנאי אספקה כפופים לאישור.',
    disclaimerEn:'Rentals are available from 1 day up to 1 year (365 days). Availability and delivery terms require confirmation.'
  } : key === 'hero' ? {
    bodyHe:'מחשבים עסקיים מחודשים של Dell, HP ו־Lenovo, עם שירות ותיקונים שלנו. בחרו ליסינג ל־36 חודשים או השכרה מיום אחד ועד שנה — והתאימו את המחשוב לצוות ולתקציב שלכם.',
    bodyEn:'Refurbished business computers from Dell, HP and Lenovo, backed by our service and repairs. Choose a 36-month lease or rent from one day to one year, with equipment that fits your team and budget.'
  } : key === 'faq' ? {
    answer1He:'ליסינג הוא הסכם ל-36 חודשים. השכרה מתאימה לתקופה קצרה יותר, מיום אחד ועד שנה. התעריפים תלויים בדגם ובתקופה.',
    answer1En:'A lease is a 36-month agreement. Rental is available for shorter periods, from one day up to one year. Rates depend on the model and period.',
    answer6He:'אפשר לשכור מיום אחד ועד שנה, בכפוף לזמינות ולתנאי ההצעה. השירות ניתן במהלך תקופת ההשכרה.',
    answer6En:'Rental is available from one day up to one year, subject to availability and the quote. Service is provided during the rental period.'
  } : {};
  const defaults=key==='hero'?defaultHero:sectionDefaults[key];
  const updated={...content};for(const [field, previous] of Object.entries(old))if(updated[field]===previous)updated[field]=defaults[field];return updated;
}
async function validImage(db, image, access) {
  const match = mediaPath.exec(image);
  if (match) { try { await readProductMedia(db, match[1], access); return true; } catch (error) { if (error.message === 'not_found') return false; throw error; } }
  return (image.startsWith('/brand/') && !image.includes('..') && !image.includes('\\') && /^\/brand\/[\w./-]+\.(?:png|jpe?g|webp|avif)$/i.test(image)) || /^https:\/\/[^\s/]+\/[^\s]*$/i.test(image);
}

export async function getSection(db, key) {
  if (!Object.hasOwn(sectionDefaults, key)) throw new Error('invalid_block');
  const result = await db.query('SELECT content, version FROM site_blocks WHERE block_key = $1', [key]);
  if (!result.rowCount) return { content: sectionDefaults[key], version: 0 };
  const row = result.rows[0];
  if (key === 'contact') return { ...row, content: { ...sectionDefaults.contact, publicEmail: row.content.recipientEmail, ...row.content } };
  if (key === 'footer' || key === 'calculator' || key === 'about') return { ...row, content: currentRentalWording(key,{ ...sectionDefaults[key], ...row.content }) };
  if (key === 'faq') return {...row,content:currentRentalWording(key,row.content)};
  return row;
}

export async function saveSection(db, key, input, access = {}) {
  if (!Object.hasOwn(sectionDefaults, key) || !input || !Number.isSafeInteger(input.version) || input.version < 0 || !input.content || typeof input.content !== 'object' || Array.isArray(input.content)) throw new Error('invalid_block');
  const keys = Object.keys(sectionDefaults[key]);
  const optional = key === 'about' ? ['imageAltHe','imageAltEn'] : key === 'calculator' ? keys.filter(k => /^(?:preset(?:1|3|7|14|30|90|180|365)|leaseMode|leaseUnavailable|priceOnRequest|budgetChoice|modelChoice|browseModels|pathTitle|budgetPathBody|modelPathBody)(?:He|En)$/.test(k)) : [];
  if (Object.keys(input.content).some(k => !keys.includes(k)) || keys.some(k => !optional.includes(k) && !Object.hasOwn(input.content, k))) throw new Error('invalid_block');
  for (const k of keys) {
    if (optional.includes(k) && !Object.hasOwn(input.content,k)) continue;
    const v = input.content[k];
    if (key === 'layout' && k === 'order') {
      const expected = sectionDefaults.layout.order;
      if (!Array.isArray(v) || v.length !== expected.length || new Set(v).size !== expected.length || v.some(item => !expected.includes(item))) throw new Error('invalid_block');
      continue;
    }
    if (k === 'visible' || (key === 'footer' && k === 'showContact') ? typeof v !== 'boolean' : typeof v !== 'string' || (!((key === 'about' && optional.includes(k)) || key === 'contact' && ['publicEmail','publicPhone','publicWhatsApp'].includes(k)) && !v.trim()) || v.length > 500) throw new Error('invalid_block');
  }
  if (key === 'navigation' && (!input.content.visible || keys.some(k => k !== 'visible' && input.content[k].length > 40))) throw new Error('invalid_block');
  if (key === 'workspace' || key === 'about') {
    const image = input.content.imageUrl;
    if (!await validImage(db, image, access)) throw new Error('invalid_block');
  }
  if (key === 'contact' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.content.recipientEmail)) throw new Error('invalid_block');
  if (key === 'contact' && ((input.content.publicEmail && (input.content.publicEmail.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.content.publicEmail))) || (input.content.publicPhone && !/^\+?[0-9][0-9 ()-]{2,29}$/.test(input.content.publicPhone)))) throw new Error('invalid_block');
  if (key === 'contact' && input.content.publicWhatsApp && !/^[1-9][0-9]{7,14}$/.test(input.content.publicWhatsApp)) throw new Error('invalid_block');
  const result = input.version === 0
    ? await db.query('INSERT INTO site_blocks (block_key, content) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING content, version', [key, input.content])
    : await db.query('UPDATE site_blocks SET content = CASE WHEN $1 IN (\'about\',\'calculator\') THEN content || $2::jsonb ELSE $2::jsonb END, version = version + 1, updated_at = now() WHERE block_key = $1 AND version = $3 RETURNING content, version', [key, input.content, input.version]);
  if (!result.rowCount) throw new Error('version_conflict');
  const saved = result.rows[0];
  return key === 'calculator' ? { ...saved, content: { ...sectionDefaults.calculator, ...saved.content } } : saved;
}

export async function getHero(db) {
  const result = await db.query("SELECT content, version FROM site_blocks WHERE block_key = 'hero'");
  return result.rowCount ? { content: currentRentalWording('hero',{ ...defaultHero, primaryAction: 'models', secondaryAction: 'calculator', ...result.rows[0].content }), version: result.rows[0].version } : { content: defaultHero, version: 0 };
}

export async function saveHero(db, input, access = {}) {
  if (!input || !Number.isSafeInteger(input.version) || input.version < 0 || !input.content || typeof input.content !== 'object' || Array.isArray(input.content)) throw new Error('invalid_block');
  const keys = Object.keys(defaultHero);
  const optional = ['imageAltHe','imageAltEn'];
  if (Object.keys(input.content).some(key => !keys.includes(key)) || keys.some(key => !optional.includes(key) && !Object.hasOwn(input.content, key))) throw new Error('invalid_block');
  for (const key of keys) {
    if (optional.includes(key) && !Object.hasOwn(input.content,key)) continue;
    const value = input.content[key];
    if (key === 'visible' ? typeof value !== 'boolean' : typeof value !== 'string' || (!optional.includes(key) && !value.trim()) || value.length > 500) throw new Error('invalid_block');
  }
  const image = input.content.imageUrl;
  if (!['models', 'calculator', 'contact'].includes(input.content.primaryAction) || !['models', 'calculator', 'contact'].includes(input.content.secondaryAction)) throw new Error('invalid_block');
  if (!await validImage(db, image, access)) throw new Error('invalid_block');
  const result = input.version === 0
    ? await db.query("INSERT INTO site_blocks (block_key, content) VALUES ('hero', $1) ON CONFLICT DO NOTHING RETURNING content, version", [{...defaultHero,...input.content}])
    : await db.query("UPDATE site_blocks SET content = content || $1::jsonb, version = version + 1, updated_at = now() WHERE block_key = 'hero' AND version = $2 RETURNING content, version", [input.content, input.version]);
  if (!result.rowCount) throw new Error('version_conflict');
  return { ...result.rows[0], content: { ...defaultHero, ...result.rows[0].content } };
}

export async function getTrust(db) {
  const result = await db.query("SELECT content, version FROM site_blocks WHERE block_key = 'trust'");
  return result.rowCount ? { content: result.rows[0].content, version: result.rows[0].version } : { content: defaultTrust, version: 0 };
}

export async function saveTrust(db, input) {
  if (!input || !Number.isSafeInteger(input.version) || input.version < 0 || !input.content || typeof input.content !== 'object' || Array.isArray(input.content)) throw new Error('invalid_block');
  const keys = Object.keys(defaultTrust);
  if (Object.keys(input.content).length !== keys.length || keys.some(key => !(key in input.content))) throw new Error('invalid_block');
  for (const key of keys) {
    const value = input.content[key];
    if (key === 'visible' ? typeof value !== 'boolean' : typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error('invalid_block');
  }
  const result = input.version === 0
    ? await db.query("INSERT INTO site_blocks (block_key, content) VALUES ('trust', $1) ON CONFLICT DO NOTHING RETURNING content, version", [input.content])
    : await db.query("UPDATE site_blocks SET content = $1, version = version + 1, updated_at = now() WHERE block_key = 'trust' AND version = $2 RETURNING content, version", [input.content, input.version]);
  if (!result.rowCount) throw new Error('version_conflict');
  return result.rows[0];
}
