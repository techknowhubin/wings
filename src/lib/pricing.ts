export interface PricingResult {
  dailyRate: number;
  duration: number;
  originalTotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
}

export function calculateLongStayPricing(
  basePrice: number,
  days: number,
  discounts: {
    discount7?: number | null;
    discount14?: number | null;
    discount30?: number | null;
  } = {}
): PricingResult {
  const d7 = discounts.discount7 || 0;
  const d14 = discounts.discount14 || 0;
  const d30 = discounts.discount30 || 0;

  let discountPercent = 0;
  
  if (days >= 30) {
    discountPercent = d30;
  } else if (days >= 14) {
    discountPercent = d14;
  } else if (days >= 7) {
    discountPercent = d7;
  }
  
  const originalTotal = basePrice * days;
  const discountAmount = Math.floor(originalTotal * (discountPercent / 100));
  const finalTotal = originalTotal - discountAmount;
  
  return {
    dailyRate: basePrice,
    duration: days,
    originalTotal,
    discountPercent,
    discountAmount,
    finalTotal
  };
}
