import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, Car, Phone, MessageCircle, UserPlus, FileText,
  Download, MapPin, Calendar, MoreHorizontal, Navigation, CheckCircle,
  Clock, AlertCircle, RefreshCw
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/lib/invoice";

type Booking = any;

const TRIP_STATUSES = [
  'All', 'Awaiting Assignment', 'Driver Assigned', 'Driver Accepted', 'En Route', 'Trip Started', 'Trip Completed', 'Cancelled'
];

const TRIP_STATUS_COLORS: Record<string, string> = {
  'Awaiting Assignment': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Driver Assigned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Driver Accepted': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'En Route': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Trip Started': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Trip Completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Cancelled': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

function TripStatusBadge({ status }: { status: string }) {
  const cls = TRIP_STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status || 'Awaiting Assignment'}</span>;
}

export default function HubOutstationCabs() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-outstation-cabs', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data: hub } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
      const profileId = hub?.id;

      let query = supabase
        .from('cab_bookings')
        .select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)`);

      if (profileId) {
        query = query.or(`assigned_hub_uuid.eq.${uuid},hub_partner_id.eq.${profileId}`);
      } else {
        query = query.eq('assigned_hub_uuid', uuid);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      // Filter strictly by booking_source — outstation only
      return (data || []).filter((b: any) => b.booking_source === 'outstation_cab');
    }
  });

  const { data: drivers } = useQuery({
    queryKey: ['hub-active-drivers', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await supabase.from('hub_drivers').select('*').eq('hub_uuid', uuid).eq('status', 'active');
      return data || [];
    }
  });

  const updateTrip = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('cab_bookings').update(updates).eq('booking_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-outstation-cabs'] });
      toast({ title: 'Trip updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const doAssignDriver = () => {
    if (!assigningBooking || !selectedDriverId) return;
    updateTrip.mutate({
      id: assigningBooking.booking_id,
      updates: { driver_id: selectedDriverId, trip_status: 'Driver Assigned', booking_status: 'Assigned' }
    }, {
      onSuccess: () => { setAssigningBooking(null); setSelectedDriverId(''); }
    });
  };

  const filtered = (bookings || []).filter((b: Booking) => {
    const matchSearch = !search ||
      b.booking_id?.includes(search) ||
      b.traveller?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_location?.toLowerCase().includes(search.toLowerCase()) ||
      b.drop_location?.toLowerCase().includes(search.toLowerCase());
    const tripStatus = b.trip_status || 'Awaiting Assignment';
    const matchTab = activeTab === 'All' || tripStatus === activeTab;
    return matchSearch && matchTab;
  });

  const statCounts = {
    active: (bookings || []).filter((b: Booking) => ['Driver Assigned', 'En Route', 'Trip Started'].includes(b.trip_status || '')).length,
    awaiting: (bookings || []).filter((b: Booking) => !b.trip_status || b.trip_status === 'Awaiting Assignment').length,
    completed: (bookings || []).filter((b: Booking) => b.trip_status === 'Trip Completed').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Outstation Cabs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage cab trips, driver assignments, and trip tracking</p>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Trips', value: statCounts.active, icon: Car, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Awaiting Driver', value: statCounts.awaiting, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Completed', value: statCounts.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 ${s.bg} border border-border/30`}>
            <div className="flex items-center gap-2">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-2xl font-black text-foreground">{s.value}</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {TRIP_STATUSES.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >{tab}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by ID, name, location..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Booking ID', 'Traveller', 'Route', 'Date', 'Vehicle', 'Driver', 'Amount', 'Payment', 'Trip Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground"><Car className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No cab bookings found</p></TableCell></TableRow>
              ) : (
                filtered.map((b: Booking) => (
                  <TableRow key={b.booking_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">#{b.booking_id?.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{b.traveller?.full_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{b.traveller?.phone || 'N/A'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{b.pickup_location}</p>
                      <p className="text-xs text-muted-foreground">→ {b.drop_location}</p>
                      {b.map_url && (
                        <a href={b.map_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline mt-0.5 inline-block">
                          View Map
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.travel_date ? format(new Date(b.travel_date), 'dd MMM') : 'TBD'}
                    </TableCell>
                    <TableCell className="text-xs">{b.cab_type || 'Any'}</TableCell>
                    <TableCell className="text-xs">{b.driver_id ? <span className="text-emerald-600 font-medium">Assigned</span> : <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="font-semibold text-sm">₹{(b.fare_amount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.payment_status === 'completed' || b.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : b.payment_status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.payment_status === 'completed' || b.payment_status === 'paid' ? 'Paid'
                          : b.payment_status === 'failed' ? 'Failed'
                          : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell><TripStatusBadge status={b.trip_status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs">Trip Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setAssigningBooking(b)}>
                            <UserPlus className="h-4 w-4 mr-2 text-blue-600" />
                            {b.driver_id ? 'Reassign Driver' : 'Assign Driver'}
                          </DropdownMenuItem>
                          {b.traveller?.phone && (
                            <>
                              <DropdownMenuItem asChild>
                                <a href={`tel:${b.traveller.phone}`}><Phone className="h-4 w-4 mr-2" />Call Traveller</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`https://wa.me/91${b.traveller.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                  <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />WhatsApp Traveller
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          {['Awaiting Assignment', 'Driver Assigned'].includes(b.trip_status || '') && (
                            <DropdownMenuItem onClick={() => updateTrip.mutate({ id: b.booking_id, updates: { trip_status: 'En Route' } })}>
                              <Navigation className="h-4 w-4 mr-2 text-purple-600" />Mark En Route
                            </DropdownMenuItem>
                          )}
                          {b.trip_status === 'En Route' && (
                            <DropdownMenuItem onClick={() => updateTrip.mutate({ id: b.booking_id, updates: { trip_status: 'Trip Started' } })}>
                              <Car className="h-4 w-4 mr-2 text-teal-600" />Mark Trip Started
                            </DropdownMenuItem>
                          )}
                          {b.trip_status === 'Trip Started' && (
                            <DropdownMenuItem onClick={() => updateTrip.mutate({ id: b.booking_id, updates: { trip_status: 'Trip Completed', booking_status: 'Completed' } })}>
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Mark Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => generateInvoicePDF(b)}>
                            <FileText className="h-4 w-4 mr-2" />Generate Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />Download Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Driver Assignment Modal */}
      <Dialog open={!!assigningBooking} onOpenChange={() => { setAssigningBooking(null); setSelectedDriverId(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {assigningBooking?.driver_id ? 'Reassign Driver' : 'Assign Driver'}
            </DialogTitle>
          </DialogHeader>
          {assigningBooking && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-xl text-sm">
                <p className="font-semibold">{assigningBooking.traveller?.full_name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{assigningBooking.pickup_location} → {assigningBooking.drop_location}</p>
              </div>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {(drivers || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.driver_name}</span>
                        <span className="text-muted-foreground text-xs">· {d.mobile}</span>
                        {d.rating && <span className="text-amber-500 text-xs">★{d.rating}</span>}
                      </div>
                    </SelectItem>
                  ))}
                  {drivers?.length === 0 && <SelectItem value="none" disabled>No active drivers available</SelectItem>}
                </SelectContent>
              </Select>
              <Button
                className="w-full rounded-xl"
                onClick={doAssignDriver}
                disabled={!selectedDriverId || updateTrip.isPending}
              >
                {updateTrip.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Assign Driver
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
