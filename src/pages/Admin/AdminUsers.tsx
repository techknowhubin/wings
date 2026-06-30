import { useState, useEffect } from 'react';
import { useAdminUsers } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const KYC_BADGE: Record<string, { label: string; className: string }> = {
  not_started: { label: 'No KYC', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  re_upload_requested: { label: 'Re-upload', className: 'bg-orange-100 text-orange-700' },
};

interface LiveWallet { balance: number; lifetime_earned: number; }

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const { data: users, isLoading } = useAdminUsers(kycFilter, search);

  // Live wallet updates via Supabase Realtime
  const [liveWallets, setLiveWallets] = useState<Map<string, LiveWallet>>(new Map());

  useEffect(() => {
    const channel = supabase
      .channel('admin-wallet-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (row?.user_id) {
            setLiveWallets(prev => {
              const next = new Map(prev);
              next.set(row.user_id, {
                balance: payload.new?.balance ?? 0,
                lifetime_earned: payload.new?.lifetime_earned ?? 0,
              });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Travelers</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all registered travelers.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email, or WingID…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={kycFilter} onValueChange={setKycFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="approved">KYC Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending KYC</TabsTrigger>
          <TabsTrigger value="no_kyc">No KYC</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={kycFilter} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Traveler</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Wing Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No travelers found.</TableCell></TableRow>
                    )}
                    {(users ?? []).map((u: any) => {
                      const badgeInfo = KYC_BADGE[u.kyc_status] ?? KYC_BADGE.not_started;
                      const live = liveWallets.get(u.id);
                      const balance = live?.balance ?? u.wing_credits ?? 0;
                      const earned = live?.lifetime_earned ?? u.wing_credits_earned ?? 0;
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-foreground shrink-0">
                                {u.full_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <p className="text-sm font-semibold">{u.full_name ?? '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs">{u.phone ?? '—'}</p>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${badgeInfo.className}`}>{badgeInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-amber-600">
                                  ₹{Number(balance).toLocaleString('en-IN')}
                                </p>
                                {earned > 0 && (
                                  <p className="text-[10px] text-muted-foreground leading-none">
                                    ₹{Number(earned).toLocaleString('en-IN')} earned
                                  </p>
                                )}
                              </div>
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
    </div>
  );
}
