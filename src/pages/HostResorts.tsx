import { Palmtree } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostResorts() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: resorts = [], isLoading } = useManagedListings('resort', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Resorts" : "Your Resorts"}
      description={isAdminUser ? "Manage all resort listings across the platform" : "Manage your luxury resort listings"}
      listingType="resort"
      listings={resorts}
      isLoading={isLoading}
      priceKey="price_per_night"
      priceLabel="per night"
      emptyIcon={<Palmtree className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
