import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useKycSubmissions, useLockKycSubmission,
  useApproveKyc, useRejectKyc, useRequestReupload,
} from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ShieldCheck, AlertTriangle, Clock, ZoomIn, CheckCircle2, XCircle, RefreshCw, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type KycSubmission = any;

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  driving_licence: 'Driving Licence',
  passport: 'Passport',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  re_upload_requested: { label: 'Re-upload Requested', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const REJECTION_REASONS = [
  'Document image is unclear or blurry',
  'Name on document does not match profile',
  'Document appears to be expired',
  'Wrong document type submitted',
  'Document is partially visible or cut off',
  'Suspected fraudulent document',
  'Other (specify below)',
];

function getSlaClass(submittedAt: string, status: string) {
  if (status !== 'pending' && status !== 'under_review') return null;
  const hours = (Date.now() - new Date(submittedAt).getTime()) / 3600000;
  if (hours > 4) return 'text-red-500';
  if (hours > 2) return 'text-amber-500';
  return null;
}

async function getSignedUrl(path: string) {
  if (!path) return null;
  // If already a full URL, return as-is (external URLs)
  if (path.startsWith('http')) return path;
  const { data } = await supabase.storage.from('user-documents').createSignedUrl(path, 900);
  return data?.signedUrl ?? null;
}

export default function KYCReview() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  // Action modals
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [reuploadNotes, setReuploadNotes] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  // Signed URLs
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);

  const { data: submissions, isLoading } = useKycSubmissions(tab === 'all' ? undefined : tab);
  const lockMutation = useLockKycSubmission();
  const approveMutation = useApproveKyc();
  const rejectMutation = useRejectKyc();
  const reuploadMutation = useRequestReupload();

  const counts = {
    pending: (useKycSubmissions('pending').data ?? []).length,
    under_review: (useKycSubmissions('under_review').data ?? []).length,
  };

  const openDrawer = async (sub: KycSubmission) => {
    setSelected(sub);
    // Lock it
    if (sub.status === 'pending') {
      lockMutation.mutate(sub.id);
    }
    // Fetch signed URLs
    const [f, b] = await Promise.all([
      getSignedUrl(sub.document_front_url),
      getSignedUrl(sub.document_back_url),
    ]);
    setFrontUrl(f);
    setBackUrl(b);
  };

  const handleApprove = async () => {
    if (!selected || !user) return;
    const result = await approveMutation.mutateAsync({
      submissionId: selected.id,
      userId: selected.user_id,
      adminId: user.id,
    });
    toast({ title: `KYC approved! WingID ${(result as any).wingId} assigned.`, className: 'border-green-200 bg-green-50 text-green-800' });
    setApproveOpen(false);
    setSelected(null);
  };

  const handleReject = async () => {
    if (!selected || !user || !rejectReason) return;
    await rejectMutation.mutateAsync({
      submissionId: selected.id,
      userId: selected.user_id,
      adminId: user.id,
      reason: rejectNotes ? `${rejectReason}: ${rejectNotes}` : rejectReason,
    });
    toast({ title: 'KYC rejected. Traveler has been notified.', variant: 'destructive' });
    setRejectOpen(false);
    setSelected(null);
  };

  const handleReupload = async () => {
    if (!selected || !user || !reuploadNotes) return;
    await reuploadMutation.mutateAsync({
      submissionId: selected.id,
      userId: selected.user_id,
      adminId: user.id,
      notes: reuploadNotes,
    });
    toast({ title: 'Re-upload requested. Traveler notified.', className: 'border-orange-200 bg-orange-50 text-orange-800' });
    setReuploadOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">KYC Review</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve traveler identity documents.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="under_review">Under Review ({counts.under_review})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Traveler</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(submissions ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No submissions in this category.</TableCell></TableRow>
                    )}
                    {(submissions ?? []).map((sub: KycSubmission) => {
                      const slaClass = getSlaClass(sub.submitted_at, sub.status);
                      const badge = STATUS_BADGE[sub.status];
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-semibold">{sub.profiles?.full_name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{sub.profiles?.phone ?? sub.profiles?.email ?? '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{DOC_LABELS[sub.document_type] ?? sub.document_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</TableCell>
                          <TableCell className="text-sm">#{sub.attempt_number}</TableCell>
                          <TableCell>
                            {slaClass && (
                              <AlertTriangle className={`h-4 w-4 ${slaClass}`} title="SLA exceeded" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${badge?.className}`}>{badge?.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openDrawer(sub)}>Review</Button>
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

      {/* Review Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KYC Review — {selected?.profiles?.full_name ?? 'Traveler'}</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              {/* Profile Section */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Traveler Profile</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-semibold">{selected.profiles?.full_name ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{selected.profiles?.phone ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-semibold">{selected.profiles?.email ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Attempt</p><p className="font-semibold">#{selected.attempt_number}</p></div>
                </div>
              </div>

              {/* Document Section */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Document: {DOC_LABELS[selected.document_type]}</p>
                {frontUrl && (
                  <div className="relative group">
                    <img src={frontUrl} alt="Document Front" className="w-full rounded-xl border object-cover max-h-64" />
                    <button onClick={() => setZoomSrc(frontUrl)} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {backUrl && (
                  <div className="relative group">
                    <img src={backUrl} alt="Document Back" className="w-full rounded-xl border object-cover max-h-64" />
                    <button onClick={() => setZoomSrc(backUrl)} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!frontUrl && (
                  <div className="p-6 rounded-xl border border-dashed text-center text-muted-foreground text-sm">No document images available</div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 border-t">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve KYC
                </Button>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setReuploadOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Request Re-upload
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject KYC
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Image Zoom Modal */}
      <Dialog open={!!zoomSrc} onOpenChange={(o) => !o && setZoomSrc(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black">
          {zoomSrc && <img src={zoomSrc} alt="Document zoom" className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Approve Confirm */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve KYC for {selected?.profiles?.full_name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will verify the traveler and generate a unique WingID for them.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject KYC Submission</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger><SelectValue placeholder="Select rejection reason…" /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Additional notes (optional)" value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-upload Modal */}
      <Dialog open={reuploadOpen} onOpenChange={setReuploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Re-upload</DialogTitle></DialogHeader>
          <Textarea placeholder="Specify what the traveler needs to re-upload or correct…" value={reuploadNotes} onChange={(e) => setReuploadNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReuploadOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReupload} disabled={!reuploadNotes || reuploadMutation.isPending}>
              {reuploadMutation.isPending ? 'Sending…' : 'Request Re-upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
