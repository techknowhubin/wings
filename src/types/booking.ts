import type { CouponOffer } from "@/lib/discounts";

export interface BookingDetails {
  listingId?: string;
  listingType: "stay" | "vehicle" | "experience";
  listingCouponType?: "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences";
  bookingChannel?: "marketplace" | "link-in-bio";
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
  cabDetails?: {
    pickup_location: string;
    drop_location: string;
    travel_date: string;
    cab_type: string;
    fare_amount: number;
    state: string;
  };
}
