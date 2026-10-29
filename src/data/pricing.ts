import type { LaptopProduct } from '../types';
import { calculatePrice } from './calculate-price.mjs';
export function hasRentalRates(product: LaptopProduct): product is LaptopProduct & {rentalRates: NonNullable<LaptopProduct['rentalRates']>} {
  const r=product.rentalRates;
  return !!r && [r.dailyShort,r.dailyWeek,r.monthly].every(value=>Number.isSafeInteger(value)&&value>=0&&value<=10000000);
}
export function rentalCost(product: LaptopProduct, days: number): number | null {
  try { return calculatePrice(product, 'short_rental', 1, days).unitAmountMinor / 100; }
  catch { return null; }
}
