import { Home } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostStays() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: stays = [], isLoading } = useManagedListings('stay', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Stays" : "Your Stays"}
      description={isAdminUser ? "Manage all stay listings across the platform" : "Manage your homestays, villas, and properties"}
      listingType="stay"
      listings={stays}
      isLoading={isLoading}
      priceKey="price_per_night"
      priceLabel="per night"
      emptyIcon={<Home className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
