import { Building } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostHotels() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: hotels = [], isLoading } = useManagedListings('hotel', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Hotels" : "Your Hotels"}
      description={isAdminUser ? "Manage all hotel listings across the platform" : "Manage your hotel listings and suites"}
      listingType="hotel"
      listings={hotels}
      isLoading={isLoading}
      priceKey="price_per_night"
      priceLabel="per night"
      emptyIcon={<Building className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
