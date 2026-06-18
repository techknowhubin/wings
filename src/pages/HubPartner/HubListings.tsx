import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, Building, Eye, Star, Check, X, Pause, Play,
  Hotel, Home, TreePine, Backpack, Map, Bike, MoreHorizontal, TrendingUp, Phone, Mail, Clock, MessageSquare, Image as ImageIcon,
  User, Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Listing = any;

const TYPE_TABS = ['All', 'Hotels', 'Homestays', 'Resorts', 'Experiences', 'Cars', 'Bikes'];

const TYPE_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  hotel: { icon: Hotel, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  stay: { icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  resort: { icon: TreePine, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  experience: { icon: Backpack, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  car: { icon: Map, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  bike: { icon: Bike, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
};

const typeFilters: Record<string, string[]> = {
  'Hotels': ['hotel'], 'Homestays': ['stay'], 'Resorts': ['resort'],
  'Experiences': ['experience'], 'Cars': ['car'], 'Bikes': ['bike'],
};

function ListingDetailView({ listing, onClose }: { listing: Listing, onClose: () => void }) {
  const { data: details, isLoading, error } = useQuery({
    queryKey: ['listing-details', listing.id, listing.listing_type],
    queryFn: async () => {
      const tableMap: Record<string, string> = { hotel: 'hotels', stay: 'stays', resort: 'resorts', experience: 'experiences', car: 'cars', bike: 'bikes' };
      const table = tableMap[listing.listing_type] || 'stays';
      
      const { data: listData, error: listErr } = await supabase.from(table as any).select('*').eq('id', listing.id).maybeSingle();
      if (listErr || !listData) throw new Error('LISTING_NOT_FOUND');
      
      let hostDetails = null;
      let hostProfile = null;
      
      if (listData.host_id) {
        const { data: pData } = await supabase.from('profiles').select('full_name, phone, kyc_status, email_encrypted, created_at').eq('id', listData.host_id).maybeSingle();
        hostProfile = pData;
        const { data: hp } = await supabase.from('host_profiles').select('business_name, business_type, address, city, state, verification_status').eq('id', listData.host_id).maybeSingle();
        hostDetails = hp;
      }
      
      const { data: recentBookings } = await supabase.from('bookings').select('id, user_id, start_date, end_date, total_price, booking_status, profiles(full_name)').eq('listing_id', listing.id).order('created_at', { ascending: false }).limit(5);

      return { ...listData, host: hostProfile, host_profiles: hostDetails, recent_bookings: recentBookings || [] };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-4 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-muted/50 rounded-xl" />)}
        </div>
        <div className="h-32 bg-muted/50 rounded-xl" />
      </div>
    );
  }

  if (error?.message === 'LISTING_NOT_FOUND') return <div className="p-8 text-muted-foreground text-center"><Building className="h-8 w-8 mx-auto mb-2 opacity-30" />Listing not found</div>;
  if (error) return <div className="p-4 text-red-500 font-mono text-xs overflow-auto">Error: {error.message || String(error)}</div>;
  if (!details) return null;

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-2 gap-4">
        {/* Section 1: Listing Details */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><Building className="h-4 w-4" /> Section 1: Listing Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Listing Name:</span> <span className="font-semibold">{details.title || details.name || 'Unnamed'}</span></p>
            <p><span className="text-muted-foreground">Type:</span> <span className="capitalize">{listing.listing_type}</span></p>
            <p><span className="text-muted-foreground">Category:</span> {details.property_type || 'Standard'}</p>
            <p><span className="text-muted-foreground">Location:</span> {details.city || details.state || 'Unknown'}</p>
            <p><span className="text-muted-foreground">Status:</span> {listing.status === 'published' ? 'Active' : listing.status}</p>
            <p><span className="text-muted-foreground">Listing ID:</span> <span className="text-xs">{details.id}</span></p>
            <p><span className="text-muted-foreground">Created Date:</span> {details.created_at ? format(new Date(details.created_at), 'dd-MMM-yyyy') : 'N/A'}</p>
            <p><span className="text-muted-foreground">Last Updated:</span> {details.updated_at ? format(new Date(details.updated_at), 'dd-MMM-yyyy') : 'N/A'}</p>
            <div className="pt-1"><p className="text-xs text-muted-foreground line-clamp-3"><span className="font-semibold">Description:</span> {details.description || 'No description provided.'}</p></div>
          </div>
        </div>

        {/* Section 2: Host Information */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><User className="h-4 w-4" /> Section 2: Host Information</h3>
          {details.host ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Host Name:</span> <span className="font-semibold">{details.host.full_name || 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Business Name:</span> {details.host_profiles?.business_name || 'Individual'}</p>
              <p><span className="text-muted-foreground">Mobile:</span> {details.host.phone || 'N/A'}</p>
              <p><span className="text-muted-foreground">Email Address:</span> {details.host.email_encrypted ? 'Encrypted (Contact via Hub)' : 'N/A'}</p>
              <p><span className="text-muted-foreground">City:</span> {details.host_profiles?.city || details.host.city || 'N/A'}</p>
              <p><span className="text-muted-foreground">Address:</span> {details.host_profiles?.address || 'N/A'}</p>
              <p><span className="text-muted-foreground">Verification Status:</span> {details.host_profiles?.verification_status || details.host.kyc_status?.replace('_', ' ') || 'Pending'}</p>
              <p><span className="text-muted-foreground">Registration Date:</span> {details.host.created_at ? format(new Date(details.host.created_at), 'dd-MMM-yyyy') : 'N/A'}</p>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
              <User className="h-8 w-8 mb-2 opacity-20" />
              Host information unavailable
            </div>
          )}
        </div>

        {/* Section 3: Listing Ownership */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><Check className="h-4 w-4" /> Section 3: Listing Ownership</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Created By:</span> {details.host?.full_name || 'Unknown'}</p>
            <p><span className="text-muted-foreground">Host ID:</span> <span className="text-xs">{details.host_id || 'N/A'}</span></p>
            <p><span className="text-muted-foreground">Account Status:</span> {details.host?.kyc_status === 'approved' ? 'Active' : 'Pending/Restricted'}</p>
          </div>
        </div>

        {/* Section 4: Listing Analytics */}
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Section 4: Listing Analytics</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Total Views:</span> {details.views_count || 0}</p>
            <p><span className="text-muted-foreground">Total Bookings:</span> {details.booking_count || 0}</p>
            <p><span className="text-muted-foreground">Revenue Generated:</span> ₹{((details.booking_count || 0) * (details.price_per_night || 0)).toLocaleString('en-IN')}</p>
            <p><span className="text-muted-foreground">Average Rating:</span> {details.rating || 0} ⭐</p>
            <p><span className="text-muted-foreground">Review Count:</span> {details.total_reviews || 0} reviews</p>
          </div>
        </div>
      </div>

      {/* Section 5: Listing Gallery */}
      <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
        <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Section 5: Listing Gallery</h3>
        {details.images && details.images.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {details.images.map((img: string, i: number) => (
              <img key={i} src={img} alt="listing" className="h-32 w-48 object-cover rounded-xl border border-border shrink-0" />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm bg-muted/50 rounded-xl border border-dashed border-border">
            No images uploaded
          </div>
        )}
      </div>

      {/* Section 6: Recent Bookings */}
      <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
        <h3 className="font-bold text-sm text-[#059669] flex items-center gap-2"><Calendar className="h-4 w-4" /> Section 6: Recent Bookings</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Booking ID</TableHead>
                <TableHead className="text-xs">Traveller Name</TableHead>
                <TableHead className="text-xs">Check-In</TableHead>
                <TableHead className="text-xs">Check-Out</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.recent_bookings && details.recent_bookings.length > 0 ? (
                details.recent_bookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-[10px] font-mono truncate max-w-[100px]">{b.id}</TableCell>
                    <TableCell className="text-xs">{b.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell className="text-xs">{b.start_date ? format(new Date(b.start_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-xs">{b.end_date ? format(new Date(b.end_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">₹{(b.total_price || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.booking_status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {b.booking_status || 'Pending'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No recent bookings found for this listing.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function HubListings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [viewListing, setViewListing] = useState<Listing | null>(null);

  const { data: allListings, isLoading } = useQuery({
    queryKey: ['hub-listings'],
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from('hotels').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'hotel', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
        supabase.from('stays').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'stay', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
        supabase.from('resorts').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'resort', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
        supabase.from('experiences').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'experience', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
        supabase.from('cars').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'car', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
        supabase.from('bikes').select('id, title, city, state, is_verified, availability_status, host_id, created_at').limit(100).then(r => (r.data || []).map(d => ({ ...d, listing_type: 'bike', name: d.title, status: d.is_verified ? (d.availability_status ? 'published' : 'paused') : 'pending' }))),
      ]);
      return results.flat();
    }
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, type, updates }: { id: string; type: string; updates: Record<string, any> }) => {
      const tableMap: Record<string, string> = { hotel: 'hotels', stay: 'stays', resort: 'resorts', experience: 'experiences', car: 'cars', bike: 'bikes' };
      const table = tableMap[type] || 'stays';
      
      const dbUpdates: any = {};
      if (updates.status === 'published') {
        dbUpdates.is_verified = true;
        dbUpdates.availability_status = true;
      } else if (updates.status === 'rejected') {
        dbUpdates.is_verified = false;
        dbUpdates.availability_status = false;
      } else if (updates.status === 'paused') {
        dbUpdates.availability_status = false;
      } else {
        Object.assign(dbUpdates, updates);
      }
      
      const { error } = await supabase.from(table as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-listings'] });
      toast({ title: 'Listing updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = (allListings || []).filter((l: Listing) => {
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.city?.toLowerCase().includes(search.toLowerCase()) ||
      l.state?.toLowerCase().includes(search.toLowerCase());
    const types = typeFilters[activeTab];
    const matchTab = activeTab === 'All' || (types || []).includes(l.listing_type);
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage all host listings across categories</p>
      </div>

      {/* Type Counts */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(TYPE_MAP).map(([type, cfg]) => {
          const count = (allListings || []).filter((l: Listing) => l.listing_type === type).length;
          return (
            <div key={type} className={`rounded-xl p-3 border border-border/30 ${cfg.bg}`}>
              <cfg.icon className={`h-4 w-4 ${cfg.color} mb-1.5`} />
              <p className="text-xl font-black text-foreground">{count}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{type}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {TYPE_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >{tab}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search listings..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Listing', 'Type', 'Location', 'Status', 'Added', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <Building className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No listings found</p>
                </TableCell></TableRow>
              ) : (
                filtered.map((l: Listing) => {
                  const cfg = TYPE_MAP[l.listing_type] || TYPE_MAP['stay'];
                  return (
                    <TableRow key={`${l.listing_type}-${l.id}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                            <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <p className="font-semibold text-sm max-w-[200px] truncate">{l.name || 'Unnamed Listing'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {l.listing_type?.charAt(0).toUpperCase() + l.listing_type?.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.city || l.state || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.status === 'published' || l.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {l.status || 'Draft'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.created_at ? format(new Date(l.created_at), 'dd MMM yy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewListing(l)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateListing.mutate({ id: l.id, type: l.listing_type, updates: { status: 'published' } })}>
                              <Check className="h-4 w-4 mr-2 text-emerald-600" />Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateListing.mutate({ id: l.id, type: l.listing_type, updates: { status: 'rejected' } })}>
                              <X className="h-4 w-4 mr-2 text-destructive" />Reject
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateListing.mutate({ id: l.id, type: l.listing_type, updates: { status: 'paused' } })}>
                              <Pause className="h-4 w-4 mr-2 text-amber-600" />Pause Listing
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

      {/* Listing Detail Dialog */}
      <Dialog open={!!viewListing} onOpenChange={(open) => !open && setViewListing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Listing Details</DialogTitle>
          </DialogHeader>
          {viewListing && <ListingDetailView listing={viewListing} onClose={() => setViewListing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
