import type { LaptopProduct } from '../types';
import { calculatePrice } from './calculate-price.mjs';
export function hasRentalRates(product: LaptopProduct): product is LaptopProduct & {rentalRates: NonNullable<LaptopProduct['rentalRates']>} {
  const r=product.rentalRates;
  return !!r && rentalCost(product,7)!==null && rentalCost(product,30)!==null;
}
export function rentalCost(product: LaptopProduct, days: number): number | null {
  try { return calculatePrice(product, 'short_rental', 1, days).unitAmountMinor / 100; }
  catch { return null; }
}
