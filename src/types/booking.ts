import type { CouponOffer } from "@/lib/discounts";

export type CabBookingSource = 'outstation_cab' | 'airport_transfer' | 'local_4hrs' | 'local_8hrs' | 'marketplace';

export interface BookingDetails {
  listingId?: string;
  listingType: "stay" | "vehicle" | "experience";
  listingCouponType?: "stays" | "hotels" | "resorts" | "cars" | "bikes" | "experiences" | "cabs";
  bookingChannel?: "marketplace" | "link-in-bio";
  hostId?: string;
  listingTitle: string;
  listingImage?: string;
  packageType?: string;
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
  bookingSource?: CabBookingSource;
  cabDetails?: {
    pickup_location: string;
    drop_location: string;
    travel_date: string;
    pickup_time?: string;
    return_date?: string;
    cab_type: string;
    fare_amount: number;
    state: string;
    distance_km?: number;
    special_instructions?: string;
    booking_source?: CabBookingSource;
    pickup_latitude?: number;
    pickup_longitude?: number;
    drop_latitude?: number;
    drop_longitude?: number;
  };
}
