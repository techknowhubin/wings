import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AppRole =
  | 'user'
  | 'host'
  | 'admin'
  | 'super_admin'
  | 'hub_partner'
  | 'moderator';

export interface RoleInfo {
  role: AppRole | null;
  /** The canonical dashboard URL for this role. */
  dashboard: string;
  isLoading: boolean;
}

/**
 * Fetches the current user's role from the database (cached 5 min).
 * Also resolves the correct dashboard URL for non-traveler roles.
 * Use this everywhere role-based routing decisions are needed.
 */
export function useRole(): RoleInfo {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<{ role: AppRole | null; dashboard: string }> => {
      if (!user) return { role: null, dashboard: '/' };

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const role = (roleRow?.role ?? null) as AppRole | null;

      if (role === 'admin' || role === 'super_admin') {
        return { role, dashboard: '/admin' };
      }

      if (role === 'hub_partner') {
        const { data: hubData } = await supabase
          .from('hubs')
          .select('uuid')
          .eq('id', user.id)
          .maybeSingle();
        return {
          role,
          dashboard: hubData?.uuid ? `/hub/${hubData.uuid}` : '/',
        };
      }

      if (role === 'host') {
        return { role, dashboard: '/host' };
      }

      // Default: traveler / no role
      return { role: role ?? 'user', dashboard: '/' };
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    role: user ? (data?.role ?? null) : null,
    dashboard: data?.dashboard ?? '/',
    isLoading: authLoading || (!!user && queryLoading),
  };
}

/** Returns true if the role is a dashboard role (not a traveler). */
export function isNonTravelerRole(role: AppRole | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'hub_partner' || role === 'host';
}
