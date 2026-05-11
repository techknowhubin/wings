import { Bike } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostBikes() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: bikes = [], isLoading } = useManagedListings('bike', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Bikes" : "Your Bikes"}
      description={isAdminUser ? "Manage all bike listings across the platform" : "Manage your rental bikes and motorcycles"}
      listingType="bike"
      listings={bikes}
      isLoading={isLoading}
      priceKey="price_per_day"
      priceLabel="per day"
      emptyIcon={<Bike className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
