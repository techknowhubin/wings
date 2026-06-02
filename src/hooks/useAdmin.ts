import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Helper: generate unique WingID ─────────────────────────────────────────
async function generateUniqueWingId(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const candidateId = `WING-${suffix}`;
    const { data } = await supabase.from('profiles').select('id').eq('wing_id', candidateId).maybeSingle();
    if (!data) return candidateId;
  }
  throw new Error('Could not generate unique WingID after 10 attempts');
}

// ─── Safe query helper — returns fallback on error instead of throwing ────────
async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T | null> {
  try {
    const { data, error } = await fn();
    if (error) { console.warn('[Admin] Query error:', error.message); return null; }
    return data;
  } catch (e) { console.warn('[Admin] Query exception:', e); return null; }
}

async function safeCount(fn: () => Promise<{ count: number | null; error: any }>): Promise<number> {
  try {
    const { count, error } = await fn();
    if (error) { console.warn('[Admin] Count error:', error.message); return 0; }
    return count ?? 0;
  } catch { return 0; }
}

// ─── Helper: resolve profile names for user IDs ─────────────────────────────
async function resolveProfileNames(userIds: string[]): Promise<Map<string, { full_name: string; phone: string | null }>> {
  const map = new Map<string, { full_name: string; phone: string | null }>();
  if (userIds.length === 0) return map;
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await supabase.from('profiles').select('id, full_name, phone').in('id', unique);
  (data ?? []).forEach((p: any) => map.set(p.id, { full_name: p.full_name ?? '—', phone: p.phone }));
  return map;
}

// ─── Overview Metrics ────────────────────────────────────────────────────────
export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [
        gmvData,
        todayBookings,
        pendingKyc,
        registeredTravelers,
        wingIdsIssued,
        staysPending, hotelsPending, resortsPending, carsPending, bikesPending, expPending,
        activeProvidersCount,
      ] = await Promise.all([
        safeQuery(() => supabase.from('bookings').select('total_price').eq('payment_status', 'completed')),
        safeCount(() => supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', today)),
        safeCount(() => supabase.from('user_documents' as any).select('*', { count: 'exact', head: true }).eq('status', 'pending')),
        safeCount(() => supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'user')),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'approved')),
        safeQuery(() => supabase.from('stays').select('id').eq('approval_status', 'pending')),
        safeQuery(() => supabase.from('hotels' as any).select('id').eq('approval_status', 'pending')),
        safeQuery(() => supabase.from('resorts' as any).select('id').eq('approval_status', 'pending')),
        safeQuery(() => supabase.from('cars').select('id').eq('approval_status', 'pending')),
        safeQuery(() => supabase.from('bikes').select('id').eq('approval_status', 'pending')),
        safeQuery(() => supabase.from('experiences').select('id').eq('approval_status', 'pending')),
        safeCount(() => supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'host')),
      ]);

      const totalGmv = (gmvData as any[] ?? []).reduce((s: number, r: any) => s + Number(r.total_price || 0), 0);
      // Commission is computed as 20% of GMV (no dedicated column)
      const platformRevenue = Math.round(totalGmv * 0.2);
      const pendingListings =
        ((staysPending as any[])?.length ?? 0) +
        ((hotelsPending as any[])?.length ?? 0) +
        ((resortsPending as any[])?.length ?? 0) +
        ((carsPending as any[])?.length ?? 0) +
        ((bikesPending as any[])?.length ?? 0) +
        ((expPending as any[])?.length ?? 0);

      return {
        totalGmv,
        todayBookings,
        pendingKyc,
        registeredTravelers,
        wingIdsIssued,
        platformRevenue,
        pendingListings,
        activeProviders: activeProvidersCount,
      };
    },
    staleTime: 60_000,
  });
}

// ─── Recent Bookings (Admin) ─────────────────────────────────────────────────
export function useAdminRecentBookings() {
  return useQuery({
    queryKey: ['admin', 'recent-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, listing_type, total_price, booking_status, payment_status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const bookings = data ?? [];
      const names = await resolveProfileNames(bookings.map((b: any) => b.user_id));
      return bookings.map((b: any) => ({
        ...b,
        total_amount: b.total_price,
        status: b.booking_status,
        profiles: names.get(b.user_id) ?? { full_name: '—' },
      }));
    },
  });
}

// ─── KYC / Document Review ──────────────────────────────────────────────────
export function useKycSubmissions(statusFilter?: string) {
  return useQuery({
    queryKey: ['admin', 'kyc', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_documents' as any)
        .select('*')
        .order('submitted_at', { ascending: true });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      const submissions = (data ?? []) as any[];
      const userIds = submissions.map((s: any) => s.user_id).filter(Boolean);
      const names = await resolveProfileNames(userIds);
      return submissions.map((s: any) => ({
        ...s,
        profiles: names.get(s.user_id) ?? { full_name: '—', phone: null },
      }));
    },
  });
}

export function useLockKycSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from('user_documents' as any)
        .update({ status: 'under_review' })
        .eq('id', submissionId)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'kyc'] }),
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, userId, adminId }: { submissionId: string; userId: string; adminId: string }) => {
      const now = new Date().toISOString();

      const [docRes, profileRes, hostRes] = await Promise.all([
        supabase.from('user_documents' as any).update({
          status: 'approved',
          reviewed_at: now,
          reviewed_by: adminId,
        }).eq('id', submissionId),
        supabase.from('profiles').update({
          kyc_status: 'approved',
          updated_at: now,
        }).eq('id', userId),
        supabase.from('host_profiles').update({
          onboarding_status: 'approved',
        }).eq('id', userId),
      ]);

      if (docRes.error) throw docRes.error;
      if (profileRes.error) throw profileRes.error;

      return { wingId: 'APPROVED' };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId, userId, adminId, reason,
    }: { submissionId: string; userId: string; adminId: string; reason: string }) => {
      const now = new Date().toISOString();
      const [k, p, h] = await Promise.all([
        supabase.from('user_documents' as any).update({ status: 'rejected', rejection_reason: reason, reviewed_at: now, reviewed_by: adminId }).eq('id', submissionId),
        supabase.from('profiles').update({ kyc_status: 'rejected', updated_at: now }).eq('id', userId),
        supabase.from('host_profiles').update({ onboarding_status: 'rejected' }).eq('id', userId),
      ]);
      if (k.error) throw k.error;
      if (p.error) throw p.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'kyc'] }),
  });
}

export function useRequestReupload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId, userId, adminId, notes,
    }: { submissionId: string; userId: string; adminId: string; notes: string }) => {
      const now = new Date().toISOString();
      const [k, p, h] = await Promise.all([
        supabase.from('user_documents' as any).update({ status: 're_upload_requested', review_notes: notes, reviewed_at: now, reviewed_by: adminId }).eq('id', submissionId),
        supabase.from('profiles').update({ kyc_status: 're_upload_requested', updated_at: now }).eq('id', userId),
        supabase.from('host_profiles').update({ onboarding_status: 'pending' }).eq('id', userId),
      ]);
      if (k.error) throw k.error;
      if (p.error) throw p.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'kyc'] }),
  });
}

// ─── Listing Approvals ───────────────────────────────────────────────────────
const LISTING_TABLES = ['stays', 'hotels', 'resorts', 'cars', 'bikes', 'experiences'] as const;

export function useAdminPendingListings(_typeFilter?: string) {
  return useQuery({
    queryKey: ['admin', 'listings'],
    queryFn: async () => {
      const results = await Promise.all(
        LISTING_TABLES.map(async (table: string) => {
          const { data, error } = await supabase
            .from(table as any)
            .select('*')
            .order('created_at', { ascending: false });
          if (error) return [];
          const items = (data ?? []) as any[];
          // Resolve host names
          const hostIds = items.map((i: any) => i.host_id).filter(Boolean);
          const names = await resolveProfileNames(hostIds);
          return items.map((item: any) => ({
            ...item,
            _table: table,
            profiles: names.get(item.host_id) ?? { full_name: '—', phone: null },
            approval_status: item.is_verified === true ? 'approved' : 'pending',
          }));
        })
      );
      return results.flat();
    },
  });
}

export function useApproveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as any).update({
        is_verified: true,
        marketplace_visible: true,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'listings'] }),
  });
}

export function useRejectListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, table, reason }: { id: string; table: string; reason: string }) => {
      const { error } = await supabase.from(table as any).update({
        is_verified: false,
        marketplace_visible: false,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'listings'] }),
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'listings'] }),
  });
}

export function useRequestRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, table, reason }: { id: string; table: string; reason: string }) => {
      const { error } = await supabase.from(table as any).update({
        is_verified: false,
        marketplace_visible: false,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'listings'] }),
  });
}

// ─── Providers ───────────────────────────────────────────────────────────────
export function useAdminProviders(search?: string) {
  return useQuery({
    queryKey: ['admin', 'providers', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'host');
      if (error) throw error;
      const hostIds = (data ?? []).map((r: any) => r.user_id);
      if (hostIds.length === 0) return [];

      const [{ data: profiles, error: pErr }, { data: hostProfiles }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone, profile_image, created_at').in('id', hostIds),
        supabase.from('host_profiles').select('id, business_name, onboarding_status, service_types').in('id', hostIds),
      ]);
      if (pErr) throw pErr;

      const hostProfileMap = new Map((hostProfiles ?? []).map((h: any) => [h.id, h]));

      let providers = (profiles ?? []).map((p: any) => ({
        ...p,
        ...(hostProfileMap.get(p.id) ?? {}),
      }));

      if (search) {
        const s = search.toLowerCase();
        providers = providers.filter((p: any) =>
          p.full_name?.toLowerCase().includes(s) ||
          p.business_name?.toLowerCase().includes(s) ||
          p.phone?.includes(s)
        );
      }
      return providers;
    },
  });
}

export function useApproveHost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hostId: string) => {
      const { error } = await supabase
        .from('host_profiles')
        .update({ onboarding_status: 'approved' })
        .eq('id', hostId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'providers'] }),
  });
}

export function useRejectHost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hostId: string) => {
      const { error } = await supabase
        .from('host_profiles')
        .update({ onboarding_status: 'rejected' })
        .eq('id', hostId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'providers'] }),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export function useAdminUsers(kycFilter?: string, search?: string) {
  return useQuery({
    queryKey: ['admin', 'users', kycFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, phone, profile_image, kyc_status, created_at')
        .order('created_at', { ascending: false });
      if (kycFilter && kycFilter !== 'all') {
        if (kycFilter === 'no_kyc') {
          query = query.eq('kyc_status', 'not_started');
        } else {
          query = query.eq('kyc_status', kycFilter);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      let users = data ?? [];
      if (search) {
        const s = search.toLowerCase();
        users = users.filter((u: any) => u.full_name?.toLowerCase().includes(s) || u.phone?.includes(s));
      }
      return users;
    },
  });
}

// ─── All Bookings ────────────────────────────────────────────────────────────
export function useAdminBookings(filters?: { status?: string; paymentStatus?: string; listingType?: string }) {
  return useQuery({
    queryKey: ['admin', 'bookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('booking_status', filters.status);
      if (filters?.paymentStatus) query = query.eq('payment_status', filters.paymentStatus as any);
      if (filters?.listingType) query = query.eq('listing_type', filters.listingType);
      const { data, error } = await query;
      if (error) throw error;
      const bookings = data ?? [];

      // Resolve traveler and host names
      const allIds = [...new Set([
        ...bookings.map((b: any) => b.user_id),
        ...bookings.map((b: any) => b.host_id),
      ].filter(Boolean))];
      const names = await resolveProfileNames(allIds);

      return bookings.map((b: any) => ({
        ...b,
        // Normalize to names expected by AdminBookings page
        total_amount: b.total_price,
        status: b.booking_status,
        guests: b.guests_count,
        traveler: names.get(b.user_id) ?? { full_name: '—', phone: null },
        host: names.get(b.host_id) ?? { full_name: '—' },
      }));
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('bookings').update({ booking_status: status, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
  });
}

// ─── Payouts (graceful — table may not exist) ────────────────────────────────
export function useAdminPayouts() {
  return useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('payouts' as any)
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return [];
        return data ?? [];
      } catch { return []; }
    },
  });
}

export function useUnpaidBookings() {
  return useQuery({
    queryKey: ['admin', 'unpaid-bookings'],
    queryFn: async () => {
      // Bookings completed + paid that may need provider payout
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_status', 'completed')
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });
      if (error) return [];
      const bookings = data ?? [];
      const hostIds = bookings.map((b: any) => b.host_id).filter(Boolean);
      const names = await resolveProfileNames(hostIds);
      return bookings.map((b: any) => ({
        ...b,
        total_amount: b.total_price,
        commission_amount: Math.round(Number(b.total_price || 0) * 0.2),
        host: names.get(b.host_id) ?? { full_name: '—', phone: null },
      }));
    },
  });
}

export function useMarkAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, providerId, amount, commission, reference, adminId }:
      { bookingId: string; providerId: string; amount: number; commission: number; reference?: string; adminId: string }) => {
      // Try to insert into payouts table; if it doesn't exist, silently fail
      try {
        const { error } = await supabase.from('payouts' as any).insert({
          booking_id: bookingId,
          provider_id: providerId,
          amount,
          platform_commission: commission,
          net_payout: amount - commission,
          status: 'paid',
          payment_reference: reference,
          initiated_by: adminId,
          paid_at: new Date().toISOString(),
        });
        if (error) console.warn('[Admin] Payout insert failed:', error.message);
      } catch (e) {
        console.warn('[Admin] Payout insert exception:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'unpaid-bookings'] });
    },
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export function useAdminAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: async () => {
      const from = new Date(Date.now() - days * 86400000).toISOString();
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('total_price, listing_type, created_at, payment_status, booking_status')
        .gte('created_at', from)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const paid = (bookings ?? []).filter((b: any) => b.payment_status === 'completed');
      const totalGmv = paid.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
      const platformRevenue = Math.round(totalGmv * 0.2);
      const avgBookingValue = paid.length ? totalGmv / paid.length : 0;

      // Group by day
      const byDay: Record<string, { gmv: number; revenue: number; count: number }> = {};
      paid.forEach((b: any) => {
        const day = b.created_at.split('T')[0];
        if (!byDay[day]) byDay[day] = { gmv: 0, revenue: 0, count: 0 };
        byDay[day].gmv += Number(b.total_price || 0);
        byDay[day].revenue += Math.round(Number(b.total_price || 0) * 0.2);
        byDay[day].count += 1;
      });
      const gmvOverTime = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

      // Group by listing type
      const byType: Record<string, number> = {};
      (bookings ?? []).forEach((b: any) => {
        byType[b.listing_type] = (byType[b.listing_type] ?? 0) + 1;
      });
      const bookingsByCategory = Object.entries(byType).map(([type, count]) => ({ type, count }));

      return { totalGmv, platformRevenue, avgBookingValue, gmvOverTime, bookingsByCategory };
    },
    staleTime: 300_000,
  });
}

// ─── Hub Partners ─────────────────────────────────────────────────────────────
export function useHubPartners(search?: string) {
  return useQuery({
    queryKey: ['admin', 'hubs', search],
    queryFn: async () => {
      try {
        let query = supabase
          .from('hub_partners' as any)
          .select('*')
          .order('created_at', { ascending: false });
        if (search) {
          query = query.or(`business_name.ilike.%${search}%,partner_name.ilike.%${search}%,city.ilike.%${search}%,referral_id.ilike.%${search}%`);
        }
        const { data, error } = await query;
        if (error) return [];
        return data ?? [];
      } catch { return []; }
    },
  });
}

export function useCreateHubPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hub: Record<string, any>) => {
      const { data, error } = await supabase.from('hub_partners' as any).insert(hub).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'hubs'] }),
  });
}

export function useUpdateHubPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Record<string, any>) => {
      const { error } = await supabase
        .from('hub_partners' as any)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'hubs'] }),
  });
}

export function useToggleHubStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('hub_partners' as any).update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'hubs'] }),
  });
}

export function useReferralTransactions(partnerId?: string) {
  return useQuery({
    queryKey: ['admin', 'referral-tx', partnerId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('referral_transactions' as any)
          .select('*, bookings(listing_type, start_date)')
          .order('created_at', { ascending: false });
        if (partnerId) query = query.eq('partner_id', partnerId);
        const { data, error } = await query;
        if (error) return [];
        return data ?? [];
      } catch { return []; }
    },
    enabled: !!partnerId,
  });
}

export function useHubAnalytics() {
  return useQuery({
    queryKey: ['admin', 'hub-analytics'],
    queryFn: async () => {
      try {
        const [{ data: partners }, { data: transactions }] = await Promise.all([
          supabase.from('hub_partners' as any).select('id, is_active'),
          supabase.from('referral_transactions' as any).select('commission_amount, booking_amount, payment_status, created_at'),
        ]);

        const totalPartners = (partners ?? []).length;
        const activePartners = (partners ?? []).filter((p: any) => p.is_active).length;
        const txList = (transactions ?? []) as any[];
        const completedTx = txList.filter((t) => t.payment_status === 'completed');
        const totalReferralBookings = txList.length;
        const totalReferralRevenue = completedTx.reduce((s: number, t: any) => s + Number(t.booking_amount ?? 0), 0);
        const totalCommissionPaid = completedTx.reduce((s: number, t: any) => s + Number(t.commission_amount ?? 0), 0);

        // Monthly breakdown (last 6 months)
        const now = new Date();
        const monthly = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          const count = txList.filter((t: any) => {
            const td = new Date(t.created_at);
            return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
          }).length;
          return { label, count };
        });

        return { totalPartners, activePartners, totalReferralBookings, totalReferralRevenue, totalCommissionPaid, monthly };
      } catch {
        return { totalPartners: 0, activePartners: 0, totalReferralBookings: 0, totalReferralRevenue: 0, totalCommissionPaid: 0, monthly: [] };
      }
    },
    staleTime: 60_000,
  });
}

export function useValidateReferralCode() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('hub_partners' as any)
        .select('id, business_name, partner_name, commission_rate, is_active, referral_id')
        .eq('referral_id', code.trim().toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Referral code not found');
      if (!(data as any).is_active) throw new Error('This referral code is no longer active');
      return data as any;
    },
  });
}

// ─── Admin Settings — Team ────────────────────────────────────────────────────
export function useAdminTeam() {
  return useQuery({
    queryKey: ['admin', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (error) throw error;
      const adminIds = (data ?? []).map((r: any) => r.user_id);
      if (adminIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, profile_image, created_at')
        .in('id', adminIds);
      if (pErr) throw pErr;
      return (profiles ?? []).map((p: any) => ({ ...p, user_id: p.id }));
    },
  });
}
