import { useAdminMetrics, useAdminRecentBookings } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, BookOpen, Users, Wallet, ShieldCheck, CheckSquare,
  UserCheck, Award, Clock, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const INR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function MetricCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-black tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusVariant: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
  completed: 'outline',
};

export default function AdminOverview() {
  const { data: metrics, isLoading: mLoading } = useAdminMetrics();
  const { data: recentBookings, isLoading: bLoading } = useAdminRecentBookings();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time snapshot of Xplorwing's performance.</p>
      </div>

      {/* Metric Cards */}
      {mLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total GMV" value={INR(metrics?.totalGmv ?? 0)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-600" sub="All-time paid bookings" />
          <MetricCard label="Bookings Today" value={metrics?.todayBookings ?? 0} icon={BookOpen} color="bg-blue-500/10 text-blue-600" />
          <MetricCard label="Active Providers" value={metrics?.activeProviders ?? 0} icon={Users} color="bg-purple-500/10 text-purple-600" />
          <MetricCard label="Platform Revenue" value={INR(metrics?.platformRevenue ?? 0)} icon={Wallet} color="bg-amber-500/10 text-amber-600" sub="Commission earned" />
          <MetricCard label="Pending KYC" value={metrics?.pendingKyc ?? 0} icon={ShieldCheck} color="bg-orange-500/10 text-orange-600" sub="Awaiting review" />
          <MetricCard label="Pending Listings" value={metrics?.pendingListings ?? 0} icon={CheckSquare} color="bg-red-500/10 text-red-600" sub="Awaiting approval" />
          <MetricCard label="Registered Travelers" value={metrics?.registeredTravelers ?? 0} icon={UserCheck} color="bg-teal-500/10 text-teal-600" />
          <MetricCard label="WingIDs Issued" value={metrics?.wingIdsIssued ?? 0} icon={Award} color="bg-[#013220]/10 text-[#013220]" sub="KYC verified users" />
        </div>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/bookings">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {bLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Traveler</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentBookings ?? []).slice(0, 8).map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-medium">{b.profiles?.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{b.listing_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{INR(Number(b.total_amount))}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[b.status] ?? 'outline'} className="text-[10px] capitalize">{b.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Actions</CardTitle>
            <CardDescription>Items needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics?.pendingKyc ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold">{metrics.pendingKyc} KYC Submissions</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Awaiting review</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild className="text-orange-600 border-orange-300">
                  <Link to="/admin/kyc">Review</Link>
                </Button>
              </div>
            ) : null}
            {metrics?.pendingListings ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold">{metrics.pendingListings} Listing Approvals</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Provider submissions</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild className="text-blue-600 border-blue-300">
                  <Link to="/admin/listings">Review</Link>
                </Button>
              </div>
            ) : null}
            {!metrics?.pendingKyc && !metrics?.pendingListings && (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <CheckSquare className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs">No pending actions at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
