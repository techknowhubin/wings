import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Download, TrendingUp, IndianRupee, Coins, Calendar, BarChart2,
  CheckCircle, Clock, Loader2, FileText, ArrowUpRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type Period = 'daily' | 'weekly' | 'monthly' | 'annual';

const PERIOD_LABELS: Record<Period, string> = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', annual: 'This Year' };

const COLORS = ['hsl(68 90% 65%)', 'hsl(158 60% 50%)', 'hsl(220 70% 60%)'];

export default function HubEarnings() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['hub-earnings', uuid, period],
    enabled: !!uuid,
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      if (period === 'daily') startDate = new Date(now.toDateString());
      else if (period === 'weekly') startDate = subDays(now, 7);
      else if (period === 'monthly') startDate = startOfMonth(now);
      else startDate = new Date(now.getFullYear(), 0, 1);

      const { data: bookings } = await supabase
        .from('cab_bookings')
        .select('fare_amount, booking_status, payment_status, created_at, trip_status')
        .eq('assigned_hub_uuid', uuid)
        .gte('created_at', startDate.toISOString());

      const all = bookings || [];
      const completed = all.filter(b => b.booking_status === 'Completed' || b.trip_status === 'Trip Completed');
      const pending = all.filter(b => b.payment_status === 'pending' && b.booking_status !== 'Cancelled');
      const cancelled = all.filter(b => b.booking_status === 'Cancelled');

      const totalRevenue = completed.reduce((s, b) => s + (b.fare_amount || 0), 0);
      const hubEarnings = totalRevenue * 0.05;
      const platformEarnings = totalRevenue * 0.02;
      const pendingAmount = pending.reduce((s, b) => s + (b.fare_amount || 0) * 0.05, 0);

      // Monthly revenue for last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(now, i));
        const mEnd = endOfMonth(subMonths(now, i));
        const { data: mBookings } = await supabase
          .from('cab_bookings')
          .select('fare_amount, booking_status')
          .eq('assigned_hub_uuid', uuid)
          .gte('created_at', mStart.toISOString())
          .lte('created_at', mEnd.toISOString());
        const mRev = (mBookings || []).filter(b => b.booking_status === 'Completed').reduce((s, b) => s + (b.fare_amount || 0), 0);
        monthlyData.push({ name: format(mStart, 'MMM'), revenue: mRev, commission: mRev * 0.05 });
      }

      // Recent settlements (recent completed bookings)
      const { data: recent } = await supabase
        .from('cab_bookings')
        .select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(full_name)`)
        .eq('assigned_hub_uuid', uuid)
        .eq('booking_status', 'Completed')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        totalRevenue,
        hubEarnings,
        platformEarnings,
        pendingAmount,
        totalBookings: all.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        monthlyData,
        recentSettlements: recent || [],
        pieData: [
          { name: 'Hub (5%)', value: hubEarnings },
          { name: 'Platform (2%)', value: platformEarnings },
          { name: 'Host (93%)', value: totalRevenue * 0.93 },
        ].filter(d => d.value > 0),
      };
    }
  });

  const kpis = [
    { label: 'Total Revenue', value: `₹${((analytics?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', sub: 'Gross cab fares' },
    { label: 'Hub Earnings (5%)', value: `₹${((analytics?.hubEarnings || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', sub: 'Your commission' },
    { label: 'Platform Fee (2%)', value: `₹${((analytics?.platformEarnings || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', sub: 'Xplorwing platform' },
    { label: 'Pending Settlement', value: `₹${((analytics?.pendingAmount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', sub: 'Awaiting payment' },
    { label: 'Completed Trips', value: analytics?.completedBookings || 0, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', sub: 'In selected period' },
    { label: 'Cancelled Trips', value: analytics?.cancelledBookings || 0, icon: BarChart2, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', sub: 'Revenue lost' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Earnings & Settlements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hub financial dashboard and revenue analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <FileText className="h-4 w-4" /> PDF Report
          </Button>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((k, i) => (
              <div key={i} className={`rounded-xl p-4 border border-border/30 ${k.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{k.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Revenue Bar Chart */}
            <Card className="xl:col-span-2 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Monthly Revenue & Commission</CardTitle>
                <CardDescription className="text-xs">Last 6 months performance</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.monthlyData || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number, name: string) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, name]}
                      contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Gross Revenue" />
                    <Bar dataKey="commission" fill="hsl(68 90% 65%)" radius={[4, 4, 0, 0]} name="Hub Commission" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Split Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Revenue Split</CardTitle>
                <CardDescription className="text-xs">How fare is distributed</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px] pt-0 flex flex-col items-center justify-center">
                {(analytics?.pieData || []).length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={analytics?.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                          {(analytics?.pieData || []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 w-full">
                      {(analytics?.pieData || []).map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold">₹{d.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No completed bookings yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Settlements */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Recent Settlements</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {['Trip ID', 'Traveller', 'Route', 'Fare', 'Hub Commission (5%)', 'Date', 'Status'].map(h => (
                      <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.recentSettlements?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">No completed trips yet</TableCell></TableRow>
                  ) : (
                    analytics?.recentSettlements?.map((b: any) => (
                      <TableRow key={b.booking_id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground">#{b.booking_id?.slice(-8).toUpperCase()}</TableCell>
                        <TableCell className="text-sm font-semibold">{b.traveller?.full_name || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.pickup_location} → {b.drop_location}</TableCell>
                        <TableCell className="font-semibold text-sm">₹{(b.fare_amount || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="font-semibold text-sm text-emerald-600">
                          ₹{((b.fare_amount || 0) * 0.05).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.created_at ? format(new Date(b.created_at), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {b.payment_status === 'paid' ? 'Cleared' : 'Pending'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
