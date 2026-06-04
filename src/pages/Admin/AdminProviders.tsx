import { useState } from 'react';
import { useAdminProviders, useApproveHost, useRejectHost, useListingTypeRequests, useApproveListingTypeRequest, useRejectListingTypeRequest } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Store, CheckCircle2, XCircle, Clock, Home, Building, Palmtree, Car, Bike, Compass, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
};

const LISTING_TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  stays:       { label: 'Home Stays',           icon: Home },
  hotels:      { label: 'Hotels',               icon: Building },
  resorts:     { label: 'Resorts',              icon: Palmtree },
  cars:        { label: 'Car Rentals / Cabs',   icon: Car },
  bikes:       { label: 'Bike Rentals',         icon: Bike },
  experiences: { label: 'Packages/Experiences', icon: Compass },
};

function ProvidersTab() {
  const [search, setSearch] = useState('');
  const { data: providers, isLoading } = useAdminProviders(search);
  const approveHost = useApproveHost();
  const rejectHost = useRejectHost();

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveHost.mutateAsync(id);
      toast.success(`${name || 'Host'} approved — they can now create listings.`);
    } catch (error: any) {
      toast.error(`Failed to approve host: ${error?.message || JSON.stringify(error) || 'Unknown error'}`);
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await rejectHost.mutateAsync(id);
      toast.error(`${name || 'Host'} rejected.`);
    } catch {
      toast.error('Failed to reject host.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, business, or phone…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No providers found.</TableCell></TableRow>
                )}
                {(providers ?? []).map((p: any) => {
                  const status = p.onboarding_status ?? 'pending';
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  const isPending = status === 'pending';

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#013220]/10 text-[#013220] flex items-center justify-center font-bold text-sm shrink-0">
                            {p.full_name?.[0]?.toUpperCase() ?? <Store className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{p.full_name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">{p.phone ?? '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{p.business_name ?? '—'}</p>
                        {p.service_types?.length > 0 && (
                          <p className="text-xs text-muted-foreground">{p.service_types.slice(0, 2).join(', ')}{p.service_types.length > 2 ? ` +${p.service_types.length - 2}` : ''}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] flex items-center gap-1 w-fit ${cfg.className}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={approveHost.isPending} onClick={() => handleApprove(p.id, p.full_name)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={rejectHost.isPending} onClick={() => handleReject(p.id, p.full_name)}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : status === 'approved' ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={rejectHost.isPending} onClick={() => handleReject(p.id, p.full_name)}>
                            Revoke
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={approveHost.isPending} onClick={() => handleApprove(p.id, p.full_name)}>
                            Re-approve
                          </Button>
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
    </div>
  );
}

function ListingRequestsTab() {
  const [filter, setFilter] = useState('pending');
  const { data: requests, isLoading } = useListingTypeRequests(filter);
  const approveMut = useApproveListingTypeRequest();
  const rejectMut = useRejectListingTypeRequest();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async (id: string, hostName: string, typeName: string) => {
    try {
      await approveMut.mutateAsync(id);
      toast.success(`${typeName} approved for ${hostName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      await rejectMut.mutateAsync({ requestId: rejectDialog.id, notes: rejectNotes });
      toast.success('Request rejected.');
      setRejectDialog(null);
      setRejectNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject request');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className="h-8 text-xs capitalize" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead>Requested Type</TableHead>
                  <TableHead>Note from Host</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No requests found.</TableCell></TableRow>
                )}
                {(requests ?? []).map((req: any) => {
                  const meta = LISTING_TYPE_META[req.requested_type] ?? { label: req.requested_type, icon: FileText };
                  const TypeIcon = meta.icon;
                  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold">{req.host_name}</p>
                          {req.host_phone && <p className="text-xs text-muted-foreground">{req.host_phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{meta.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground line-clamp-2">{req.host_note || '—'}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] flex items-center gap-1 w-fit ${cfg.className}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={approveMut.isPending} onClick={() => handleApprove(req.id, req.host_name, meta.label)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={rejectMut.isPending} onClick={() => { setRejectDialog({ open: true, id: req.id, name: `${req.host_name} — ${meta.label}` }); setRejectNotes(''); }}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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

      <Dialog open={!!rejectDialog?.open} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>{rejectDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Reason for rejection (optional, visible to host)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" disabled={rejectMut.isPending} onClick={handleReject}>
                {rejectMut.isPending ? 'Rejecting…' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminProviders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Providers</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage host profiles and listing type expansion requests.</p>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="mb-4">
          <TabsTrigger value="providers">Hosts</TabsTrigger>
          <TabsTrigger value="requests">Listing Type Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="requests">
          <ListingRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
