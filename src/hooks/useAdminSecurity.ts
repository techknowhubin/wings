import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'user' | 'host' | 'admin' | 'moderator' | 'hub_partner' | 'driver_partner';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface AdminUser {
  id: string;
  full_name: string | null;
  email_encrypted: string | null;
  phone_encrypted: string | null;
  role: AppRole;
  kyc_status: string;
  account_status: AccountStatus;
  onboarding_done: boolean;
  wing_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Users list ───────────────────────────────────────────────

export function useAdminUsers(search?: string) {
  return useQuery({
    queryKey: ['admin', 'security', 'users', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_users' as any, {
        p_limit:  1000,
        p_offset: 0,
        p_search: search ?? null,
      });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
}

// ─── Audit logs ───────────────────────────────────────────────

export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: async () => {
      let q = supabase
          .from('audit_logs' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(filters?.limit ?? 200);

      if (filters?.userId) q = q.eq('user_id', filters.userId);
      if (filters?.action) q = q.eq('action', filters.action);

      const { data, error } = await q;
      if (error) {
        console.warn("Audit logs unavailable:", error.message);
        return [] as AuditLog[];
      }
      return (data ?? []) as AuditLog[];
    },
  });
}

// ─── Rate limit blocks ────────────────────────────────────────

export function useRateLimitBlocks() {
  return useQuery({
    queryKey: ['admin', 'rate-limit-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('rate_limit_blocks' as any)
          .select('*')
          .gt('unblock_at', new Date().toISOString())
          .order('blocked_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────

async function callAdminAction(
  action: string,
  userId: string,
  extra: Record<string, unknown> = {}
) {
  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: { action, userId, ...extra },
  });

  if (error) {
    let errMsg = error.message;
    try {
      const response = (error as any).context?.response;
      if (response && typeof response.clone === 'function') {
        const cloned = response.clone();
        const text = await cloned.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) errMsg = parsed.error;
        } catch {
          if (text) errMsg = text;
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse function error body:', parseErr);
    }
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newRole, reason }: { userId: string; newRole: AppRole; reason?: string }) =>
      callAdminAction('change_role', userId, { newRole, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      toast.success('Role updated successfully');
    },
    onError: (err: Error) => toast.error(`Failed to change role: ${err.message}`),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      callAdminAction('suspend', userId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      toast.success('User suspended');
    },
    onError: (err: Error) => toast.error(`Failed to suspend: ${err.message}`),
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      callAdminAction('ban', userId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      toast.success('User banned');
    },
    onError: (err: Error) => toast.error(`Failed to ban: ${err.message}`),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callAdminAction('reactivate', userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      toast.success('User reactivated');
    },
    onError: (err: Error) => toast.error(`Failed to reactivate: ${err.message}`),
  });
}

export function useRevokeUserSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      callAdminAction('revoke_sessions', userId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      toast.success('Sessions revoked — user will be logged out');
    },
    onError: (err: Error) => toast.error(`Failed to revoke sessions: ${err.message}`),
  });
}

export function useAssignAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callAdminAction('assign_admin', userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      toast.success('Super Admin role assigned');
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });
}

export function useRemoveAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callAdminAction('remove_admin', userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      toast.success('Admin role removed');
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      callAdminAction('delete_user', userId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'security', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      toast.success('User deleted successfully');
    },
    onError: (err: Error) => toast.error(`Failed to delete user: ${err.message}`),
  });
}

export function useUnblockRateLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bucketKey: string) =>
      supabase.rpc('admin_unblock_rate_limit' as any, { p_bucket_key: bucketKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'rate-limit-blocks'] });
      toast.success('Block removed');
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });
}
