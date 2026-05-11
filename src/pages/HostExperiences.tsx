import { Compass } from 'lucide-react';
import { ListingsManager } from '@/components/dashboard/ListingsManager';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin, useManagedListings } from '@/hooks/useListings';

export default function HostExperiences() {
  const { user } = useAuth();
  const { data: isAdminUser = false } = useIsAdmin(user?.id);
  const { data: experiences = [], isLoading } = useManagedListings('experience', user?.id, isAdminUser);

  return (
    <ListingsManager
      title={isAdminUser ? "All Experiences" : "Your Experiences"}
      description={isAdminUser ? "Manage all experiences across the platform" : "Manage your tours, activities, and adventures"}
      listingType="experience"
      listings={experiences}
      isLoading={isLoading}
      priceKey="price_per_person"
      priceLabel="per person"
      emptyIcon={<Compass className="h-full w-full" />}
      isAdminUser={isAdminUser}
    />
  );
}
