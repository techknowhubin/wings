import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStays, getStayById, getStayBySlug,
  getCars, getCarById, getCarBySlug,
  getBikes, getBikeById, getBikeBySlug,
  getExperiences, getExperienceById, getExperienceBySlug,
  getUserBookings, getHostBookings, getBookingById, createBooking, updateBookingStatus,
  getListingReviews, createReview,
  getUserWishlist, addToWishlist, removeFromWishlist, isInWishlist,
  getProfile, updateProfile,
  getUserNotifications, getUnreadNotificationCount, markNotificationAsRead,
  getHostStays, getHostCars, getHostBikes, getHostExperiences, getHostHotels, getHostResorts,
  getManagedListings, updateMarketplaceRequest, updateMarketplaceVisibility,
  isAdmin, isHost, isModerator,
  createStay, createCar, createBike, createExperience, createHotel, createResort,
  deleteListing,
  getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost,
  getLinkInBioPage, upsertLinkInBioPage,
} from '@/lib/supabase-helpers';
import type { ListingType, BookingStatus } from '@/types/database';

// ============ Stays Hooks ============

export function useStays(options?: Parameters<typeof getStays>[0]) {
  return useQuery({
    queryKey: ['stays', options],
    queryFn: () => getStays(options),
  });
}

export function useStay(id: string) {
  return useQuery({
    queryKey: ['stay', id],
    queryFn: () => getStayById(id),
    enabled: !!id,
  });
}

export function useStayBySlug(slug: string) {
  return useQuery({
    queryKey: ['stay', 'slug', slug],
    queryFn: () => getStayBySlug(slug),
    enabled: !!slug,
  });
}

// ============ Cars Hooks ============

export function useCars(options?: Parameters<typeof getCars>[0]) {
  return useQuery({
    queryKey: ['cars', options],
    queryFn: () => getCars(options),
  });
}

export function useCar(id: string) {
  return useQuery({
    queryKey: ['car', id],
    queryFn: () => getCarById(id),
    enabled: !!id,
  });
}

export function useCarBySlug(slug: string) {
  return useQuery({
    queryKey: ['car', 'slug', slug],
    queryFn: () => getCarBySlug(slug),
    enabled: !!slug,
  });
}

// ============ Bikes Hooks ============

export function useBikes(options?: Parameters<typeof getBikes>[0]) {
  return useQuery({
    queryKey: ['bikes', options],
    queryFn: () => getBikes(options),
  });
}

export function useBike(id: string) {
  return useQuery({
    queryKey: ['bike', id],
    queryFn: () => getBikeById(id),
    enabled: !!id,
  });
}

export function useBikeBySlug(slug: string) {
  return useQuery({
    queryKey: ['bike', 'slug', slug],
    queryFn: () => getBikeBySlug(slug),
    enabled: !!slug,
  });
}

// ============ Experiences Hooks ============

export function useExperiences(options?: Parameters<typeof getExperiences>[0]) {
  return useQuery({
    queryKey: ['experiences', options],
    queryFn: () => getExperiences(options),
  });
}

export function useExperience(id: string) {
  return useQuery({
    queryKey: ['experience', id],
    queryFn: () => getExperienceById(id),
    enabled: !!id,
  });
}

export function useExperienceBySlug(slug: string) {
  return useQuery({
    queryKey: ['experience', 'slug', slug],
    queryFn: () => getExperienceBySlug(slug),
    enabled: !!slug,
  });
}

// ============ Booking Hooks ============

export function useUserBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'user', userId],
    queryFn: () => getUserBookings(userId!),
    enabled: !!userId,
  });
}

export function useHostBookings(hostId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'host', hostId],
    queryFn: () => getHostBookings(hostId!),
    enabled: !!hostId,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) =>
      updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// ============ Review Hooks ============

export function useListingReviews(listingId: string, listingType: ListingType) {
  return useQuery({
    queryKey: ['reviews', listingId, listingType],
    queryFn: () => getListingReviews(listingId, listingType),
    enabled: !!listingId && !!listingType,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

// ============ Wishlist Hooks ============

export function useWishlist(userId: string | undefined) {
  return useQuery({
    queryKey: ['wishlist', userId],
    queryFn: () => getUserWishlist(userId!),
    enabled: !!userId,
  });
}

export function useIsInWishlist(userId: string | undefined, listingId: string) {
  return useQuery({
    queryKey: ['wishlist', userId, listingId],
    queryFn: () => isInWishlist(userId!, listingId),
    enabled: !!userId && !!listingId,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, listingId, listingType }: { 
      userId: string; 
      listingId: string; 
      listingType: ListingType;
    }) => addToWishlist(userId, listingId, listingType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, listingId }: { userId: string; listingId: string }) =>
      removeFromWishlist(userId, listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

// ============ Profile Hooks ============

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Parameters<typeof updateProfile>[1] }) =>
      updateProfile(userId, updates),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

// ============ Notification Hooks ============

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getUserNotifications(userId!),
    enabled: !!userId,
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId, 'unread-count'],
    queryFn: () => getUnreadNotificationCount(userId!),
    enabled: !!userId,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ============ Host Listings Hooks ============

export function useHostStays(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'stays', hostId],
    queryFn: () => getHostStays(hostId!),
    enabled: !!hostId,
  });
}

export function useHostCars(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'cars', hostId],
    queryFn: () => getHostCars(hostId!),
    enabled: !!hostId,
  });
}

export function useHostBikes(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'bikes', hostId],
    queryFn: () => getHostBikes(hostId!),
    enabled: !!hostId,
  });
}

export function useHostExperiences(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'experiences', hostId],
    queryFn: () => getHostExperiences(hostId!),
    enabled: !!hostId,
  });
}

export function useHostHotels(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'hotels', hostId],
    queryFn: () => getHostHotels(hostId!),
    enabled: !!hostId,
  });
}

export function useHostResorts(hostId: string | undefined) {
  return useQuery({
    queryKey: ['host', 'resorts', hostId],
    queryFn: () => getHostResorts(hostId!),
    enabled: !!hostId,
  });
}

export function useManagedListings(
  listingType: ListingType | 'hotel' | 'resort',
  userId: string | undefined,
  isAdminUser: boolean,
) {
  return useQuery({
    queryKey: ['managed-listings', listingType, userId, isAdminUser],
    queryFn: () => getManagedListings(listingType, userId!, isAdminUser),
    enabled: !!userId,
  });
}

// ============ Role Hooks ============

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ['role', 'admin', userId],
    queryFn: async () => {
      try {
        return await isAdmin(userId!);
      } catch {
        return false;
      }
    },
    enabled: !!userId,
  });
}

export function useIsHost(userId: string | undefined) {
  return useQuery({
    queryKey: ['role', 'host', userId],
    queryFn: () => isHost(userId!),
    enabled: !!userId,
  });
}

export function useIsModerator(userId: string | undefined) {
  return useQuery({
    queryKey: ['role', 'moderator', userId],
    queryFn: () => isModerator(userId!),
    enabled: !!userId,
  });
}

// ============ Create Listing Hooks ============

export function useCreateStay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'stays'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
    },
  });
}

export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'cars'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
}

export function useCreateBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'bikes'] });
      queryClient.invalidateQueries({ queryKey: ['bikes'] });
    },
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'experiences'] });
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHotel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'hotels'] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
}

export function useCreateResort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createResort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'resorts'] });
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingType, listingId }: { listingType: ListingType | 'hotel' | 'resort'; listingId: string }) =>
      deleteListing(listingType, listingId),
    onSuccess: (_, { listingType }) => {
      const plural = listingType === 'experience' ? 'experiences' : `${listingType}s`;
      queryClient.invalidateQueries({ queryKey: ['host', plural] });
      queryClient.invalidateQueries({ queryKey: [plural] });
    },
  });
}

export function useUpdateMarketplaceVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingType,
      listingId,
      marketplaceVisible,
    }: {
      listingType: ListingType | 'hotel' | 'resort';
      listingId: string;
      marketplaceVisible: boolean;
    }) => updateMarketplaceVisibility(listingType, listingId, marketplaceVisible),
    onSuccess: (_, { listingType }) => {
      const plural = listingType === 'experience' ? 'experiences' : `${listingType}s`;
      queryClient.invalidateQueries({ queryKey: ['host', plural] });
      queryClient.invalidateQueries({ queryKey: ['managed-listings'] });
      queryClient.invalidateQueries({ queryKey: [plural] });
    },
  });
}

export function useUpdateMarketplaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingType,
      listingId,
      marketplaceRequested,
    }: {
      listingType: ListingType | 'hotel' | 'resort';
      listingId: string;
      marketplaceRequested: boolean;
    }) => updateMarketplaceRequest(listingType, listingId, marketplaceRequested),
    onSuccess: (_, { listingType }) => {
      const plural = listingType === 'experience' ? 'experiences' : `${listingType}s`;
      queryClient.invalidateQueries({ queryKey: ['host', plural] });
      queryClient.invalidateQueries({ queryKey: ['managed-listings'] });
      queryClient.invalidateQueries({ queryKey: [plural] });
    },
  });
}

export function useBlogPosts(enabled = true) {
  return useQuery({
    queryKey: ['blog-posts-admin'],
    queryFn: getBlogPosts,
    enabled,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: any }) => updateBlogPost(postId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] }),
  });
}

export function useLinkInBioPage(userId: string | undefined) {
  return useQuery({
    queryKey: ['link-in-bio', userId],
    queryFn: () => getLinkInBioPage(userId!),
    enabled: !!userId,
  });
}

export function useUpsertLinkInBioPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertLinkInBioPage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['link-in-bio', variables.user_id] });
    },
  });
}
