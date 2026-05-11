import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useListings';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, loading: authLoading } = useAuth();

  const {
    data: isAdminUser,
    isLoading: roleLoading,
  } = useIsAdmin(user?.id);

  // 1. Still resolving the auth session
  if (authLoading) {
    return <AdminLoadingScreen />;
  }

  // 2. Auth resolved — no session → go to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3. User exists but role query is loading
  if (roleLoading) {
    return <AdminLoadingScreen />;
  }

  // 4. Role resolved — not an admin → go home
  if (!isAdminUser) {
    return <Navigate to="/" replace />;
  }

  // 5. Confirmed admin — render
  return <>{children}</>;
}

function AdminLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Shield className="h-10 w-10 animate-pulse text-primary" />
        <div className="space-y-2 w-48">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <p className="text-xs font-medium tracking-widest uppercase">
          Verifying access…
        </p>
      </div>
    </div>
  );
}
