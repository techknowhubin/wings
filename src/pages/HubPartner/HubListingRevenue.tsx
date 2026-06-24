import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, TrendingUp, ShoppingBag, Store, Building2, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const INR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const TYPE_CONFIG: Record<string, { label: string; fill: string }> = {
  hotel: { label: 'Hotels', fill: '#2563eb' },
  stay: { label: 'Stays', fill: '#10b981' },
  resort: { label: 'Resorts', fill: '#0d9488' },
  experience: { label: 'Experiences', fill: '#d97706' },
  bike: { label: 'Bikes', fill: '#e11d48' },
  car: { label: 'Cars', fill: '#9333ea' },
  package: { label: 'Tour Packages', fill: '#4f46e5' },
};

export default function HubListingRevenue() {
  const { uuid } = useParams<{ uuid: string }>();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-listing-revenue', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, listing_name, listing_type, total_amount, commission_amount, status, payment_status, created_at,
          host_id, host:profiles!bookings_host_id_fkey(full_name)
        `)
        .in('listing_type', ['hotel', 'stay', 'resort', 'experience', 'bike', 'car', 'package'])
        .eq('hub_id', uuid)
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
    let totalHubComm = 0, totalHost = 0;
    const typeRevenues: Record<string, number> = {};
    const hostData: Record<string, { name: string; rev: number; bookings: number }> = {};
    const listingData: Record<string, { name: string; rev: number; bookings: number }> = {};
    const dateData: Record<string, number> = {};

    validBookings.forEach(b => {
      const amt = Number(b.total_amount || 0);
      const comm = Number(b.commission_amount || 0);
      const hubComm = Math.round(comm * 0.1);
      const hostEarn = amt - comm;

      totalHubComm += hubComm;
      totalHost += hostEarn;

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
      totalHubComm, totalHost,
      totalHubRev: totalHubComm, // Hub revenue is basically the hub commission
      totalBookings: validBookings.length,
      activeListings: Object.keys(listingData).length,
      typeRevenues, topHosts, topListings, chartData, pieData
    };
  }, [validBookings]);

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> Hub Listing Revenue
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Revenue generated from listings operating within your hub coverage.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Hub Revenue', value: INR(metrics.totalHubRev), icon: Wallet, color: 'text-emerald-600' },
          { label: 'Total Bookings', value: metrics.totalBookings, icon: ShoppingBag, color: 'text-blue-600' },
          { label: 'Hub Commission', value: INR(metrics.totalHubComm), icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Host Earnings', value: INR(metrics.totalHost), icon: Store, color: 'text-teal-600' },
          { label: 'Active Listings', value: metrics.activeListings, icon: Eye, color: 'text-rose-600' },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-24">
              <c.icon className={`h-5 w-5 mb-1 ${c.color}`} />
              <h3 className="text-xl font-black leading-tight">{c.value}</h3>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-bold">Monthly Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={metrics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                  <RechartsTooltip formatter={(v) => [INR(Number(v)), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Revenue by Listing Type</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-sm font-bold">Top Listings in Hub</CardTitle></CardHeader>
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
                    <TableCell className="text-right font-bold text-xs text-primary">{INR(l.rev)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold">Top Hosts in Hub</CardTitle></CardHeader>
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
                    <TableCell className="text-right font-bold text-xs text-primary">{INR(h.rev)}</TableCell>
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
