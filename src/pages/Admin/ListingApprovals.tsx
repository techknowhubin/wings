import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminPendingListings, useApproveListing, useRejectListing, useRequestRevision, useDeleteListing } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useUpdateMarketplaceVisibility } from '@/hooks/useListings';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, RefreshCw, Trash2, CheckSquare, X } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  stays:       'bg-blue-100 text-blue-700',
  hotels:      'bg-purple-100 text-purple-700',
  resorts:     'bg-emerald-100 text-emerald-700',
  cars:        'bg-amber-100 text-amber-700',
  bikes:       'bg-orange-100 text-orange-700',
  experiences: 'bg-pink-100 text-pink-700',
};

const APPROVAL_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:        { label: 'Pending',        className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:       { label: 'Approved',       className: 'bg-green-100 text-green-700 border-green-200' },
  rejected:       { label: 'Rejected',       className: 'bg-red-100 text-red-700 border-red-200' },
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

// Composite key for uniquely identifying a listing across tables
const rowKey = (l: any) => `${l._table}:${l.id}`;

const getListingTypeFromTable = (table: string): any => {
  if (table === 'stays') return 'stay';
  if (table === 'cars') return 'car';
  if (table === 'bikes') return 'bike';
  if (table === 'experiences') return 'experience';
  if (table === 'hotels') return 'hotel';
  if (table === 'resorts') return 'resort';
  return table;
};

export default function ListingApprovals() {
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const queryClient = useQueryClient();
  const updateMarketplaceVisibility = useUpdateMarketplaceVisibility();

  // Single-item review state
  const [selected, setSelected] = useState<any>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Bulk selection state
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { data: listings, isLoading } = useAdminPendingListings(tab);
  const approveMut = useApproveListing();
  const rejectMut  = useRejectListing();
  const revisionMut = useRequestRevision();
  const deleteMut  = useDeleteListing();

  const filtered = useMemo(
    () => tab === 'all' ? (listings ?? []) : (listings ?? []).filter((l: any) => l._table === tab),
    [listings, tab]
  );

  const typeCount = (type: string) => (listings ?? []).filter((l: any) => l._table === type).length;

  // Derived bulk helpers
  const allChecked  = filtered.length > 0 && filtered.every((l: any) => checkedKeys.has(rowKey(l)));
  const someChecked = filtered.some((l: any) => checkedKeys.has(rowKey(l)));
  const checkedItems = filtered.filter((l: any) => checkedKeys.has(rowKey(l)));

  function toggleAll() {
    if (allChecked) {
      const next = new Set(checkedKeys);
      filtered.forEach((l: any) => next.delete(rowKey(l)));
      setCheckedKeys(next);
    } else {
      const next = new Set(checkedKeys);
      filtered.forEach((l: any) => next.add(rowKey(l)));
      setCheckedKeys(next);
    }
  }

  function toggleRow(l: any) {
    const key = rowKey(l);
    const next = new Set(checkedKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    setCheckedKeys(next);
  }

  function clearSelection() {
    setCheckedKeys(new Set());
  }

  // Tab change clears selection
  function handleTabChange(value: string) {
    setTab(value);
    clearSelection();
  }

  // ── Single-item handlers ──────────────────────────────────────────────────
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync({ id: deleteTarget.id, table: deleteTarget._table });
    toast({ title: 'Listing permanently deleted.', variant: 'destructive' });
    setDeleteOpen(false);
    setDeleteTarget(null);
    setSelected(null);
  };

  const handleRevision = async () => {
    if (!selected || !revisionNote) return;
    await revisionMut.mutateAsync({ id: selected.id, table: selected._table, reason: revisionNote });
    toast({ title: 'Revision requested. Host has been notified.', className: 'border-orange-200 bg-orange-50 text-orange-800' });
    setRevisionOpen(false);
    setSelected(null);
  };

  // ── Bulk handlers ─────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    for (const item of checkedItems) {
      try {
        await approveMut.mutateAsync({ id: item.id, table: item._table });
        successCount++;
      } catch { /* skip failed items */ }
    }
    setBulkProcessing(false);
    setBulkApproveOpen(false);
    clearSelection();
    toast({ title: `${successCount} listing${successCount !== 1 ? 's' : ''} approved and now live.`, className: 'border-green-200 bg-green-50 text-green-800' });
  };

  const handleBulkDelete = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    for (const item of checkedItems) {
      try {
        await deleteMut.mutateAsync({ id: item.id, table: item._table });
        successCount++;
      } catch { /* skip failed items */ }
    }
    setBulkProcessing(false);
    setBulkDeleteOpen(false);
    clearSelection();
    toast({ title: `${successCount} listing${successCount !== 1 ? 's' : ''} permanently deleted.`, variant: 'destructive' });
  };

  const priceLabel = (listing: any) => {
    if (listing.price_per_night)  return `₹${Number(listing.price_per_night).toLocaleString('en-IN')}/night`;
    if (listing.price_per_day)    return `₹${Number(listing.price_per_day).toLocaleString('en-IN')}/day`;
    if (listing.price_per_person) return `₹${Number(listing.price_per_person).toLocaleString('en-IN')}/person`;
    return '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Listing Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve provider submissions before they go live.</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
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
            {/* ── Bulk action bar ─────────────────────────────────────────── */}
            {someChecked && (
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-border rounded-t-xl">
                <span className="text-sm font-semibold text-foreground">
                  {checkedItems.length} selected
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white h-8 gap-1.5"
                    onClick={() => setBulkApproveOpen(true)}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 gap-1.5"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground gap-1"
                    onClick={clearSelection}
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                </div>
              </div>
            )}

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Select-all checkbox */}
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                          className="data-[state=indeterminate]:bg-primary"
                          data-state={allChecked ? 'checked' : someChecked ? 'indeterminate' : 'unchecked'}
                        />
                      </TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                          No listings to review.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((l: any) => {
                      const badge = APPROVAL_STATUS_BADGE[l.approval_status];
                      const isChecked = checkedKeys.has(rowKey(l));
                      return (
                        <TableRow
                          key={rowKey(l)}
                          className={isChecked ? 'bg-primary/5' : ''}
                        >
                          {/* Row checkbox */}
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleRow(l)}
                              aria-label="Select row"
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium">{l.profiles?.full_name ?? '—'}</TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold max-w-[160px] truncate">{l.title ?? `${l.make} ${l.model}`}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] capitalize ${TYPE_COLORS[l._table] ?? ''}`}>{l._table}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{priceLabel(l)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.location ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {l.submitted_for_review_at
                              ? formatDistanceToNow(new Date(l.submitted_for_review_at), { addSuffix: true })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${badge?.className}`}>{badge?.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={l.marketplace_visible ?? false}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await updateMarketplaceVisibility.mutateAsync({
                                      listingType: getListingTypeFromTable(l._table),
                                      listingId: l.id,
                                      marketplaceVisible: checked,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
                                    toast({
                                      title: checked ? 'Listing is now visible in users marketplace.' : 'Listing removed from marketplace.',
                                      className: 'border-green-200 bg-green-50 text-green-800',
                                    });
                                  } catch (err: any) {
                                    toast({
                                      title: 'Failed to update marketplace visibility.',
                                      description: err.message,
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              />
                              {l.marketplace_requested && !l.marketplace_visible && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] px-1 py-0 scale-90">
                                  Requested
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setSelected(l)}>Review</Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                                title="Delete listing"
                                onClick={() => { setDeleteTarget(l); setDeleteOpen(true); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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

      {/* ── Single Review Drawer ────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.title ?? `${selected?.make} ${selected?.model}`}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-6">
              {selected.images?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selected.images.slice(0, 6).map((img: string, i: number) => (
                    <img key={i} src={img} alt={`img-${i}`} className="h-36 w-auto rounded-lg border object-cover shrink-0" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Category</p><p className="font-semibold capitalize">{selected._table}</p></div>
                <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">{priceLabel(selected)}</p></div>
                {selected.location    && <div className="col-span-2"><p className="text-xs text-muted-foreground">Location</p><p className="font-semibold">{selected.location}</p></div>}
                {selected.description && <div className="col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm leading-relaxed">{selected.description}</p></div>}
                {selected.bedrooms    && <div><p className="text-xs text-muted-foreground">Bedrooms</p><p className="font-semibold">{selected.bedrooms}</p></div>}
                {selected.engine_cc   && <div><p className="text-xs text-muted-foreground">Engine CC</p><p className="font-semibold">{selected.engine_cc}cc</p></div>}
              </div>
              <div className="p-3 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Provider</p>
                <p className="text-sm font-semibold">{selected.profiles?.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{selected.profiles?.phone ?? '—'}</p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Marketplace Visibility</p>
                  <p className="text-xs text-muted-foreground">Show this listing in the travelers marketplace</p>
                  {selected.marketplace_requested && (
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">⚠️ Host requested marketplace listing</p>
                  )}
                </div>
                <Switch
                  checked={selected.marketplace_visible ?? false}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateMarketplaceVisibility.mutateAsync({
                        listingType: getListingTypeFromTable(selected._table),
                        listingId: selected.id,
                        marketplaceVisible: checked,
                      });
                      setSelected((prev: any) => prev ? { 
                        ...prev, 
                        marketplace_visible: checked,
                        approval_status: checked ? 'approved' : prev.approval_status,
                        is_verified: checked ? true : prev.is_verified,
                        rejection_reason: checked ? null : prev.rejection_reason,
                      } : null);
                      toast({
                        title: checked ? 'Listing is now visible in users marketplace.' : 'Listing removed from marketplace.',
                        className: 'border-green-200 bg-green-50 text-green-800',
                      });
                    } catch (err: any) {
                      toast({
                        title: 'Failed to update marketplace status.',
                        description: err.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              </div>

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
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                  onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Single-item dialogs ─────────────────────────────────────────────── */}
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

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete listing permanently?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {deleteTarget?.title ?? `${deleteTarget?.make} ${deleteTarget?.model}`}
            </span>{' '}
            will be permanently removed from the database. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMut.isPending ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk action dialogs ─────────────────────────────────────────────── */}
      <Dialog open={bulkApproveOpen} onOpenChange={setBulkApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve {checkedItems.length} listings?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            All {checkedItems.length} selected listings will be made live on the marketplace immediately.
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2 space-y-1">
            {checkedItems.map((l: any) => (
              <p key={rowKey(l)} className="text-xs text-foreground truncate">
                • {l.title ?? `${l.make} ${l.model}`}
                <span className="text-muted-foreground ml-1 capitalize">({l._table})</span>
              </p>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkApproveOpen(false)} disabled={bulkProcessing}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleBulkApprove} disabled={bulkProcessing}>
              <CheckSquare className="h-4 w-4 mr-2" />
              {bulkProcessing ? 'Approving…' : `Approve ${checkedItems.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {checkedItems.length} listings permanently?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            These listings will be permanently removed from the database. This cannot be undone.
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-red-50 p-2 space-y-1">
            {checkedItems.map((l: any) => (
              <p key={rowKey(l)} className="text-xs text-red-700 truncate">
                • {l.title ?? `${l.make} ${l.model}`}
                <span className="text-red-400 ml-1 capitalize">({l._table})</span>
              </p>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkProcessing}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkProcessing}>
              <Trash2 className="h-4 w-4 mr-2" />
              {bulkProcessing ? 'Deleting…' : `Delete ${checkedItems.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
