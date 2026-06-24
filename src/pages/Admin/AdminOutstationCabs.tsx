import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { Car, CheckCircle2, TrendingUp, Clock, MapPin, User, FileText, IndianRupee } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { safeDecrypt } from '@/lib/crypto';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminOutstationCabs() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin', 'outstation-cabs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cab_bookings')
        .select('*, bookings(notes)')
        .ilike('booking_type', '%Outstation%')
        .order('created_at', { ascending: false });

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
      const profileIds = [...new Set([
        ...bookingsList.map(b => b.hub_partner_id),
        ...bookingsList.map(b => b.traveller_id)
      ].filter(Boolean))];
      const driverIds = [...new Set(bookingsList.map(b => b.driver_id).filter(Boolean))];
      
      const [profilesRes, driversRes] = await Promise.all([
        profileIds.length > 0 
          ? supabase.from('profiles').select('id, full_name, email_encrypted, phone').in('id', profileIds)
          : Promise.resolve({ data: [] }),
        driverIds.length > 0
          ? supabase.from('hub_drivers').select('id, driver_name').in('id', driverIds)
          : Promise.resolve({ data: [] })
      ]);
      
      if (profilesRes.data) {
        await Promise.all(profilesRes.data.map(async (p: any) => {
          if (p.email_encrypted) {
            p.email = await safeDecrypt(p.email_encrypted, { table: 'profiles', column: 'email', recordId: p.id });
          }
        }));
      }

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const driverMap = new Map((driversRes.data || []).map((d: any) => [d.id, d]));
      
      return bookingsList.map(b => {
        let parsedNotes = null;
        try {
          if (b.bookings?.notes) parsedNotes = typeof b.bookings.notes === 'string' ? JSON.parse(b.bookings.notes) : b.bookings.notes;
        } catch (e) {}

        return {
          ...b,
          customer_email: parsedNotes?.primaryGuest?.email || b.customer_email,
          hub_partner: profileMap.get(b.hub_partner_id) || null,
          traveller: profileMap.get(b.traveller_id) || null,
          driver: driverMap.get(b.driver_id) || null
        };
      });
    },
  });

  const totalBookings = bookings?.length || 0;
  const activeTrips = bookings?.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'In Progress').length || 0;
  const completedTrips = bookings?.filter(b => b.booking_status === 'completed').length || 0;
  const revenueGenerated = bookings?.filter(b => b.booking_status === 'completed' || b.payment_status === 'paid')
                                   .reduce((sum, b) => sum + Number(b.fare_amount || 0), 0) || 0;
  const avgBookingValue = completedTrips > 0 ? revenueGenerated / completedTrips : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Car className="h-6 w-6 text-[#013220]" /> Outstation Cabs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all Outstation Cab bookings.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-[#013220]/10 p-3 rounded-xl"><Car className="h-5 w-5 text-[#013220]" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-black">{totalBookings}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-xl"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Trips</p>
              <h3 className="text-2xl font-black">{activeTrips}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl"><Car className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Booking Value</p>
              <h3 className="text-2xl font-black">₹{Math.round(avgBookingValue).toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</p>
              <h3 className="text-2xl font-black">₹{revenueGenerated.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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

        {statusFilter && statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); }}>
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
                  <TableHead>Traveller</TableHead>
                  <TableHead>Trip Details</TableHead>
                  <TableHead>Pickup & Drop</TableHead>
                  <TableHead>Vehicle & Hub</TableHead>
                  <TableHead>Amount & Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bookings ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No outstation bookings match the current filters.</TableCell></TableRow>
                )}
                {(bookings ?? []).map((b: any) => (
                  <TableRow key={b.booking_id}>
                    <TableCell><code className="text-xs font-mono text-muted-foreground">XPO-{b.booking_id?.slice(0, 6).toUpperCase()}</code></TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{b.customer_name || b.traveller?.full_name || '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{b.customer_phone || b.traveller?.phone || ''}</span>
                        <span className="text-[10px] text-muted-foreground">{b.customer_email || b.traveller?.email || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-max text-[10px]">{b.trip_type || 'One Way'}</Badge>
                        <span className="text-xs font-medium">{b.travel_date ? format(new Date(b.travel_date), 'dd MMM yyyy') : '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex gap-1 items-start"><span className="text-green-500 font-bold shrink-0">P:</span><span className="truncate" title={b.pickup_location}>{b.pickup_location ?? '—'}</span></div>
                        <div className="flex gap-1 items-start"><span className="text-red-500 font-bold shrink-0">D:</span><span className="truncate" title={b.drop_location}>{b.drop_location ?? '—'}</span></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-semibold">{b.cab_type ?? '—'}</span>
                        <span className="text-muted-foreground">Hub: {b.hub_partner?.full_name ?? 'Unassigned'}</span>
                        <span className="text-muted-foreground">Driver: {b.driver?.driver_name ?? 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold">₹{Number(b.fare_amount ?? 0).toLocaleString('en-IN')}</span>
                        <Badge variant="outline" className={`w-max text-[10px] capitalize ${STATUS_COLORS[b.booking_status]}`}>{b.booking_status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>
                       <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedBooking(b)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Car className="h-5 w-5 text-[#013220]" />
              Cab Booking Details
            </DialogTitle>
            <DialogDescription>
              Booking ID: XPO-{selectedBooking?.booking_id?.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" /> Customer Info
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {selectedBooking.customer_name || selectedBooking.traveller?.full_name || '—'}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedBooking.customer_phone || selectedBooking.traveller?.phone || '—'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedBooking.customer_email || selectedBooking.traveller?.email || '—'}</p>
                  </div>
                </div>
                
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" /> Trip Information
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Trip Type:</span> {selectedBooking.trip_type || 'One Way'}</p>
                    <p><span className="text-muted-foreground">Vehicle:</span> {selectedBooking.cab_type || '—'}</p>
                    <p><span className="text-muted-foreground">Travel Date:</span> {selectedBooking.travel_date ? format(new Date(selectedBooking.travel_date), 'dd MMM yyyy, hh:mm a') : '—'}</p>
                    {selectedBooking.return_date && (
                      <p><span className="text-muted-foreground">Return Date:</span> {format(new Date(selectedBooking.return_date), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Route Details
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-green-600 font-bold mt-0.5">Pickup:</span>
                    <span>{selectedBooking.pickup_location || '—'}</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-red-600 font-bold mt-0.5">Drop:</span>
                    <span>{selectedBooking.drop_location || '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-medium">{selectedBooking.distance_km ? `${selectedBooking.distance_km} km` : '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Buffer Included:</span>
                    <span className="font-medium">+{selectedBooking.trip_type === 'Round Trip' ? 50 : 25} km</span>
                  </div>
                </div>
                {selectedBooking.pickup_latitude && selectedBooking.pickup_longitude && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">🗺️ Route Map Preview</p>
                    <div className="rounded-xl overflow-hidden border border-border/50 bg-background">
                      <iframe 
                        width="100%" 
                        height="180" 
                        style={{ border: 0 }} 
                        src={selectedBooking.drop_latitude && selectedBooking.drop_longitude 
                          ? `https://maps.google.com/maps?saddr=${selectedBooking.pickup_latitude},${selectedBooking.pickup_longitude}&daddr=${selectedBooking.drop_latitude},${selectedBooking.drop_longitude}&output=embed`
                          : `https://maps.google.com/maps?q=${selectedBooking.pickup_latitude},${selectedBooking.pickup_longitude}&output=embed`} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" /> Assignment
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Hub Partner:</span> {selectedBooking.hub_partner?.full_name || 'Unassigned'}</p>
                    <p><span className="text-muted-foreground">Driver:</span> {selectedBooking.driver?.driver_name || 'Unassigned'}</p>
                    <p className="mt-2"><Badge variant="outline" className={STATUS_COLORS[selectedBooking.assignment_status] || ''}>{selectedBooking.assignment_status || 'Unassigned'}</Badge></p>
                  </div>
                </div>

                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" /> Payment Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Base Fare:</span> 
                      <span>₹{Number(selectedBooking.base_fare || 0).toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">GST ({selectedBooking.gst_percentage || 0}%):</span> 
                      <span>₹{Number(selectedBooking.gst_amount || 0).toLocaleString('en-IN')}</span>
                    </p>
                    <Separator className="my-1" />
                    <p className="flex justify-between font-bold text-base mt-2">
                      <span>Total Amount:</span> 
                      <span className="text-[#013220] font-black">₹{Number(selectedBooking.fare_amount || 0).toLocaleString('en-IN')}</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline" className={STATUS_COLORS[selectedBooking.payment_status] || ''}>Payment: {selectedBooking.payment_status || 'Pending'}</Badge>
                      <Badge variant="outline" className={STATUS_COLORS[selectedBooking.booking_status] || ''}>Status: {selectedBooking.booking_status}</Badge>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
