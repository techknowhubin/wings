import { Car } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostCars() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: cars = [], isLoading } = useManagedListings('car', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Cars" : "Your Cars"}
      description={isAdminUser ? "Manage all car listings across the platform" : "Manage your rental cars and vehicles"}
      listingType="car"
      listings={cars}
      isLoading={isLoading}
      priceKey="price_per_day"
      priceLabel="per day"
      emptyIcon={<Car className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
