import type { CouponOffer } from "@/lib/discounts";

export interface BookingDetails {
  listingType: "stay" | "vehicle" | "experience";
  listingCouponType?: "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";
  hostId?: string;
  listingTitle: string;
  listingImage?: string;
  currencySymbol: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  startDate: string;
  endDate: string;
  description: string;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  hostDiscountPercent?: number;
  availableCoupons?: CouponOffer[];
}
