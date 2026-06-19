import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsHost } from '@/hooks/useListings';
import { useRole } from '@/hooks/useRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';

interface ProtectedHostRouteProps {
  children: React.ReactNode;
}

export function ProtectedHostRoute({ children }: ProtectedHostRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isHostUser, isLoading: roleLoading } = useIsHost(user?.id);
  const { dashboard: fallbackDashboard, isLoading: roleInfoLoading } = useRole();

  if (authLoading) return <HostLoadingScreen />;

  if (!user) {
    localStorage.setItem('intended_url', window.location.pathname + window.location.search);
    return <Navigate to="/auth" replace />;
  }

  if (roleLoading || roleInfoLoading) return <HostLoadingScreen />;

  if (!isHostUser) {
    // Send non-host users to their own dashboard, not to the traveler home
    return <Navigate to={fallbackDashboard} replace />;
  }

  return <>{children}</>;
}

function HostLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Shield className="h-10 w-10 animate-pulse text-primary" />
        <div className="space-y-2 w-48">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <p className="text-xs font-medium tracking-widest uppercase">
          Verifying host access…
        </p>
      </div>
    </div>
  );
}
