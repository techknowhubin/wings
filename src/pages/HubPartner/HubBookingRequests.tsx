import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, CalendarCheck, Car, Eye, Check, X, UserPlus,
  Phone, MessageCircle, ArrowRight, MoreHorizontal, Filter
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Booking = any;

const STATUS_TABS = ['All', 'New', 'Pending Confirmation', 'Assigned', 'Confirmed', 'Rejected', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Awaiting Hub Partner Assignment': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Pending Confirmation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Assigned': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Confirmed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Completed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Rejected': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  'Cancelled': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function BookingDetailDialog({ booking }: { booking: Booking }) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          Booking Details
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm py-2">
        {[
          ['Booking ID', booking.booking_id?.slice(0, 8) + '...'],
          ['Service Type', booking.service_type || 'Outstation Cab'],
          ['Traveller', booking.traveller?.full_name || 'N/A'],
          ['Mobile', booking.traveller?.phone || 'N/A'],
          ['Pickup', booking.pickup_location || 'N/A'],
          ['Drop', booking.drop_location || 'N/A'],
          ['Travel Date', booking.travel_date ? format(new Date(booking.travel_date), 'dd MMM yyyy, HH:mm') : 'N/A'],
          ['Vehicle Type', booking.cab_type || 'Any'],
          ['Fare Amount', `₹${(booking.fare_amount || 0).toLocaleString('en-IN')}`],
          ['Payment Status', booking.payment_status || 'N/A'],
          ['Booking Status', booking.booking_status || 'N/A'],
          ['Created', booking.created_at ? format(new Date(booking.created_at), 'dd MMM yyyy') : 'N/A'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}

export default function HubBookingRequests() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-booking-requests', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cab_bookings')
        .select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)`)
        .eq('assigned_hub_uuid', uuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch drivers for assignment
  const { data: drivers } = useQuery({
    queryKey: ['hub-drivers-list', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await supabase.from('hub_drivers').select('id, driver_name, mobile, status').eq('hub_uuid', uuid).eq('status', 'active');
      return data || [];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('cab_bookings').update({ booking_status: status }).eq('booking_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['hub-pending-count'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const assignDriver = useMutation({
    mutationFn: async ({ bookingId, driverId }: { bookingId: string; driverId: string }) => {
      const { error } = await supabase.from('cab_bookings')
        .update({ driver_id: driverId, booking_status: 'Assigned', trip_status: 'Driver Assigned' })
        .eq('booking_id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-booking-requests'] });
      toast({ title: 'Driver assigned successfully' });
      setSelectedBooking(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = (bookings || []).filter((b: Booking) => {
    const matchSearch = !search ||
      b.booking_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.traveller?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.traveller?.phone?.includes(search) ||
      b.pickup_location?.toLowerCase().includes(search.toLowerCase());

    const status = b.booking_status || 'Pending';
    const matchTab = activeTab === 'All' ||
      status === activeTab ||
      (activeTab === 'New' && (status === 'Pending' || status === 'Awaiting Hub Partner Assignment'));
    return matchSearch && matchTab;
  });

  const counts = {
    All: bookings?.length || 0,
    New: bookings?.filter((b: Booking) => ['Pending', 'Awaiting Hub Partner Assignment'].includes(b.booking_status || '')).length || 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Booking Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Central queue for all incoming bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-semibold">
            <CalendarCheck className="h-4 w-4" />
            {counts.New} pending
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {tab === 'New' && counts.New > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full">{counts.New}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, location..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Booking ID</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Traveller</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Route</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Service</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Travel Date</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Amount</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Payment</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No bookings found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b: Booking) => (
                  <TableRow key={b.booking_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{b.booking_id?.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{b.traveller?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{b.traveller?.phone || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-foreground font-medium">{b.pickup_location || '—'}</p>
                      <p className="text-xs text-muted-foreground">→ {b.drop_location || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">{b.service_type || 'Outstation Cab'}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.travel_date ? format(new Date(b.travel_date), 'dd MMM yy') : 'TBD'}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">₹{(b.fare_amount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        b.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.payment_status || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.booking_status || 'Pending'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DialogTrigger asChild>
                              <DropdownMenuItem onClick={() => setSelectedBooking(b)}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                            </DialogTrigger>
                            {['Pending', 'Awaiting Hub Partner Assignment'].includes(b.booking_status || '') && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: b.booking_id, status: 'Confirmed' })}>
                                  <Check className="h-4 w-4 mr-2 text-emerald-600" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: b.booking_id, status: 'Rejected' })}>
                                  <X className="h-4 w-4 mr-2 text-destructive" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {b.traveller?.phone && (
                              <DropdownMenuItem asChild>
                                <a href={`tel:${b.traveller.phone}`}>
                                  <Phone className="h-4 w-4 mr-2" /> Call Traveller
                                </a>
                              </DropdownMenuItem>
                            )}
                            {b.traveller?.phone && (
                              <DropdownMenuItem asChild>
                                <a href={`https://wa.me/91${b.traveller.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                  <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" /> WhatsApp
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedBooking?.booking_id === b.booking_id && (
                          <BookingDetailDialog booking={selectedBooking} />
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Driver Assignment Dialog */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Select a driver for this trip</p>
              <Select onValueChange={val => assignDriver.mutate({ bookingId: selectedBooking.booking_id, driverId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose driver..." />
                </SelectTrigger>
                <SelectContent>
                  {(drivers || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.driver_name} — {d.mobile}
                    </SelectItem>
                  ))}
                  {drivers?.length === 0 && <SelectItem value="none" disabled>No active drivers</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
