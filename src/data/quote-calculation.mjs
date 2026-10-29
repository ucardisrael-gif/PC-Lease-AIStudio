import { calculatePrice } from './calculate-price.mjs';

// Prices are supplied by the caller from the current server-side catalogue.
// A preview must not turn missing or unconfirmed tariffs into exact amounts.
export function calculateQuote(lines, vatBasisPoints, { allowUnpriced = false } = {}) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 100) throw new Error('invalid_quote');
  if (vatBasisPoints !== null && (!Number.isSafeInteger(vatBasisPoints) || vatBasisPoints < 0 || vatBasisPoints > 10000)) throw new Error('invalid_vat');
  const items = lines.map(line => {
    const { product, mode, quantity, rentalDays } = line ?? {};
    if (!product || typeof product.slug !== 'string' || !product.slug || !Number.isInteger(product.editVersion) || product.editVersion < 1) throw new Error('invalid_quote');
    if (mode === 'lease' && product.leaseTermMonths !== 36) throw new Error('price_unavailable');
    let price;
    try {
      price = calculatePrice(product, mode, quantity, rentalDays);
    } catch (error) {
      if (!allowUnpriced || error.message !== 'price_unavailable') throw error;
      if (!['lease','purchase','short_rental'].includes(mode) || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || (mode === 'short_rental' && (!Number.isInteger(rentalDays) || rentalDays < 1 || rentalDays > 365))) throw new Error('invalid_quote');
      return {productSlug:product.slug,productVersion:product.editVersion,mode,quantity,rentalDays:mode==='short_rental'?rentalDays:null,unitAmountMinor:null,period:mode==='lease'?'month':mode==='purchase'?'one_time':'rental_period',termMonths:mode==='lease'?36:null,periodTotalMinor:null,contractTotalMinor:null};
    }
    const totalMinor = mode === 'lease' ? null : price.totalAmountMinor;
    if (totalMinor !== null && !Number.isSafeInteger(totalMinor)) throw new Error('invalid_price');
    return { productSlug: product.slug, productVersion: product.editVersion, mode, quantity, rentalDays: price.rentalDays, unitAmountMinor: price.unitAmountMinor, period: price.period, termMonths: price.termMonths, periodTotalMinor: price.totalAmountMinor, contractTotalMinor: totalMinor };
  });
  const first=items[0];const comparable=first.mode!=='lease'&&items.every(item=>item.mode===first.mode&&(first.mode!=='short_rental'||item.rentalDays===first.rentalDays));
  const totalMinor = !comparable||items.some(item=>item.contractTotalMinor===null) ? null : items.reduce((sum, item) => sum + item.contractTotalMinor, 0);
  if (totalMinor !== null && !Number.isSafeInteger(totalMinor)) throw new Error('invalid_price');
  let vatMinor = null, subtotalMinor = null;
  if (vatBasisPoints !== null && totalMinor !== null) {
    const denominator = 10000n + BigInt(vatBasisPoints);
    const base = (BigInt(totalMinor) * 10000n + denominator / 2n) / denominator;
    subtotalMinor = Number(base);
    vatMinor = totalMinor - subtotalMinor;
  }
  return { currency: 'ILS', items, subtotalMinor, vatBasisPoints, vatMinor, totalMinor };
}
