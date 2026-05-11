import { useState } from 'react';
import { useAdminPendingListings, useApproveListing, useRejectListing, useRequestRevision } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
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
import { CheckCircle2, XCircle, RefreshCw, MapPin, DollarSign } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  stays: 'bg-blue-100 text-blue-700',
  hotels: 'bg-purple-100 text-purple-700',
  resorts: 'bg-emerald-100 text-emerald-700',
  cars: 'bg-amber-100 text-amber-700',
  bikes: 'bg-orange-100 text-orange-700',
  experiences: 'bg-pink-100 text-pink-700',
};

const APPROVAL_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  needs_revision: { label: 'Needs Revision', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

const REJECTION_REASONS = [
  'Incomplete or inaccurate listing information',
  'Images do not meet quality standards',
  'Price appears misleading or unrealistic',
  'Service not available at stated location',
  'Provider missing required licence or permit',
  'Duplicate listing',
  'Other',
];

export default function ListingApprovals() {
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);

  const { data: listings, isLoading } = useAdminPendingListings(tab);
  const approveMut = useApproveListing();
  const rejectMut = useRejectListing();
  const revisionMut = useRequestRevision();

  const filtered = tab === 'all' ? listings : (listings ?? []).filter((l: any) => l._table === tab);

  const typeCount = (type: string) => (listings ?? []).filter((l: any) => l._table === type).length;

  const handleApprove = async () => {
    if (!selected) return;
    await approveMut.mutateAsync({ id: selected.id, table: selected._table });
    toast({ title: 'Listing approved and now live on the marketplace.', className: 'border-green-200 bg-green-50 text-green-800' });
    setApproveOpen(false);
    setSelected(null);
  };

  const handleReject = async () => {
    if (!selected || !rejectReason) return;
    await rejectMut.mutateAsync({ id: selected.id, table: selected._table, reason: rejectReason });
    toast({ title: 'Listing rejected. Host has been notified.', variant: 'destructive' });
    setRejectOpen(false);
    setSelected(null);
  };

  const handleRevision = async () => {
    if (!selected || !revisionNote) return;
    await revisionMut.mutateAsync({ id: selected.id, table: selected._table, reason: revisionNote });
    toast({ title: 'Revision requested. Host has been notified.', className: 'border-orange-200 bg-orange-50 text-orange-800' });
    setRevisionOpen(false);
    setSelected(null);
  };

  const priceLabel = (listing: any) => {
    if (listing.price_per_night) return `₹${Number(listing.price_per_night).toLocaleString('en-IN')}/night`;
    if (listing.price_per_day) return `₹${Number(listing.price_per_day).toLocaleString('en-IN')}/day`;
    if (listing.price_per_person) return `₹${Number(listing.price_per_person).toLocaleString('en-IN')}/person`;
    return '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Listing Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve provider submissions before they go live.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({listings?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="stays">Stays ({typeCount('stays')})</TabsTrigger>
          <TabsTrigger value="hotels">Hotels ({typeCount('hotels')})</TabsTrigger>
          <TabsTrigger value="resorts">Resorts ({typeCount('resorts')})</TabsTrigger>
          <TabsTrigger value="cars">Cars ({typeCount('cars')})</TabsTrigger>
          <TabsTrigger value="bikes">Bikes ({typeCount('bikes')})</TabsTrigger>
          <TabsTrigger value="experiences">Experiences ({typeCount('experiences')})</TabsTrigger>
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
                      <TableHead>Provider</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filtered ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No listings to review.</TableCell></TableRow>
                    )}
                    {(filtered ?? []).map((l: any) => {
                      const badge = APPROVAL_STATUS_BADGE[l.approval_status];
                      return (
                        <TableRow key={`${l._table}-${l.id}`}>
                          <TableCell className="text-xs font-medium">{l.profiles?.full_name ?? '—'}</TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold max-w-[160px] truncate">{l.title ?? l.make + ' ' + l.model}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] capitalize ${TYPE_COLORS[l._table] ?? ''}`}>{l._table}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{priceLabel(l)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.location ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {l.submitted_for_review_at ? formatDistanceToNow(new Date(l.submitted_for_review_at), { addSuffix: true }) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${badge?.className}`}>{badge?.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => setSelected(l)}>Review</Button>
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
            <SheetTitle>{selected?.title ?? `${selected?.make} ${selected?.model}`}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-6">
              {/* Images */}
              {selected.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selected.images.slice(0, 6).map((img: string, i: number) => (
                    <img key={i} src={img} alt={`img-${i}`} className="h-36 w-auto rounded-lg border object-cover shrink-0" />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Category</p><p className="font-semibold capitalize">{selected._table}</p></div>
                <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">{priceLabel(selected)}</p></div>
                {selected.location && <div className="col-span-2"><p className="text-xs text-muted-foreground">Location</p><p className="font-semibold">{selected.location}</p></div>}
                {selected.description && <div className="col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm leading-relaxed">{selected.description}</p></div>}
                {selected.bedrooms && <div><p className="text-xs text-muted-foreground">Bedrooms</p><p className="font-semibold">{selected.bedrooms}</p></div>}
                {selected.engine_cc && <div><p className="text-xs text-muted-foreground">Engine CC</p><p className="font-semibold">{selected.engine_cc}cc</p></div>}
              </div>

              {/* Provider */}
              <div className="p-3 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Provider</p>
                <p className="text-sm font-semibold">{selected.profiles?.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{selected.profiles?.phone ?? '—'}</p>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2 border-t">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Listing
                </Button>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setRevisionOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Request Revision
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject Listing
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve confirm */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve listing?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will make the listing live on the marketplace immediately.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approveMut.isPending}>
              {approveMut.isPending ? 'Approving…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Listing</DialogTitle></DialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger><SelectValue placeholder="Select rejection reason…" /></SelectTrigger>
            <SelectContent>{REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || rejectMut.isPending}>
              {rejectMut.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision modal */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Revision</DialogTitle></DialogHeader>
          <Textarea placeholder="Describe the specific changes needed…" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleRevision} disabled={!revisionNote || revisionMut.isPending}>
              {revisionMut.isPending ? 'Sending…' : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
