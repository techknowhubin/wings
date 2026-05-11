import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

// Re-export Supabase types for convenience
export type { Database, Tables, TablesInsert, TablesUpdate, Enums };

// Table row types
export type Bike = Tables<'bikes'>;
export type Car = Tables<'cars'>;
export type Stay = Tables<'stays'>;
export type Experience = Tables<'experiences'>;
export type Booking = Tables<'bookings'>;
export type Review = Tables<'reviews'>;
export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;
export type Wishlist = Tables<'wishlists'>;
export type Notification = Tables<'notifications'>;
export type LinkInBioPage = Tables<'link_in_bio_pages'>;
export type BlogPost = Tables<'blog_posts'>;
export type BlogCategory = Tables<'blog_categories'>;

// Insert types
export type BikeInsert = TablesInsert<'bikes'>;
export type CarInsert = TablesInsert<'cars'>;
export type StayInsert = TablesInsert<'stays'>;
export type ExperienceInsert = TablesInsert<'experiences'>;
export type BookingInsert = TablesInsert<'bookings'>;
export type ReviewInsert = TablesInsert<'reviews'>;

// Update types
export type BikeUpdate = TablesUpdate<'bikes'>;
export type CarUpdate = TablesUpdate<'cars'>;
export type StayUpdate = TablesUpdate<'stays'>;
export type ExperienceUpdate = TablesUpdate<'experiences'>;
export type BookingUpdate = TablesUpdate<'bookings'>;

// Enum types
export type AppRole = Enums<'app_role'>;
export type BookingStatus = Enums<'booking_status'>;
export type ListingType = Enums<'listing_type'>;
export type PaymentStatus = Enums<'payment_status'>;

// Union type for any listing
export type Listing = Bike | Car | Stay | Experience;

// Listing with type discriminator
export interface TypedListing {
  type: ListingType;
  data: Listing;
}

// Commission rates per booking source
export const COMMISSION_RATES = {
  marketplace: 20, // 20% for marketplace bookings
  link_in_bio: 10, // 10% for link-in-bio bookings
} as const;

// Subscription pricing for Link-in-Bio
export const SUBSCRIPTION_PRICING = {
  free: 0,
  premium: 999, // ₹999/month
} as const;

// Helper to get price from any listing type
export function getListingPrice(listing: Listing, type: ListingType): number {
  switch (type) {
    case 'stay':
      return (listing as Stay).price_per_night;
    case 'car':
      return (listing as Car).price_per_day;
    case 'bike':
      return (listing as Bike).price_per_day;
    case 'experience':
      return (listing as Experience).price_per_person;
  }
}

// Helper to get price unit label
export function getPriceUnit(type: ListingType): string {
  switch (type) {
    case 'stay':
      return 'night';
    case 'car':
    case 'bike':
      return 'day';
    case 'experience':
      return 'person';
  }
}
