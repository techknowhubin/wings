import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole, isNonTravelerRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

/**
 * Wraps PUBLIC / traveler-facing pages (e.g. the home page "/").
 *
 * - Anonymous users  → see the page normally.
 * - Traveler (user)  → see the page normally.
 * - Admin / Host / Hub Partner → redirected to their own dashboard.
 *
 * Returns null while auth is hydrating (avoids flash of traveler content
 * for non-traveler roles before redirect fires).
 */
export function RoleGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, dashboard, isLoading: roleLoading } = useRole();

  // Auth session restoring from storage — render nothing to prevent flash
  if (authLoading) return null;

  // Not logged in — render the page as-is (public access)
  if (!user) return <>{children}</>;

  // Waiting for role DB query to resolve
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-traveler role: send them to their dashboard
  if (isNonTravelerRole(role)) {
    return <Navigate to={dashboard} replace />;
  }

  // Traveler / no role — render the page normally
  return <>{children}</>;
}
