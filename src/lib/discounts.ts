import type { Json } from "@/integrations/supabase/types";

export interface CouponOffer {
  code: string;
  type: "percent" | "flat";
  value: number;
}

export interface ListingDiscountConfig {
  hostDiscountPercent: number;
  coupons: CouponOffer[];
}

export const defaultDiscountConfig: ListingDiscountConfig = {
  hostDiscountPercent: 0,
  coupons: [],
};

export function parseListingDiscountConfig(raw: Json | null | undefined): ListingDiscountConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultDiscountConfig;
  }

  const candidate = raw as { hostDiscountPercent?: unknown; coupons?: unknown };
  const hostDiscountPercent =
    typeof candidate.hostDiscountPercent === "number" && candidate.hostDiscountPercent > 0
      ? Math.min(candidate.hostDiscountPercent, 90)
      : 0;

  const coupons = Array.isArray(candidate.coupons)
    ? candidate.coupons
        .map((coupon) => {
          if (!coupon || typeof coupon !== "object") return null;
          const c = coupon as { code?: unknown; type?: unknown; value?: unknown };
          if (typeof c.code !== "string" || !c.code.trim()) return null;
          if (c.type !== "percent" && c.type !== "flat") return null;
          if (typeof c.value !== "number" || c.value <= 0) return null;
          if (c.type === "percent" && c.value > 90) return null;

          return {
            code: c.code.trim().toUpperCase(),
            type: c.type as "percent" | "flat",
            value: c.value,
          };
        })
        .filter((coupon): coupon is CouponOffer => Boolean(coupon))
    : [];

  return { hostDiscountPercent, coupons };
}

export function createDiscountConfig(
  hostDiscountPercent: number,
  coupons: CouponOffer[],
): ListingDiscountConfig {
  return {
    hostDiscountPercent: Math.min(Math.max(Math.round(hostDiscountPercent), 0), 90),
    coupons: coupons.map((coupon) => ({
      code: coupon.code.trim().toUpperCase(),
      type: coupon.type,
      value: coupon.type === "percent"
        ? Math.min(Math.max(Math.round(coupon.value), 1), 90)
        : Math.max(Number(coupon.value), 1),
    })),
  };
}

export function generateCouponCode(prefix = "XW"): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 6; i += 1) {
    random += charset[Math.floor(Math.random() * charset.length)];
  }
  return `${prefix}${random}`;
}
