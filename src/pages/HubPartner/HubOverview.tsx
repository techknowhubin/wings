import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car, CalendarCheck, Users, Building, MapPin, IndianRupee,
  TrendingUp, Clock, CheckCircle, AlertCircle, PhoneIncoming,
  ArrowRight, Star, ShoppingBag, HeadphonesIcon, Loader2,
  Activity, ChevronRight
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import React from "react";

// ─── KPI Card ────────────────────────────────────────────────
function KPICard({
  label, value, icon: Icon, color, bgColor, sub, trend
}: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; bgColor: string; sub?: string; trend?: string;
}) {
  return (
    <Card className="border-border/50 hover-lift transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
            <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />{trend}
              </p>
            )}
          </div>
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Confirmed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Awaiting Hub Partner Assignment': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Completed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'Cancelled': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    'Driver Assigned': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'En Route': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Trip Started': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="p-8 text-destructive text-sm">Something went wrong loading this section.</div>;
    return this.props.children;
  }
}

function HubOverviewContent() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const baseUrl = `/hub/${uuid}`;

  // Hub details
  const { data: hub } = useQuery({
    queryKey: ['hub-details', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await supabase.from('hubs').select('*').eq('uuid', uuid).maybeSingle();
      return data;
    }
  });

  // Booking stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['hub-overview-stats', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: hubData } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      const profileId = hubData?.id;

      const [
        { data: allBookings },
        { count: todayCount },
        { count: activeDrivers },
        { count: hostCount },
        listingCounts,
        { count: travellerCount },
        { data: recentBookings },
      ] = await Promise.all([
        supabase.from('cab_bookings').select('fare_amount, booking_status, created_at, trip_status').eq('hub_partner_id', profileId),
        supabase.from('cab_bookings').select('*', { count: 'exact', head: true }).eq('hub_partner_id', profileId).gte('created_at', todayStart),
        supabase.from('hub_drivers').select('*', { count: 'exact', head: true }).eq('hub_uuid', uuid).eq('status', 'active'),
        // Hosts = user_roles rows with role='host'
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'host'),
        // Listings = sum counts from existing listing tables
        Promise.all([
          supabase.from('stays').select('*', { count: 'exact', head: true }),
          supabase.from('experiences').select('*', { count: 'exact', head: true }),
          supabase.from('cars').select('*', { count: 'exact', head: true }),
          supabase.from('bikes').select('*', { count: 'exact', head: true }),
        ]),
        // Travellers = user_roles rows with role='user'
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('cab_bookings')
          .select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)`)
          .eq('hub_partner_id', profileId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const bookings = allBookings || [];
      const monthlyRevenue = bookings.filter(b => b.created_at >= monthStart && b.booking_status !== 'Cancelled')
        .reduce((sum, b) => sum + (b.fare_amount || 0), 0);
      const activeTrips = bookings.filter(b => ['Driver Assigned', 'En Route', 'Trip Started'].includes(b.trip_status || '')).length;
      const pendingApprovals = bookings.filter(b => ['Pending', 'Awaiting Hub Partner Assignment'].includes(b.booking_status || '')).length;

      // Sum up all listing counts
      const totalListings = (listingCounts as any[]).reduce((sum, r) => sum + (r.count || 0), 0);
      // Chart data — last 7 days
      const chartMap = new Map<string, { name: string; revenue: number; bookings: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        chartMap.set(format(d, 'yyyy-MM-dd'), { name: format(d, 'EEE'), revenue: 0, bookings: 0 });
      }
      bookings.forEach(b => {
        const key = format(new Date(b.created_at), 'yyyy-MM-dd');
        if (chartMap.has(key) && b.booking_status !== 'Cancelled') {
          const entry = chartMap.get(key)!;
          entry.revenue += b.fare_amount || 0;
          entry.bookings += 1;
        }
      });

      return {
        todayBookings: todayCount || 0,
        activeTrips,
        activeDrivers: activeDrivers || 0,
        hostCount: hostCount || 0,
        listingCount: totalListings,
        travellerCount: travellerCount || 0,
        totalBookings: bookings.length,
        pendingApprovals,
        recentBookings: recentBookings || [],
        chartData: Array.from(chartMap.values()),
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: "Bookings Today", value: stats?.todayBookings ?? 0, icon: CalendarCheck, color: "text-blue-600", bgColor: "bg-blue-500/10", sub: "Total cab bookings" },
    { label: "Active Trips", value: stats?.activeTrips ?? 0, icon: Car, color: "text-purple-600", bgColor: "bg-purple-500/10", sub: "Currently on road" },
    { label: "Active Drivers", value: stats?.activeDrivers ?? 0, icon: Users, color: "text-emerald-600", bgColor: "bg-emerald-500/10", sub: "Available for trips" },
    { label: "Total Listings", value: stats?.listingCount ?? 0, icon: Building, color: "text-amber-600", bgColor: "bg-amber-500/10", sub: "Stays, hotels, etc." },
    { label: "Registered Travellers", value: stats?.travellerCount ?? 0, icon: MapPin, color: "text-rose-600", bgColor: "bg-rose-500/10", sub: "Platform users" },
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: CalendarCheck, color: "text-teal-600", bgColor: "bg-teal-500/10", sub: "All time cab bookings" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {hub?.hub_name || 'Hub Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operations Command Center
            {hub?.district && ` · ${hub.district}`}
            {hub?.area && `, ${hub.area}`}
          </p>
        </div>
        {stats?.pendingApprovals && stats.pendingApprovals > 0 ? (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {stats.pendingApprovals} booking{stats.pendingApprovals > 1 ? 's' : ''} need attention
            </span>
            <Button size="sm" variant="ghost" className="h-7 text-amber-600 hover:text-amber-700 px-2 text-xs"
              onClick={() => navigate(`${baseUrl}/booking-requests`)}>
              View <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k, i) => <KPICard key={i} {...k} />)}
      </div>

      {/* Revenue Chart + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Revenue Overview</CardTitle>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
          </CardHeader>
          <CardContent className="h-[220px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(68 90% 70%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(68 90% 70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(68 90% 65%)" strokeWidth={2.5} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {[
              { label: 'View Booking Requests', to: `${baseUrl}/booking-requests`, icon: CalendarCheck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Outstation Cabs', to: `${baseUrl}/outstation-cabs`, icon: Car, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Walk-In Enquiry', to: `${baseUrl}/walkin-enquiries`, icon: PhoneIncoming, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Marketplace Bookings', to: `${baseUrl}/marketplace-bookings`, icon: ShoppingBag, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Traveller Assistance', to: `${baseUrl}/traveller-assistance`, icon: HeadphonesIcon, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
              { label: 'Earnings & Settlements', to: `${baseUrl}/earnings`, icon: IndianRupee, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            ].map((a, i) => (
              <button
                key={i}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors group text-left"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">{a.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">Recent Booking Requests</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7"
              onClick={() => navigate(`${baseUrl}/booking-requests`)}>
              View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {(stats?.recentBookings?.length ?? 0) === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent bookings</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {stats?.recentBookings?.map((b: any) => (
                <div key={b.booking_id} className="flex items-center gap-3 py-3">
                  <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {b.traveller?.full_name || 'Unknown Traveller'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.pickup_location} → {b.drop_location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={b.booking_status || 'Pending'} />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ₹{(b.fare_amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HubOverview() {
  return (
    <ErrorBoundary>
      <HubOverviewContent />
    </ErrorBoundary>
  );
}
