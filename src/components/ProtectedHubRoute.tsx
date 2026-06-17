import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useListings";

export function ProtectedHubRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const location = useLocation();
  const { uuid } = useParams<{ uuid: string }>();
  const [hubAuthorized, setHubAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkHubAuth() {
      if (!user) {
        setHubAuthorized(false);
        return;
      }
      if (profile?.role === "admin") {
        setHubAuthorized(true); // Admins can view any hub
        return;
      }
      if (profile?.role !== "hub_partner") {
        setHubAuthorized(false);
        return;
      }

      // Query hubs table to ensure this user owns the requested hub UUID
      const { data, error } = await supabase
        .from('hubs')
        .select('uuid')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data || data.uuid !== uuid) {
        setHubAuthorized(false);
      } else {
        setHubAuthorized(true);
      }
    }

    if (!authLoading) {
      if (!user) {
        setHubAuthorized(false);
      } else if (profile !== undefined) {
        checkHubAuth();
      }
    }
  }, [user, profile, uuid, authLoading]);

  if (authLoading || hubAuthorized === null || (user && profile === undefined)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hubAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
