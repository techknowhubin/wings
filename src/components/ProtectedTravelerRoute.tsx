import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole, isNonTravelerRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

/**
 * Guards traveler-only pages (/profile, /profile/:section, etc.).
 *
 * - Not logged in            → /auth  (saves intended_url for deep-link)
 * - Admin / Host / Hub Partner → their own dashboard (RBAC enforcement)
 * - Traveler                 → renders children
 */
export function ProtectedTravelerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, dashboard, isLoading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    localStorage.setItem('intended_url', location.pathname + location.search);
    return <Navigate to="/auth" replace />;
  }

  // Admin / Host / Hub Partner must NOT see traveler pages
  if (isNonTravelerRole(role)) {
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}
