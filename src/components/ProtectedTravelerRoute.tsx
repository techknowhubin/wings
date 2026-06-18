import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedTravelerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Save the intended URL to redirect back after login
    localStorage.setItem('intended_url', location.pathname + location.search);
    return <Navigate to="/auth" replace />;
  }

  // Allow all logged-in users to access traveler dashboard, 
  // or restrict it strictly to 'user' role if needed.
  // For now, any authenticated user can view their traveler profile.
  return <>{children}</>;
}
