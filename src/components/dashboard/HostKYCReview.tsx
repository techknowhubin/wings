import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  QrCode, Download, RefreshCw, ShieldCheck, AlertCircle,
  Clock, CheckCircle2, XCircle, Search, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 10;

type HostQR = {
  id: string;
  token: string;
  qr_status: 'active' | 'revoked' | 'inactive';
  created_at: string;
  regenerated_at: string | null;
  is_active: boolean;
};

type QRRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  rejection_reason: string | null;
};

type TravellerKYC = {
  id: string;
  host_id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  aadhaar: string | null;
  pan: string | null;
  driving_licence: string | null;
  emergency_contact: Record<string, string>;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
};

const VERIFICATION_BADGE: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  class: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  verified: { label: 'Verified', class: 'bg-green-100  text-green-800  border-green-200',  icon: CheckCircle2 },
  rejected: { label: 'Rejected', class: 'bg-red-100    text-red-800    border-red-200',    icon: XCircle },
};

const QR_STATUS_BADGE: Record<string, { label: string; class: string }> = {
  active:   { label: 'Active',   class: 'bg-green-100 text-green-800 border-green-200' },
  revoked:  { label: 'Revoked',  class: 'bg-red-100   text-red-800   border-red-200' },
  inactive: { label: 'Inactive', class: 'bg-gray-100  text-gray-600  border-gray-200' },
};

function useHostQR(userId?: string) {
  return useQuery({
    queryKey: ['host-qr', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('host_qr_codes')
        .select('*')
        .eq('host_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as HostQR | null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function useHostQRRequest(userId?: string) {
  return useQuery({
    queryKey: ['host-qr-request', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('qr_regen_requests')
        .select('*')
        .eq('host_id', userId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as QRRequest | null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function useTravellerKYC() {
  return useQuery({
    queryKey: ['host-traveller-kyc'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_host_traveller_kyc');
      if (error) throw error;
      return (data ?? []) as TravellerKYC[];
    },
    staleTime: 30_000,
  });
}

export function HostKYCReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: hostQR, isLoading: qrLoading } = useHostQR(user?.id);
  const { data: latestRequest, isLoading: reqLoading } = useHostQRRequest(user?.id);
  const { data: submissions = [], isLoading: kycLoading } = useTravellerKYC();

  const qrUrl = hostQR ? `${window.location.origin}/kyc/verify/${hostQR.token}` : '';

  // Generate first QR
  const generateQR = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('generate_host_qr');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('QR code generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['host-qr', user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to generate QR code'),
  });

  // Request regen
  const requestRegen = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('request_qr_regen');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Regeneration request submitted. Awaiting Super Admin approval.');
      queryClient.invalidateQueries({ queryKey: ['host-qr-request', user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to submit request'),
  });

  const handleDownload = () => {
    const canvas = document.getElementById('host-kyc-qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'xplorwing-kyc-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Filter + search + paginate
  const filtered = submissions.filter((s) => {
    if (statusFilter !== 'all' && s.verification_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.mobile.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasPendingRequest = latestRequest?.status === 'pending';
  const hasAnyQR = !!hostQR || (latestRequest?.status === 'approved' || latestRequest?.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">KYC Review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate your QR code for traveller KYC collection and review submitted details.
        </p>
      </div>

      {/* QR Code Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            QR Code Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qrLoading || reqLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-48" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : hostQR ? (
            /* Has active QR */
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white border-2 border-border rounded-2xl shadow-sm">
                  <QRCodeCanvas
                    id="host-kyc-qr-canvas"
                    value={qrUrl}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download QR
                </Button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">QR Status:</span>
                  <Badge
                    variant="outline"
                    className={`${QR_STATUS_BADGE[hostQR.qr_status]?.class} font-medium`}
                  >
                    {QR_STATUS_BADGE[hostQR.qr_status]?.label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Created: {format(new Date(hostQR.created_at), 'dd MMM yyyy, hh:mm a')}
                  </p>
                  {hostQR.regenerated_at && (
                    <p className="text-xs text-muted-foreground">
                      Last regenerated: {format(new Date(hostQR.regenerated_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                </div>

                <div className="bg-muted/40 rounded-xl p-3 text-xs font-mono text-muted-foreground break-all">
                  {qrUrl}
                </div>

                {/* Request new QR section */}
                {hasPendingRequest ? (
                  <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                        QR Regeneration Request Pending
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                        Submitted {format(new Date(latestRequest!.requested_at), 'dd MMM yyyy')}. Awaiting Super Admin approval.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      To generate a new QR code, you need Super Admin approval.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={() => requestRegen.mutate()}
                      disabled={requestRegen.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${requestRegen.isPending ? 'animate-spin' : ''}`} />
                      {requestRegen.isPending ? 'Submitting…' : 'Request New QR Code'}
                    </Button>
                  </div>
                )}

                {/* Show last rejected request info */}
                {latestRequest?.status === 'rejected' && (
                  <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">Last request rejected</p>
                      {latestRequest.rejection_reason && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                          Reason: {latestRequest.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No QR yet — first time */
            <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <QrCode className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold">No QR Code Yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Generate your unique QR code. Travellers can scan it to submit their KYC details securely.
                </p>
              </div>

              {hasPendingRequest ? (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl p-4 text-left max-w-sm">
                  <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Request Pending</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                      Your request is awaiting Super Admin approval.
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  className="rounded-xl gap-2"
                  onClick={() => generateQR.mutate()}
                  disabled={generateQR.isPending}
                >
                  <QrCode className="h-4 w-4" />
                  {generateQR.isPending ? 'Generating…' : 'Generate QR Code'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traveller KYC List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Traveller KYC Submissions
              <Badge variant="secondary" className="ml-1">{submissions.length}</Badge>
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search traveller…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 h-9 w-52 rounded-xl text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36 rounded-xl text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {kycLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {submissions.length === 0
                  ? 'No travellers have submitted KYC using your QR code yet.'
                  : 'No submissions match your filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Aadhaar</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead>DL No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((kyc) => {
                      const badge = VERIFICATION_BADGE[kyc.verification_status];
                      const Icon = badge?.icon ?? Clock;
                      return (
                        <TableRow key={kyc.id}>
                          <TableCell className="font-medium">{kyc.full_name}</TableCell>
                          <TableCell className="font-mono text-sm">{kyc.mobile}</TableCell>
                          <TableCell className="text-sm">{kyc.email || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{kyc.aadhaar || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{kyc.pan || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{kyc.driving_licence || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${badge?.class} gap-1 text-[10px]`}>
                              <Icon className="h-3 w-3" />
                              {badge?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(kyc.created_at), 'dd MMM yyyy')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-4">
        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <span>
          For privacy protection, sensitive fields (mobile, Aadhaar, PAN, Driving Licence) are masked.
          Only the last 4 digits are visible. Full details are accessible to Super Admin only.
        </span>
      </div>
    </div>
  );
}
