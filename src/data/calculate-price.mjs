export function calculatePrice(product, mode, quantity, days) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || !['purchase','lease','short_rental'].includes(mode)) throw new Error('invalid_price');
  const valid = n => Number.isSafeInteger(n) && n >= 0 && n <= 10000000;
  let unitShekels, period, termMonths = null;
  if (mode === 'purchase') { unitShekels = product.purchasePrice; period = 'one_time'; }
  if (mode === 'lease') { unitShekels = product.leasePriceMonthly; period = 'month'; termMonths = product.leaseTermMonths; if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 120) throw new Error('price_unavailable'); }
  if (mode === 'short_rental') {
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('invalid_price');
    const rates = product.rentalRates;
    const shortMax=rates?.shortMaxDays ?? 6, weekMax=rates?.weekMaxDays ?? 29;
    if (!Number.isInteger(shortMax)||!Number.isInteger(weekMax)||shortMax<1||weekMax<=shortMax||weekMax>364) throw new Error('price_unavailable');
    if (!rates || !valid(days <= shortMax ? rates.dailyShort : days <= weekMax ? rates.dailyWeek : rates.monthly)) throw new Error('price_unavailable');
    unitShekels = days <= shortMax ? days * rates.dailyShort : days <= weekMax ? days * rates.dailyWeek : Math.floor((days * rates.monthly * 2 + 30) / 60);
    period = 'rental_period';
  }
  if (!valid(unitShekels) && mode !== 'short_rental') throw new Error('price_unavailable');
  return { currency: 'ILS', unitAmountMinor: unitShekels * 100, totalAmountMinor: unitShekels * quantity * 100, quantity, period, termMonths, rentalDays: mode === 'short_rental' ? days : null, includesVat: true, rounding: 'nearest_shekel_per_unit' };
}
