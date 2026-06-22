import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminCabBookings() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin', 'cab-bookings', typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cab_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter && typeFilter !== 'all') {
        query = query.ilike('booking_type', `%${typeFilter}%`);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('booking_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Cab bookings fetch error:", error);
        return [];
      }
      
      const bookingsList = data ?? [];
      
      // Fetch related profiles and drivers
      const profileIds = [...new Set(bookingsList.map(b => b.hub_partner_id).filter(Boolean))];
      const driverIds = [...new Set(bookingsList.map(b => b.driver_id).filter(Boolean))];
      
      const [profilesRes, driversRes] = await Promise.all([
        profileIds.length > 0 
          ? supabase.from('profiles').select('id, full_name').in('id', profileIds)
          : Promise.resolve({ data: [] }),
        driverIds.length > 0
          ? supabase.from('hub_drivers').select('id, driver_name').in('id', driverIds)
          : Promise.resolve({ data: [] })
      ]);
      
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const driverMap = new Map((driversRes.data || []).map((d: any) => [d.id, d]));
      
      return bookingsList.map(b => ({
        ...b,
        hub_partner: profileMap.get(b.hub_partner_id) || null,
        driver: driverMap.get(b.driver_id) || null
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Airport & Local Rentals</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all Airport and Local Rental Cab bookings.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Booking Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Airport">Airport Transfer</SelectItem>
            <SelectItem value="4 Hours">4HRS Local Rental</SelectItem>
            <SelectItem value="8 Hours">8HRS Local Rental</SelectItem>
            <SelectItem value="Outstation">Outstation</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {(typeFilter && typeFilter !== 'all' || statusFilter && statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(''); setStatusFilter(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Drop</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Hub Partner</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bookings ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No cab bookings match the current filters.</TableCell></TableRow>
                )}
                {(bookings ?? []).map((b: any) => (
                  <TableRow key={b.booking_id}>
                    <TableCell><code className="text-xs font-mono text-muted-foreground">XPA-{b.booking_id?.slice(0, 6).toUpperCase()}</code></TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex flex-col">
                        <span>{b.customer_name ?? '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{b.customer_phone ?? ''}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{b.booking_type || 'Cab'}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={b.pickup_location}>{b.pickup_location ?? '—'}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={b.drop_location}>{b.drop_location ?? '—'}</TableCell>
                    <TableCell className="text-xs">{b.cab_type ?? '—'}</TableCell>
                    <TableCell className="text-xs">{b.hub_partner?.full_name ?? <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs">{b.driver?.driver_name ?? <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs font-semibold">₹{Number(b.fare_amount ?? 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[b.booking_status]}`}>{b.booking_status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
