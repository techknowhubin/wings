import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsAdmin, useIsHost } from '@/hooks/useListings';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function HostLayout() {
  const { user, loading } = useAuth();
  const { data: isHost, isLoading: roleLoading, isError: roleError } = useIsHost(user?.id);
  const { data: isAdminUser, isLoading: adminRoleLoading } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();
  const [seedAttempted, setSeedAttempted] = useState(false);
  const [isSeedingHostRole, setIsSeedingHostRole] = useState(false);

  useEffect(() => {
    const shouldAutoSeed =
      import.meta.env.DEV &&
      !!user &&
      !roleLoading &&
      !roleError &&
      isHost === false &&
      !seedAttempted;

    if (!shouldAutoSeed) return;

    const autoSeedHostRole = async () => {
      setSeedAttempted(true);
      setIsSeedingHostRole(true);

      try {
        const { error } = await supabase
          .from('user_roles')
          .upsert(
            {
              user_id: user.id,
              role: 'host',
            },
            { onConflict: 'user_id,role', ignoreDuplicates: true },
          );

        if (error) throw error;

        await queryClient.invalidateQueries({ queryKey: ['role', 'host', user.id] });
      } catch (error) {
        console.warn('DEV auto-seed failed for host role:', error);
      } finally {
        setIsSeedingHostRole(false);
      }
    };

    void autoSeedHostRole();
  }, [isHost, queryClient, roleError, roleLoading, seedAttempted, user]);

  if (loading || (user && (roleLoading || adminRoleLoading || isSeedingHostRole))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role check fails due transient DB/RLS issue, don't hard-block host pages.
  if (import.meta.env.DEV && isHost === false && !seedAttempted) {
    return null;
  }

  if (!roleError && isHost === false && !isAdminUser) {
    return <Navigate to="/onboarding/host" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
