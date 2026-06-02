import { Car } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostCabs() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: cabs = [], isLoading } = useManagedListings('cab', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Cabs" : "Your Cabs"}
      description={isAdminUser ? "Manage all outstation cab listings across the platform" : "Manage your outstation cab vehicles and driver details"}
      listingType="cab"
      listings={cabs}
      isLoading={isLoading}
      priceKey="price_per_day"
      priceLabel="per day"
      emptyIcon={<Car className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
