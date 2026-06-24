import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Wallet, TrendingUp, ShoppingBag, Hotel, Home, TreePine, Backpack, Bike, Car, Building2, Store } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const INR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; fill: string }> = {
  hotel: { label: 'Hotels', icon: Hotel, color: 'text-blue-600', fill: '#2563eb' },
  stay: { label: 'Stays', icon: Home, color: 'text-emerald-600', fill: '#10b981' },
  resort: { label: 'Resorts', icon: TreePine, color: 'text-teal-600', fill: '#0d9488' },
  experience: { label: 'Experiences', icon: Backpack, color: 'text-amber-600', fill: '#d97706' },
  bike: { label: 'Bikes', icon: Bike, color: 'text-rose-600', fill: '#e11d48' },
  car: { label: 'Cars', icon: Car, color: 'text-purple-600', fill: '#9333ea' },
  package: { label: 'Tour Packages', icon: Store, color: 'text-indigo-600', fill: '#4f46e5' },
};

export default function AdminListingRevenue() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-listing-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, listing_name, listing_type, total_amount, commission_amount, status, payment_status, created_at,
          host_id, host:profiles!bookings_host_id_fkey(full_name)
        `)
        .in('listing_type', ['hotel', 'stay', 'resort', 'experience', 'bike', 'car', 'package'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const bookingIds = (data || []).map(b => b.id);
      const { data: cabData } = await supabase.from('cab_bookings').select('booking_id').in('booking_id', bookingIds);
      const cabBookingIds = new Set((cabData || []).map(cb => cb.booking_id));
      
      return (data || []).filter(b => !cabBookingIds.has(b.id));
    }
  });

  const validBookings = useMemo(() => (bookings || []).filter(b => b.status === 'completed' || b.payment_status === 'completed'), [bookings]);

  const metrics = useMemo(() => {
    let totalRev = 0, totalComm = 0, totalHost = 0, totalHub = 0;
    const typeRevenues: Record<string, number> = {};
    const hostData: Record<string, { name: string; rev: number; bookings: number }> = {};
    const listingData: Record<string, { name: string; rev: number; bookings: number }> = {};
    const dateData: Record<string, number> = {};

    validBookings.forEach(b => {
      const amt = Number(b.total_amount || 0);
      const comm = Number(b.commission_amount || 0);
      const hub = Math.round(comm * 0.1); // Placeholder logic for hub earning
      const host = amt - comm;

      totalRev += amt;
      totalComm += comm;
      totalHost += host;
      totalHub += hub;

      const lType = b.listing_type || 'other';
      typeRevenues[lType] = (typeRevenues[lType] || 0) + amt;

      const hId = b.host_id || 'unknown';
      if (!hostData[hId]) hostData[hId] = { name: b.host?.full_name || 'Unknown', rev: 0, bookings: 0 };
      hostData[hId].rev += amt;
      hostData[hId].bookings += 1;

      const lName = b.listing_name || 'Unknown';
      if (!listingData[lName]) listingData[lName] = { name: lName, rev: 0, bookings: 0 };
      listingData[lName].rev += amt;
      listingData[lName].bookings += 1;

      const dateKey = b.created_at ? format(parseISO(b.created_at), 'yyyy-MM-dd') : 'Unknown';
      dateData[dateKey] = (dateData[dateKey] || 0) + amt;
    });

    const topHosts = Object.values(hostData).sort((a, b) => b.rev - a.rev).slice(0, 5);
    const topListings = Object.values(listingData).sort((a, b) => b.rev - a.rev).slice(0, 5);
    const chartData = Object.entries(dateData).sort((a, b) => a[0].localeCompare(b[0])).map(([date, revenue]) => ({ date: format(parseISO(date), 'dd MMM'), revenue }));
    
    const pieData = Object.entries(typeRevenues).map(([type, rev]) => ({
      name: TYPE_CONFIG[type]?.label || type,
      value: rev,
      fill: TYPE_CONFIG[type]?.fill || '#8884d8'
    }));

    return {
      totalRev, totalComm, totalHost, totalHub,
      totalBookings: validBookings.length,
      avgValue: validBookings.length ? totalRev / validBookings.length : 0,
      typeRevenues, topHosts, topListings, chartData, pieData
    };
  }, [validBookings]);

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-[#013220]" /> Listing Revenue
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide revenue analytics for marketplace listings.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Revenue', value: INR(metrics.totalRev), icon: Wallet, color: 'text-emerald-600' },
          { label: 'Total Bookings', value: metrics.totalBookings, icon: ShoppingBag, color: 'text-blue-600' },
          { label: 'Platform Comm.', value: INR(metrics.totalComm), icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Host Earnings', value: INR(metrics.totalHost), icon: Store, color: 'text-teal-600' },
          { label: 'Hub Earnings', value: INR(metrics.totalHub), icon: Building2, color: 'text-purple-600' },
          { label: 'Avg Booking Value', value: INR(metrics.avgValue), icon: TrendingUp, color: 'text-rose-600' },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-24">
              <c.icon className={`h-5 w-5 mb-1 ${c.color}`} />
              <h3 className="text-lg font-black leading-tight">{c.value}</h3>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-bold">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={metrics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                  <RechartsTooltip formatter={(v) => [INR(Number(v)), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">By Listing Type</CardTitle></CardHeader>
          <CardContent>
            {metrics.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {metrics.pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => [INR(Number(v)), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {metrics.pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Top Revenue Listings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Listing</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topListings.map(l => (
                  <TableRow key={l.name}>
                    <TableCell className="font-medium text-xs max-w-[150px] truncate">{l.name}</TableCell>
                    <TableCell className="text-right text-xs">{l.bookings}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-[#013220]">{INR(l.rev)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Top Revenue Hosts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Host</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topHosts.map(h => (
                  <TableRow key={h.name}>
                    <TableCell className="font-medium text-xs max-w-[150px] truncate">{h.name}</TableCell>
                    <TableCell className="text-right text-xs">{h.bookings}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-[#013220]">{INR(h.rev)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
