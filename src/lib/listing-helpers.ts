export interface BedroomDetail {
  name: string;
  bedType: string;
  count: number;
  description?: string;
  photos?: string[];
  sizeSqFt?: number;
  bathrooms?: number;
  occupancyCapacity?: number;
  amenities?: string[];
}

export interface RoomPlan {
  roomOnly: boolean;
  freeBreakfast: boolean;
  halfBoard: boolean; // Breakfast + Dinner
  allInclusive: boolean;
  customPlans?: string[];
}

export interface NearbyInfo {
  restaurants?: string[];
  attractions?: string[];
  transport?: string[];
  hospitals?: string[];
  shopping?: string[];
}

export interface HostInfo {
  name?: string;
  photo?: string;
  description?: string;
  isSuperhost?: boolean;
}

export interface RichAmenities {
  // Standard amenity flags
  wifi?: boolean;
  ac?: boolean;
  tv?: boolean;
  kitchen?: boolean;
  parking?: boolean;
  pool?: boolean;
  petFriendly?: boolean;
  dedicatedWorkspace?: boolean;
  selfCheckIn?: boolean;
  freeCancellation?: boolean;
  breakfast?: boolean;
  gym?: boolean;

  // Custom amenities list
  custom?: string[];

  // Extended listing info (stored in amenities since no extra DB columns)
  shortDescription?: string;
  state?: string;
  city?: string;
  fullAddress?: string;
  propertySize?: string;
  beds?: number;
  houseRules?: string;
  healthSafety?: string;

  // Bedroom / Room details
  bedroomDetails?: BedroomDetail[];

  // Room images (separate from gallery)
  roomImages?: string[];

  // Extra pricing & checkout options
  weeklyPrice?: number;
  monthlyPrice?: number;
  cleaningFee?: number;
  securityDeposit?: number;

  // Premium listing fields
  propertyCategory?: string; // Budget, Luxury, Premium, Heritage, etc.
  googleMapsUrl?: string;
  videos?: string[];
  virtualTourUrl?: string;

  // Room plans selection
  roomPlans?: RoomPlan;

  // Detailed pricing fields
  originalPrice?: number;
  discountedPrice?: number;
  dailyPrice?: number;
  taxesAndFees?: number;
  offerPercentage?: number;
  bookAtZero?: boolean;

  // Policies
  policySmokingAllowed?: boolean;
  policyPetAllowed?: boolean;
  policyChildAllowed?: boolean;
  policyChildDescription?: string;

  // Nearby Info
  nearbyInfo?: NearbyInfo;

  // Host Info
  hostInfo?: HostInfo;
}

/** Parse raw DB JSON value into RichAmenities (handles old string-array format too). */
export function parseRichAmenities(raw: unknown): RichAmenities {
  if (Array.isArray(raw)) {
    // Old format: string[] — treat every entry as a custom amenity
    return { custom: raw as string[] };
  }
  if (!raw || typeof raw !== 'object') return {};
  return raw as RichAmenities;
}

/** Derive a flat list of amenity display names from raw DB value. */
export function getAmenityNames(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]; // old format: already names
  if (!raw || typeof raw !== 'object') return [];
  const a = raw as RichAmenities;
  const names: string[] = [];
  if (a.wifi) names.push('WiFi');
  if (a.ac) names.push('Air Conditioning');
  if (a.tv) names.push('TV');
  if (a.kitchen) names.push('Kitchen');
  if (a.parking) names.push('Free Parking');
  if (a.pool) names.push('Swimming Pool');
  if (a.petFriendly) names.push('Pet Friendly');
  if (a.dedicatedWorkspace) names.push('Dedicated Workspace');
  if (a.selfCheckIn) names.push('Self Check-in');
  if (a.freeCancellation) names.push('Free Cancellation');
  if (a.breakfast) names.push('Breakfast Included');
  if (a.gym) names.push('Gym / Fitness Center');
  if (a.custom?.length) names.push(...a.custom);
  return names;
}
