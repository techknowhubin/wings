import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsHost } from '@/hooks/useListings';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';

interface ProtectedHostRouteProps {
  children: React.ReactNode;
}

export function ProtectedHostRoute({ children }: ProtectedHostRouteProps) {
  const { user, loading: authLoading } = useAuth();

  const {
    data: isHostUser,
    isLoading: roleLoading,
  } = useIsHost(user?.id);

  // 1. Still resolving the auth session
  if (authLoading) {
    return <HostLoadingScreen />;
  }

  // 2. Auth resolved — no session → go to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3. User exists but role query is loading
  if (roleLoading) {
    return <HostLoadingScreen />;
  }

  // 4. Role resolved — not a host → go home (or show "no host dashboard")
  if (!isHostUser) {
    return <Navigate to="/" replace />;
  }

  // 5. Confirmed host — render
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
