export interface TourPackage {
  id: string;
  name: string;
  category: string;
  destination: string;
  departure_city: string;
  start_date: string;
  end_date: string;
  duration: string;
  min_capacity: number;
  max_capacity: number;
  adult_price: number;
  child_price?: number;
  single_sharing_price?: number;
  twin_sharing_price?: number;
  extra_person_price?: number;
  inclusions: string[];
  exclusions: string[];
  cover_image?: string;
  created_by?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PackageItinerary {
  id: string;
  package_id: string;
  file_url: string;
  file_type: string;
  version: number;
  uploaded_by?: string;
  created_at: string;
}

export interface PackageGallery {
  id: string;
  package_id: string;
  image_url: string;
  is_cover: boolean;
  is_banner: boolean;
  created_at: string;
}

export interface PackageAssignment {
  id: string;
  package_id: string;
  hub_id: string;
  status: 'assigned' | 'published' | 'unpublished';
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  tour_package?: TourPackage;
}

export interface PackageDeparture {
  id: string;
  package_id: string;
  departure_date: string;
  capacity: number;
  booked_seats: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PackageBooking {
  id: string;
  booking_ref: string;
  package_id: string;
  departure_id?: string;
  user_id?: string;
  hub_id?: string;
  total_amount: number;
  currency: string;
  payment_status: 'pending' | 'partial' | 'completed';
  booking_status: 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
  tour_package?: TourPackage;
}

export interface PackageTraveller {
  id: string;
  booking_id: string;
  name: string;
  age: number;
  gender: string;
  email?: string;
  mobile?: string;
  created_at: string;
}

export interface PackageDocument {
  id: string;
  booking_id: string;
  traveller_id?: string;
  document_type: string;
  file_url: string;
  verified: boolean;
  created_at: string;
}
