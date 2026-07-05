import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search, Shield, ShieldCheck, ShieldX, Clock, ChevronLeft, ChevronRight, User
} from 'lucide-react';

const PAGE_SIZE = 15;

type TravellerKYCFull = {
  id: string;
  host_id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  aadhaar: string | null;
  pan: string | null;
  driving_licence: string | null;
  address: string | null;
  emergency_contact: Record<string, string>;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  host_name?: string;
};

const STATUS_BADGE: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  class: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  verified: { label: 'Verified', class: 'bg-green-100  text-green-800  border-green-200',  icon: ShieldCheck },
  rejected: { label: 'Rejected', class: 'bg-red-100    text-red-800    border-red-200',    icon: ShieldX },
};

function useTravellerKYCAdmin(search: string, statusFilter: string) {
  return useQuery({
    queryKey: ['admin-traveller-kyc', search, statusFilter],
    queryFn: async () => {
      // Admin gets full unmasked data via RPC
      const { data, error } = await (supabase as any).rpc('get_host_traveller_kyc');
      if (error) throw error;

      // Fetch host names
      const records = (data ?? []) as TravellerKYCFull[];
      const hostIds = [...new Set(records.map(r => r.host_id))];
      let hostMap: Record<string, string> = {};
      if (hostIds.length) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name')
          .in('id', hostIds);
        (profiles ?? []).forEach((p: any) => { hostMap[p.id] = p.full_name; });
      }

      return records
        .map(r => ({ ...r, host_name: hostMap[r.host_id] ?? '—' }))
        .filter((r) => {
          if (statusFilter !== 'all' && r.verification_status !== statusFilter) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              r.full_name.toLowerCase().includes(q) ||
              r.mobile.includes(q) ||
              (r.email ?? '').toLowerCase().includes(q) ||
              (r.aadhaar ?? '').includes(q) ||
              (r.pan ?? '').toUpperCase().includes(q.toUpperCase()) ||
              (r.host_name ?? '').toLowerCase().includes(q)
            );
          }
          return true;
        });
    },
    staleTime: 30_000,
  });
}

export default function AdminTravellerKYC() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TravellerKYCFull | null>(null);

  const { data: records = [], isLoading } = useTravellerKYCAdmin(search, statusFilter);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).rpc('admin_update_traveller_kyc_status', {
        p_kyc_id: id,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`KYC marked as ${status}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-traveller-kyc'] });
      setSelected(prev => prev ? { ...prev, verification_status: status as any } : null);
    },
    onError: (e: any) => toast.error(e.message ?? 'Update failed'),
  });

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const paginated = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    pending:  records.filter(r => r.verification_status === 'pending').length,
    verified: records.filter(r => r.verification_status === 'verified').length,
    rejected: records.filter(r => r.verification_status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Traveller KYC Records</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete KYC submissions from travellers across all host QR codes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: records.length, icon: Shield, color: 'text-primary' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-yellow-600' },
          { label: 'Verified', value: counts.verified, icon: ShieldCheck, color: 'text-green-600' },
          { label: 'Rejected', value: counts.rejected, icon: ShieldX, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-black mt-0.5">{value}</p>
              </div>
              <Icon className={`h-8 w-8 opacity-20 ${color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, Aadhaar, PAN, host…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-10 w-40 rounded-xl">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Traveller</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Aadhaar</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead>Driving Licence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No KYC records found.
                        </TableCell>
                      </TableRow>
                    )}
                    {paginated.map((kyc) => {
                      const badge = STATUS_BADGE[kyc.verification_status];
                      const Icon = badge?.icon ?? Clock;
                      return (
                        <TableRow key={kyc.id} className="cursor-pointer" onClick={() => setSelected(kyc)}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-semibold">{kyc.full_name}</p>
                              <p className="text-xs text-muted-foreground">{kyc.email || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{kyc.host_name}</TableCell>
                          <TableCell className="font-mono text-sm">{kyc.mobile}</TableCell>
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
                            {formatDistanceToNow(new Date(kyc.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, records.length)} of {records.length}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selected?.full_name}
            </SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-5">
              {/* Status Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Verification Status:</span>
                {(['pending', 'verified', 'rejected'] as const).map((s) => {
                  const b = STATUS_BADGE[s];
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={selected.verification_status === s ? 'default' : 'outline'}
                      className={`h-7 text-xs rounded-lg ${selected.verification_status === s ? '' : b.class}`}
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                    >
                      {b.label}
                    </Button>
                  );
                })}
              </div>

              {/* Personal Info */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Information</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Full Name', value: selected.full_name },
                    { label: 'Mobile', value: selected.mobile },
                    { label: 'Email', value: selected.email },
                    { label: 'Address', value: selected.address, full: true },
                  ].map(({ label, value, full }) => (
                    <div key={label} className={full ? 'col-span-2' : ''}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ID Documents */}
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
              </div>

              {/* Emergency Contact */}
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

              {/* Metadata */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Record Metadata</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-medium">{selected.host_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{format(new Date(selected.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
