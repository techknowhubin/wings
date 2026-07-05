import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { QrCode, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

type QRRequest = {
  id: string;
  host_id: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  host_name?: string;
  host_email?: string;
  qr_created_at?: string | null;
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  pending:  { label: 'Pending',  class: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100   text-red-800   border-red-200'   },
};

function useQRRequests(status?: string) {
  return useQuery({
    queryKey: ['admin-qr-requests', status],
    queryFn: async () => {
      let q = (supabase as any)
        .from('qr_regen_requests')
        .select(`
          id, host_id, request_type, status, requested_at, approved_at, rejection_reason,
          profiles:host_id ( full_name, email_encrypted )
        `)
        .order('requested_at', { ascending: false });

      if (status && status !== 'all') {
        q = q.eq('status', status);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Also fetch previous QR code creation date per host
      const hostIds = (data ?? []).map((r: any) => r.host_id);
      let qrMap: Record<string, string | null> = {};
      if (hostIds.length) {
        const { data: qrData } = await (supabase as any)
          .from('host_qr_codes')
          .select('host_id, created_at')
          .in('host_id', hostIds)
          .order('created_at', { ascending: true });
        (qrData ?? []).forEach((q: any) => {
          qrMap[q.host_id] = q.created_at;
        });
      }

      return (data ?? []).map((r: any) => ({
        id: r.id,
        host_id: r.host_id,
        request_type: r.request_type,
        status: r.status,
        requested_at: r.requested_at,
        approved_at: r.approved_at,
        rejection_reason: r.rejection_reason,
        host_name: r.profiles?.full_name ?? '—',
        host_email: r.profiles?.email_encrypted ?? '—',
        qr_created_at: qrMap[r.host_id] ?? null,
      })) as QRRequest[];
    },
    staleTime: 30_000,
  });
}

export default function AdminQRRequests() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests = [], isLoading } = useQRRequests(tab);
  const pendingCount = useQuery({
    queryKey: ['admin-qr-requests', 'pending'],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('qr_regen_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    staleTime: 60_000,
  }).data ?? 0;

  const approve = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase as any).rpc('approve_qr_regen', { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('QR code regenerated and host notified.');
      queryClient.invalidateQueries({ queryKey: ['admin-qr-requests'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Approval failed'),
  });

  const reject = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc('reject_qr_regen', {
        p_request_id: requestId,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request rejected. Host has been notified.');
      setRejectOpen(false);
      setSelectedId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-qr-requests'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Rejection failed'),
  });

  const openReject = (id: string) => {
    setSelectedId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">QR Regen Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve/reject host QR code regeneration requests.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Pending
            {pendingCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host</TableHead>
                      <TableHead>Host ID</TableHead>
                      <TableHead>Previous QR Created</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No requests in this category.
                        </TableCell>
                      </TableRow>
                    )}
                    {requests.map((req) => {
                      const badge = STATUS_BADGE[req.status];
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-semibold">{req.host_name}</p>
                              <p className="text-xs text-muted-foreground">{req.host_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {req.host_id.slice(0, 8)}…
                            </code>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {req.qr_created_at
                              ? format(new Date(req.qr_created_at), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${badge?.class} text-[10px]`}>
                              {badge?.label}
                            </Badge>
                            {req.status === 'rejected' && req.rejection_reason && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                                {req.rejection_reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg gap-1"
                                  disabled={approve.isPending}
                                  onClick={() => approve.mutate(req.id)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs rounded-lg gap-1"
                                  onClick={() => openReject(req.id)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : req.status === 'approved' ? (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approved {req.approved_at ? format(new Date(req.approved_at), 'dd MMM') : ''}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-red-500">
                                <XCircle className="h-3.5 w-3.5" />
                                Rejected
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) { setSelectedId(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject QR Regeneration Request</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional — host will be notified with this message)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setSelectedId(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reject.isPending}
              onClick={() => selectedId && reject.mutate({ requestId: selectedId, reason: rejectReason })}
            >
              {reject.isPending ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
