import { useState } from 'react';
import { useAdminProviders, useApproveHost, useRejectHost } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Store, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
};

export default function AdminProviders() {
  const [search, setSearch] = useState('');
  const { data: providers, isLoading } = useAdminProviders(search);
  const approveHost = useApproveHost();
  const rejectHost = useRejectHost();

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveHost.mutateAsync(id);
      toast.success(`${name || 'Host'} approved — they can now create listings.`);
    } catch {
      toast.error('Failed to approve host.');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Providers</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and approve host profiles before they can create listings.</p>
        </div>
      </div>

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
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              disabled={approveHost.isPending}
                              onClick={() => handleApprove(p.id, p.full_name)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              disabled={rejectHost.isPending}
                              onClick={() => handleReject(p.id, p.full_name)}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : status === 'approved' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            disabled={rejectHost.isPending}
                            onClick={() => handleReject(p.id, p.full_name)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                            disabled={approveHost.isPending}
                            onClick={() => handleApprove(p.id, p.full_name)}
                          >
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
