import { supabase } from '@/integrations/supabase/client';
import type { 
  Bike, Car, Stay, Experience, Booking, Review, Profile, LinkInBioPage,
  ListingType, AppRole, BookingStatus
} from '@/types/database';

// ============ Profile Helpers ============

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Listing Helpers ============

export async function getStays(options?: { 
  featured?: boolean; 
  verified?: boolean;
  limit?: number;
  location?: string;
}) {
  let query = supabase.from('stays').select('*');
  
  if (options?.featured) query = query.eq('featured', true);
  if (options?.verified) query = query.eq('is_verified', true);
  if (options?.location) query = query.ilike('location', `%${options.location}%`);
  if (options?.limit) query = query.limit(options.limit);
  
  query = query
    .eq('availability_status', true)
    .eq('marketplace_visible', true)
    .order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  return attachHostNames(data ?? [], true);
}

export async function getStayById(id: string) {
  const { data, error } = await supabase
    .from('stays')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getStayBySlug(slug: string) {
  const { data, error } = await supabase
    .from('stays')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCars(options?: { 
  featured?: boolean; 
  verified?: boolean;
  limit?: number;
  location?: string;
}) {
  let query = supabase.from('cars').select('*');
  
  if (options?.featured) query = query.eq('featured', true);
  if (options?.verified) query = query.eq('is_verified', true);
  if (options?.location) query = query.ilike('location', `%${options.location}%`);
  if (options?.limit) query = query.limit(options.limit);
  
  query = query
    .eq('availability_status', true)
    .eq('marketplace_visible', true)
    .order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCarById(id: string) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCarBySlug(slug: string) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getBikes(options?: { 
  featured?: boolean; 
  verified?: boolean;
  limit?: number;
  location?: string;
}) {
  let query = supabase.from('bikes').select('*');
  
  if (options?.featured) query = query.eq('featured', true);
  if (options?.verified) query = query.eq('is_verified', true);
  if (options?.location) query = query.ilike('location', `%${options.location}%`);
  if (options?.limit) query = query.limit(options.limit);
  
  query = query
    .eq('availability_status', true)
    .eq('marketplace_visible', true)
    .order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBikeById(id: string) {
  const { data, error } = await supabase
    .from('bikes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getBikeBySlug(slug: string) {
  const { data, error } = await supabase
    .from('bikes')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getExperiences(options?: { 
  featured?: boolean; 
  verified?: boolean;
  limit?: number;
  location?: string;
  category?: string;
}) {
  let query = supabase.from('experiences').select('*');
  
  if (options?.featured) query = query.eq('featured', true);
  if (options?.verified) query = query.eq('is_verified', true);
  if (options?.location) query = query.ilike('location', `%${options.location}%`);
  if (options?.category) query = query.eq('category', options.category);
  if (options?.limit) query = query.limit(options.limit);
  
  query = query
    .eq('availability_status', true)
    .eq('marketplace_visible', true)
    .order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getExperienceById(id: string) {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getExperienceBySlug(slug: string) {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Booking Helpers ============

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserBookings(userId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getHostBookings(hostId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ booking_status: status })
    .eq('id', bookingId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getBookingById(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Review Helpers ============

export async function getListingReviews(listingId: string, listingType: ListingType) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listingId)
    .eq('listing_type', listingType)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ Wishlist Helpers ============

export async function getUserWishlist(userId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
}

export async function addToWishlist(userId: string, listingId: string, listingType: ListingType) {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, listing_id: listingId, listing_type: listingType })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeFromWishlist(userId: string, listingId: string) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  
  if (error) throw error;
}

export async function isInWishlist(userId: string, listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

// ============ Role Helpers ============

export async function checkUserRole(userId: string, role: AppRole): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();

    if (error) {
      console.error('[checkUserRole] Error:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[checkUserRole] Unexpected error:', err);
    return false;
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  return checkUserRole(userId, 'admin');
}

export async function isHost(userId: string): Promise<boolean> {
  return checkUserRole(userId, 'host');
}

export async function isModerator(userId: string): Promise<boolean> {
  return checkUserRole(userId, 'moderator');
}

// ============ Notification Helpers ============

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  
  if (error) throw error;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) throw error;
  return count || 0;
}

// ============ Host Listings Helpers ============

export async function getHostStays(hostId: string) {
  const { data, error } = await supabase
    .from('stays')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getHostCars(hostId: string) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getHostBikes(hostId: string) {
  const { data, error } = await supabase
    .from('bikes')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getHostExperiences(hostId: string) {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getHostHotels(hostId: string) {
  const { data, error } = await supabase
    .from('hotels' as any)
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

export async function getHostResorts(hostId: string) {
  const { data, error } = await supabase
    .from('resorts' as any)
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as any[];
}

async function attachHostNames(listings: any[], isAdminUser: boolean) {
  if (!listings || listings.length === 0) return listings;

  const hostIds = Array.from(new Set(listings.map((item) => item.host_id).filter(Boolean)));
  if (hostIds.length === 0) return listings;

  const { data: hostProfiles, error: hostError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', hostIds);

  if (hostError) {
    console.error("Error fetching host profiles:", hostError);
    return listings;
  }

  const nameById = new Map((hostProfiles ?? []).map((p) => [p.id, p.full_name || 'No name provided']));

  return listings.map((listing) => {
    const hostId = listing.host_id;
    return {
      ...listing,
      host_name: nameById.get(hostId) || (isAdminUser ? 'Unknown host' : undefined),
    };
  });
}

export async function getManagedListings(
  listingType: ListingType | 'hotel' | 'resort',
  userId: string,
  isAdminUser: boolean,
) {
  const tableMap: Record<ListingType | 'hotel' | 'resort', 'stays' | 'cars' | 'bikes' | 'experiences' | 'hotels' | 'resorts'> = {
    stay: 'stays',
    car: 'cars',
    bike: 'bikes',
    experience: 'experiences',
    hotel: 'hotels',
    resort: 'resorts',
  };
  let query = supabase
    .from(tableMap[listingType] as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdminUser) {
    query = query.eq('host_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const listings = (data ?? []) as any[];

  return attachHostNames(listings, isAdminUser);
}

export async function updateMarketplaceVisibility(
  listingType: ListingType | 'hotel' | 'resort',
  listingId: string,
  marketplaceVisible: boolean,
) {
  const tableMap: Record<ListingType | 'hotel' | 'resort', 'stays' | 'cars' | 'bikes' | 'experiences' | 'hotels' | 'resorts'> = {
    stay: 'stays',
    car: 'cars',
    bike: 'bikes',
    experience: 'experiences',
    hotel: 'hotels',
    resort: 'resorts',
  };
  const { data, error } = await supabase
    .from(tableMap[listingType] as any)
    .update({ marketplace_visible: marketplaceVisible })
    .eq('id', listingId)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateMarketplaceRequest(
  listingType: ListingType | 'hotel' | 'resort',
  listingId: string,
  marketplaceRequested: boolean,
) {
  const tableMap: Record<ListingType | 'hotel' | 'resort', 'stays' | 'cars' | 'bikes' | 'experiences' | 'hotels' | 'resorts'> = {
    stay: 'stays',
    car: 'cars',
    bike: 'bikes',
    experience: 'experiences',
    hotel: 'hotels',
    resort: 'resorts',
  };
  const { data, error } = await supabase
    .from(tableMap[listingType] as any)
    .update({ marketplace_requested: marketplaceRequested })
    .eq('id', listingId)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

// ============ Create Listing Helpers ============

export async function createStay(stay: Omit<Stay, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews' | 'views_count' | 'booking_count' | 'last_booked_at' | 'is_verified' | 'verified_by' | 'featured'>) {
  const slug = generateSlug(stay.title);
  const { data, error } = await supabase
    .from('stays')
    .insert({ ...stay, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCar(car: Omit<Car, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews' | 'views_count' | 'booking_count' | 'last_booked_at' | 'is_verified' | 'verified_by' | 'featured'>) {
  const slug = generateSlug(car.title);
  const { data, error } = await supabase
    .from('cars')
    .insert({ ...car, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createBike(bike: Omit<Bike, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews' | 'views_count' | 'booking_count' | 'last_booked_at' | 'is_verified' | 'verified_by' | 'featured'>) {
  const slug = generateSlug(bike.title);
  const { data, error } = await supabase
    .from('bikes')
    .insert({ ...bike, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createExperience(experience: Omit<Experience, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews' | 'views_count' | 'booking_count' | 'last_booked_at' | 'is_verified' | 'verified_by' | 'featured'>) {
  const slug = generateSlug(experience.title);
  const { data, error } = await supabase
    .from('experiences')
    .insert({ ...experience, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createHotel(hotel: any) {
  const slug = generateSlug(hotel.title);
  const { data, error } = await supabase
    .from('hotels' as any)
    .insert({ ...hotel, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createResort(resort: any) {
  const slug = generateSlug(resort.title);
  const { data, error } = await supabase
    .from('resorts' as any)
    .insert({ ...resort, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ Link-in-Bio Helpers ============

export async function getLinkInBioPage(userId: string) {
  const { data, error } = await supabase
    .from('link_in_bio_pages')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertLinkInBioPage(
  page: Pick<LinkInBioPage, 'user_id' | 'slug' | 'settings' | 'is_active'>,
) {
  const { data, error } = await supabase
    .from('link_in_bio_pages')
    .upsert(page, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLinkInBioPageBySlug(slug: string) {
  const { data, error } = await supabase
    .from('link_in_bio_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteListing(listingType: ListingType | 'hotel' | 'resort', listingId: string) {
  const tableMap: Record<ListingType | 'hotel' | 'resort', 'stays' | 'cars' | 'bikes' | 'experiences' | 'hotels' | 'resorts'> = {
    stay: 'stays',
    car: 'cars',
    bike: 'bikes',
    experience: 'experiences',
    hotel: 'hotels',
    resort: 'resorts',
  };
  const tableName = tableMap[listingType];

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', listingId);

  if (error) throw error;
}

export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBlogPost(payload: any) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlogPost(postId: string, payload: any) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(payload)
    .eq('id', postId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlogPost(postId: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
}

// ============ Utility Functions ============

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateCommission(amount: number, isMarketplace: boolean): {
  commission: number;
  rate: number;
  hostEarnings: number;
} {
  const rate = isMarketplace ? 20 : 10; // 20% for marketplace, 10% for link-in-bio
  const commission = amount * (rate / 100);
  return {
    commission,
    rate,
    hostEarnings: amount - commission,
  };
}
