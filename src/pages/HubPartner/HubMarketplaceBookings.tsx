import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Loader2, ShoppingBag, Hotel, Home, TreePine, Bike, Backpack, Map,
  Phone, MessageCircle, Eye, MoreHorizontal, Calendar, User, IndianRupee, LifeBuoy
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Booking = any;

const BOOKING_TYPES = ['All', 'Hotels', 'Homestays', 'Resorts', 'Experiences', 'Rentals'];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  hotel: { icon: Hotel, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Hotel' },
  stay: { icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Homestay' },
  resort: { icon: TreePine, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', label: 'Resort' },
  experience: { icon: Backpack, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Experience' },
  car: { icon: Map, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Car Rental' },
  bike: { icon: Bike, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', label: 'Bike Rental' },
};

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-700',
  'Confirmed': 'bg-emerald-100 text-emerald-700',
  'Checked In': 'bg-blue-100 text-blue-700',
  'Checked Out': 'bg-gray-100 text-gray-600',
  'Cancelled': 'bg-red-100 text-red-600',
  'Refunded': 'bg-orange-100 text-orange-700',
};

export default function HubMarketplaceBookings() {
  const { uuid } = useParams<{ uuid: string }>();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-marketplace-bookings', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      // Query bookings from the general bookings table for stays/hotels/experiences etc.
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, listing_type, listing_id, booking_status, payment_status, check_in, check_out, total_price, created_at, currency,
          user:profiles!bookings_user_id_fkey(full_name, phone, email)
        `)
        .in('listing_type', ['hotel', 'stay', 'resort', 'experience', 'car', 'bike'])
        .eq('hub_id', uuid)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Exclude bookings that are actually cab bookings
      const bookingIds = data.map(b => b.id);
      const { data: cabData } = await supabase.from('cab_bookings').select('booking_id').in('booking_id', bookingIds);
      const cabBookingIds = new Set((cabData || []).map(cb => cb.booking_id));
      
      const filteredData = data.filter(b => !cabBookingIds.has(b.id));
      if (filteredData.length === 0) return [];

      const hotelIds = filteredData.filter(b => b.listing_type === 'hotel').map(b => b.listing_id).filter(Boolean);
      const stayIds = filteredData.filter(b => b.listing_type === 'stay').map(b => b.listing_id).filter(Boolean);
      const resortIds = filteredData.filter(b => b.listing_type === 'resort').map(b => b.listing_id).filter(Boolean);
      const experienceIds = filteredData.filter(b => b.listing_type === 'experience').map(b => b.listing_id).filter(Boolean);
      const carIds = filteredData.filter(b => b.listing_type === 'car').map(b => b.listing_id).filter(Boolean);
      const bikeIds = filteredData.filter(b => b.listing_type === 'bike').map(b => b.listing_id).filter(Boolean);

      const listingMap: Record<string, any> = {};

      if (hotelIds.length > 0) {
        const { data: hotels } = await supabase.from('hotels').select('id, title, cover_image').in('id', hotelIds);
        hotels?.forEach(h => listingMap[h.id] = h);
      }
      if (stayIds.length > 0) {
        const { data: stays } = await supabase.from('stays').select('id, title, cover_image').in('id', stayIds);
        stays?.forEach(s => listingMap[s.id] = s);
      }
      if (resortIds.length > 0) {
        const { data: resorts } = await supabase.from('resorts').select('id, title, cover_image').in('id', resortIds);
        resorts?.forEach(r => listingMap[r.id] = r);
      }
      if (experienceIds.length > 0) {
        const { data: exps } = await supabase.from('experiences').select('id, title, cover_image').in('id', experienceIds);
        exps?.forEach(e => listingMap[e.id] = e);
      }
      if (carIds.length > 0) {
        const { data: cars } = await supabase.from('cars').select('id, name, images').in('id', carIds);
        cars?.forEach(c => listingMap[c.id] = { id: c.id, title: c.name, cover_image: c.images?.[0] });
      }
      if (bikeIds.length > 0) {
        const { data: bikes } = await supabase.from('bikes').select('id, name, images').in('id', bikeIds);
        bikes?.forEach(b => listingMap[b.id] = { id: b.id, title: b.name, cover_image: b.images?.[0] });
      }

      return filteredData.map(b => ({
        ...b,
        listingDetails: b.listing_id ? listingMap[b.listing_id] : null
      }));
    }
  });

  const typeFilter: Record<string, string[]> = {
    'Hotels': ['hotel'],
    'Homestays': ['stay'],
    'Resorts': ['resort'],
    'Experiences': ['experience'],
    'Rentals': ['car', 'bike'],
  };

  const filtered = (bookings || []).filter((b: Booking) => {
    const matchSearch = !search ||
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user?.phone?.includes(search);
    const matchTab = activeTab === 'All' || (typeFilter[activeTab] || []).includes(b.listing_type);
    return matchSearch && matchTab;
  });

  const typeCounts = Object.fromEntries(
    Object.entries(typeFilter).map(([tab, types]) => [tab, (bookings || []).filter((b: Booking) => types.includes(b.listing_type)).length])
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Marketplace Bookings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all host listing bookings — hotels, stays, experiences & rentals</p>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = (bookings || []).filter((b: Booking) => b.listing_type === type).length;
          return (
            <div key={type} className={`rounded-xl p-3 ${cfg.bg} border border-border/30`}>
              <cfg.icon className={`h-5 w-5 ${cfg.color} mb-1.5`} />
              <p className="text-xl font-black text-foreground">{count}</p>
              <p className="text-xs font-semibold text-muted-foreground">{cfg.label}s</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {BOOKING_TYPES.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
            {tab !== 'All' && typeCounts[tab] > 0 && (
              <span className="ml-1.5 bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded-full">{typeCounts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by traveller, booking ID..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Booking ID', 'Listing', 'Traveller', 'Dates', 'Total Amt', 'Host Earning', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No marketplace bookings found</p>
                </TableCell></TableRow>
              ) : (
                filtered.map((b: Booking) => {
                  const cfg = TYPE_CONFIG[b.listing_type] || TYPE_CONFIG['stay'];
                  return (
                    <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{b.id?.slice(-8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {b.listingDetails?.cover_image ? (
                            <img src={b.listingDetails.cover_image} alt={cfg.label} className="h-10 w-10 rounded-lg object-cover border border-border/50" />
                          ) : (
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                              <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-foreground line-clamp-1">{b.listingDetails?.title || cfg.label}</p>
                            <span className="text-[10px] font-medium text-muted-foreground">{cfg.label}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm">{b.user?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{b.user?.phone || 'N/A'}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.check_in ? format(new Date(b.check_in), 'dd MMM yy') : '—'}
                        <br />
                        {b.check_out ? format(new Date(b.check_out), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">₹{(b.total_price || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-semibold text-blue-600">₹{((b.total_price || 0) * 0.9).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[b.booking_status] || 'bg-muted text-muted-foreground'}`}>
                          {b.booking_status || 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewBooking(b)}>
                              <Eye className="h-4 w-4 mr-2" />View Booking
                            </DropdownMenuItem>
                            {b.user?.phone && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a href={`tel:${b.user.phone}`}><Phone className="h-4 w-4 mr-2" />Call Traveller</a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`https://wa.me/91${b.user.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                    <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />WhatsApp
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <LifeBuoy className="h-4 w-4 mr-2" />Raise Support Ticket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewBooking} onOpenChange={() => setViewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {viewBooking && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              {[
                ['Booking ID', '#' + (viewBooking.id?.slice(-8).toUpperCase())],
                ['Type', TYPE_CONFIG[viewBooking.listing_type]?.label || viewBooking.listing_type],
                ['Traveller', viewBooking.user?.full_name || 'N/A'],
                ['Phone', viewBooking.user?.phone || 'N/A'],
                ['Email', viewBooking.user?.email || 'N/A'],
                ['Check-in', viewBooking.check_in ? format(new Date(viewBooking.check_in), 'dd MMM yyyy') : 'N/A'],
                ['Check-out', viewBooking.check_out ? format(new Date(viewBooking.check_out), 'dd MMM yyyy') : 'N/A'],
                ['Total Amount', `₹${(viewBooking.total_price || 0).toLocaleString('en-IN')}`],
                ['Payment Status', viewBooking.payment_status || 'N/A'],
                ['Booking Status', viewBooking.booking_status || 'N/A'],
                ['Created', viewBooking.created_at ? format(new Date(viewBooking.created_at), 'dd MMM yyyy') : 'N/A'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
