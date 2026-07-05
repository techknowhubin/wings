import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { format, formatDistanceToNow } from 'date-fns';
import { ShieldCheck, AlertTriangle, Clock, ZoomIn, CheckCircle2, XCircle, RefreshCw, User, QrCode, ShieldX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { presignGet } from '@/lib/r2';

type KycSubmission = any;

// ─── Traveller QR KYC types & hooks ───────────────────────────────────────────
type TravellerKYCRecord = {
  id: string; host_id: string; full_name: string; mobile: string;
  email: string | null; aadhaar: string | null; pan: string | null;
  driving_licence: string | null; address: string | null;
  emergency_contact: Record<string, string>;
  uploaded_documents: { type: string; path: string }[] | null;
  verification_status: 'pending' | 'verified' | 'rejected'; created_at: string;
  host_name?: string;
};

const DOC_TYPE_LABEL: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  driving_licence: 'Driving Licence',
};

function DocPhotoViewer({ doc }: { doc: { type: string; path: string } }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from('traveller-kyc-docs').createSignedUrl(doc.path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [doc.path]);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{DOC_TYPE_LABEL[doc.type] ?? doc.type}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={doc.type} className="w-full rounded-lg border object-cover max-h-48 hover:opacity-90 transition-opacity cursor-zoom-in" />
        </a>
      ) : (
        <div className="h-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
          Loading…
        </div>
      )}
    </div>
  );
}

const QR_STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  verified: { label: 'Verified', cls: 'bg-green-100  text-green-800  border-green-200',  icon: ShieldCheck },
  rejected: { label: 'Rejected', cls: 'bg-red-100    text-red-800    border-red-200',    icon: ShieldX },
};

function useTravellerQRKYC() {
  return useQuery({
    queryKey: ['admin-traveller-qr-kyc'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_host_traveller_kyc');
      if (error) throw error;
      const records = (data ?? []) as TravellerKYCRecord[];
      const hostIds = [...new Set(records.map(r => r.host_id))];
      let hostMap: Record<string, string> = {};
      if (hostIds.length) {
        const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', hostIds);
        (profiles ?? []).forEach((p: any) => { hostMap[p.id] = p.full_name; });
      }
      return records.map(r => ({ ...r, host_name: hostMap[r.host_id] ?? '—' }));
    },
    staleTime: 30_000,
  });
}

function TravellerQRKYCTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<TravellerKYCRecord | null>(null);
  const { data: records = [], isLoading } = useTravellerQRKYC();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).rpc('admin_update_traveller_kyc_status', { p_kyc_id: id, p_status: status });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `KYC marked as ${status}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-traveller-qr-kyc'] });
      setSelected(prev => prev ? { ...prev, verification_status: status as any } : null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.message ?? 'Update failed' }),
  });

  if (isLoading) return <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Traveller</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Aadhaar</TableHead>
            <TableHead>PAN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No QR KYC submissions yet.
              </TableCell>
            </TableRow>
          )}
          {records.map((kyc) => {
            const badge = QR_STATUS_BADGE[kyc.verification_status];
            const Icon = badge?.icon ?? Clock;
            return (
              <TableRow key={kyc.id} className="cursor-pointer" onClick={() => setSelected(kyc)}>
                <TableCell>
                  <p className="text-sm font-semibold">{kyc.full_name}</p>
                  <p className="text-xs text-muted-foreground">{kyc.email || '—'}</p>
                </TableCell>
                <TableCell className="text-sm">{kyc.host_name}</TableCell>
                <TableCell className="font-mono text-sm">{kyc.mobile}</TableCell>
                <TableCell className="font-mono text-xs">{kyc.aadhaar || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{kyc.pan || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${badge?.cls} gap-1 text-[10px]`}>
                    <Icon className="h-3 w-3" />{badge?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(kyc.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg">Review</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />{selected?.full_name}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Status:</span>
                {(['pending', 'verified', 'rejected'] as const).map((s) => {
                  const b = QR_STATUS_BADGE[s];
                  return (
                    <Button key={s} size="sm"
                      variant={selected.verification_status === s ? 'default' : 'outline'}
                      className={`h-7 text-xs rounded-lg ${selected.verification_status === s ? '' : b.cls}`}
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selected.id, status: s })}>
                      {b.label}
                    </Button>
                  );
                })}
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Full Name', value: selected.full_name },
                    { label: 'Mobile', value: selected.mobile },
                    { label: 'Email', value: selected.email },
                    { label: 'Host', value: selected.host_name },
                    { label: 'Address', value: selected.address, full: true },
                  ].map(({ label, value, full }) => (
                    <div key={label} className={full ? 'col-span-2' : ''}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Identity Documents</p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {[
                    { label: 'Aadhaar Number', value: selected.aadhaar },
                    { label: 'PAN Number', value: selected.pan },
                    { label: 'Driving Licence', value: selected.driving_licence },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-mono font-medium text-sm">{value || '—'}</p>
                    </div>
                  ))}
                </div>
                {/* Document photos */}
                {selected.uploaded_documents && selected.uploaded_documents.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Photos</p>
                    <div className="grid grid-cols-1 gap-3">
                      {selected.uploaded_documents.map((doc) => (
                        <DocPhotoViewer key={doc.path} doc={doc} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {selected.emergency_contact && Object.keys(selected.emergency_contact).length > 0 && (
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(selected.emergency_contact).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                        <p className="font-medium">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{format(new Date(selected.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  driving_licence: 'Driving Licence',
  driving_license: 'Driving License',
  passport: 'Passport',
  pan: 'PAN Card',
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
  // Legacy Supabase URLs or any absolute URL — return as-is
  if (path.startsWith('http')) return path;
  // R2 object key — generate a 15-minute presigned GET URL
  return presignGet(path, 900).catch(() => null);
}

export default function KYCReview() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState('pending');
  const [section, setSection] = useState<'document' | 'qr'>('document');
  const [selected, setSelected] = useState<any | null>(null);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  // Action modals
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [reuploadNotes, setReuploadNotes] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  // Signed URLs mapping for each document: { [docId]: { front, back } }
  const [signedUrls, setSignedUrls] = useState<Record<string, { front: string | null; back: string | null }>>({});

  const { data: submissions, isLoading } = useKycSubmissions(tab === 'all' ? undefined : tab);
  const lockMutation = useLockKycSubmission();
  const approveMutation = useApproveKyc();
  const rejectMutation = useRejectKyc();
  const reuploadMutation = useRequestReupload();

  // Load submissions for count calculation
  const pendingSubmissions = useKycSubmissions('pending').data ?? [];
  const underReviewSubmissions = useKycSubmissions('under_review').data ?? [];

  const counts = {
    pending: new Set(pendingSubmissions.map(s => s.user_id)).size,
    under_review: new Set(underReviewSubmissions.map(s => s.user_id)).size,
  };

  // Group submissions by user
  const groupedSubmissions = useMemo(() => {
    if (!submissions) return [];
    const groups: Record<string, any> = {};
    submissions.forEach((sub) => {
      const userId = sub.user_id;
      if (!groups[userId]) {
        groups[userId] = {
          user_id: userId,
          profiles: sub.profiles,
          host_profile: sub.host_profile,
          documents: [],
        };
      }
      groups[userId].documents.push(sub);
    });
    return Object.values(groups);
  }, [submissions]);

  const openDrawer = async (group: any) => {
    setSelected(group);
    // Lock pending documents
    group.documents.forEach((doc: any) => {
      if (doc.status === 'pending') {
        lockMutation.mutate(doc.id);
      }
    });
    // Fetch signed URLs for all documents in parallel
    const urls: Record<string, { front: string | null; back: string | null }> = {};
    await Promise.all(
      group.documents.map(async (doc: any) => {
        const [f, b] = await Promise.all([
          getSignedUrl(doc.document_front_url),
          getSignedUrl(doc.document_back_url),
        ]);
        urls[doc.id] = { front: f, back: b };
      })
    );
    setSignedUrls(urls);
  };

  const triggerApprove = (doc: any) => {
    setActiveDoc(doc);
    setApproveOpen(true);
  };

  const triggerReject = (doc: any) => {
    setActiveDoc(doc);
    setRejectOpen(true);
  };

  const triggerReupload = (doc: any) => {
    setActiveDoc(doc);
    setReuploadOpen(true);
  };

  const handleApprove = async () => {
    if (!activeDoc || !selected || !user) return;
    try {
      const result = await approveMutation.mutateAsync({
        submissionId: activeDoc.id,
        userId: selected.user_id,
        adminId: user.id,
      });
      toast({ title: `Document approved! WingID ${(result as any).wingId} assigned.`, className: 'border-green-200 bg-green-50 text-green-800' });
      setApproveOpen(false);
      
      // Update status locally
      setSelected((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: prev.documents.map((d: any) =>
            d.id === activeDoc.id ? { ...d, status: 'approved' } : d
          ),
        };
      });
      setActiveDoc(null);
    } catch (error: any) {
      console.error("Approve failed:", error);
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve document.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    if (!activeDoc || !selected || !user || !rejectReason) return;
    try {
      await rejectMutation.mutateAsync({
        submissionId: activeDoc.id,
        userId: selected.user_id,
        adminId: user.id,
        reason: rejectNotes ? `${rejectReason}: ${rejectNotes}` : rejectReason,
      });
      toast({ title: 'Document rejected. Traveler has been notified.', variant: 'destructive' });
      setRejectOpen(false);
      
      // Update status locally
      setSelected((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: prev.documents.map((d: any) =>
            d.id === activeDoc.id ? { ...d, status: 'rejected' } : d
          ),
        };
      });
      setActiveDoc(null);
    } catch (error: any) {
      console.error("Reject failed:", error);
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject document.",
        variant: "destructive"
      });
    }
  };

  const handleReupload = async () => {
    if (!activeDoc || !selected || !user || !reuploadNotes) return;
    try {
      await reuploadMutation.mutateAsync({
        submissionId: activeDoc.id,
        userId: selected.user_id,
        adminId: user.id,
        notes: reuploadNotes,
      });
      toast({ title: 'Re-upload requested. Traveler notified.', className: 'border-orange-200 bg-orange-50 text-orange-800' });
      setReuploadOpen(false);
      
      // Update status locally
      setSelected((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          documents: prev.documents.map((d: any) =>
            d.id === activeDoc.id ? { ...d, status: 're_upload_requested' } : d
          ),
        };
      });
      setActiveDoc(null);
    } catch (error: any) {
      console.error("Reupload request failed:", error);
      toast({
        title: "Re-upload request failed",
        description: error.message || "Failed to request document re-upload.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">KYC Review</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve traveler identity documents.</p>
      </div>

      {/* Section switcher */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={section === 'document' ? 'default' : 'outline'}
          className="rounded-xl gap-2"
          onClick={() => setSection('document')}
        >
          <ShieldCheck className="h-4 w-4" /> Document KYC
        </Button>
        <Button
          size="sm"
          variant={section === 'qr' ? 'default' : 'outline'}
          className="rounded-xl gap-2"
          onClick={() => setSection('qr')}
        >
          <QrCode className="h-4 w-4" /> Traveller QR KYC
        </Button>
      </div>

      {section === 'qr' && (
        <Card>
          <CardContent className="p-0">
            <TravellerQRKYCTab />
          </CardContent>
        </Card>
      )}

      {section === 'document' && <Tabs value={tab} onValueChange={setTab}>
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
                      <TableHead>User</TableHead>
                      <TableHead>Business / Type</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedSubmissions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No submissions in this category.</TableCell></TableRow>
                    )}
                    {groupedSubmissions.map((group: any) => {
                      const latestSubmitted = group.documents.reduce((latest: number, doc: any) => {
                        const t = new Date(doc.submitted_at).getTime();
                        return t > latest ? t : latest;
                      }, 0);
                      const hasSlaExceeded = group.documents.some((d: any) => getSlaClass(d.submitted_at, d.status) !== null);
                      const uniqueStatuses = Array.from(new Set(group.documents.map((d: any) => d.status))) as string[];

                      return (
                        <TableRow key={group.user_id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-semibold">{group.profiles?.full_name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{group.profiles?.phone ?? '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {group.host_profile ? (
                              <div>
                                <p className="text-xs font-semibold text-foreground">{group.host_profile.business_name ?? '—'}</p>
                                <p className="text-[10px] text-blue-600 capitalize">{group.host_profile.host_type ?? 'host'}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Traveler</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {group.documents.map((d: any) => DOC_LABELS[d.document_type] ?? d.document_type).join(', ')}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {latestSubmitted > 0 ? formatDistanceToNow(new Date(latestSubmitted), { addSuffix: true }) : '—'}
                          </TableCell>
                          <TableCell>
                            {hasSlaExceeded && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="SLA exceeded" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {uniqueStatuses.map((status: string) => {
                                const badge = STATUS_BADGE[status];
                                return (
                                  <Badge key={status} variant="outline" className={`text-[10px] px-1.5 py-0.5 ${badge?.className}`}>
                                    {badge?.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openDrawer(group)}>Review</Button>
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
      </Tabs>}

      {/* Review Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KYC Review — {selected?.profiles?.full_name ?? 'Traveler'}</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              {/* Basic Profile */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-semibold">{selected.profiles?.full_name ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{selected.profiles?.phone ?? selected.host_profile?.host_phone ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-semibold">{selected.host_profile?.host_email ?? '—'}</p></div>
                </div>
              </div>

              {/* Host Business Details */}
              {selected.host_profile && (
                <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Host / Business Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Business Name</p>
                      <p className="font-semibold">{selected.host_profile.business_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Host Type</p>
                      <p className="font-semibold capitalize">{selected.host_profile.host_type ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-semibold">
                        {[selected.host_profile.city, selected.host_profile.state].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                    {selected.host_profile.gst_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">GST Number</p>
                        <p className="font-semibold font-mono text-xs">{selected.host_profile.gst_number}</p>
                      </div>
                    )}
                    {selected.host_profile.service_types?.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Service Types</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.host_profile.service_types.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Card Section */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Submitted Documents ({selected.documents.length})
                </p>
                {selected.documents.map((doc: any, index: number) => {
                  const badge = STATUS_BADGE[doc.status];
                  const urls = signedUrls[doc.id] || { front: null, back: null };
                  const isDocPending = doc.status === 'pending' || doc.status === 'under_review';

                  return (
                    <Card key={doc.id} className="border-border/60">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm">
                            {index + 1}. {DOC_LABELS[doc.document_type] ?? doc.document_type}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] ${badge?.className}`}>
                            {badge?.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {doc.document_number && (
                            <div>
                              <p className="text-muted-foreground">Document Number</p>
                              <p className="font-semibold font-mono">{doc.document_number}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Submitted</p>
                            <p className="font-semibold">
                              {formatDistanceToNow(new Date(doc.submitted_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {/* Images */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Front Image</p>
                            {urls.front ? (
                              <div className="relative group">
                                <img src={urls.front} alt="Front" className="w-full rounded-lg border object-cover h-32" />
                                <button onClick={() => setZoomSrc(urls.front)} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="h-32 rounded-lg border border-dashed flex items-center justify-center text-center text-muted-foreground text-[10px]">No image</div>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Back Image</p>
                            {urls.back ? (
                              <div className="relative group">
                                <img src={urls.back} alt="Back" className="w-full rounded-lg border object-cover h-32" />
                                <button onClick={() => setZoomSrc(urls.back)} className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="h-32 rounded-lg border border-dashed flex items-center justify-center text-center text-muted-foreground text-[10px]">No image</div>
                            )}
                          </div>
                        </div>

                        {/* Actions for this document */}
                        {isDocPending && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => triggerApprove(doc)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => triggerReupload(doc)}>
                              Re-upload
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => triggerReject(doc)}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
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
          <DialogHeader><DialogTitle>Approve {activeDoc ? DOC_LABELS[activeDoc.document_type] ?? activeDoc.document_type : 'document'}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will approve the selected document for the traveler.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveOpen(false); setActiveDoc(null); }}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Document Submission</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => { setRejectOpen(false); setActiveDoc(null); }}>Cancel</Button>
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
            <Button variant="outline" onClick={() => { setReuploadOpen(false); setActiveDoc(null); }}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReupload} disabled={!reuploadNotes || reuploadMutation.isPending}>
              {reuploadMutation.isPending ? 'Sending…' : 'Request Re-upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
