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
  Hotel, Home, TreePine, Backpack, Map, Bike, MoreHorizontal, TrendingUp
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

async function fetchTable(table: string, profile: any) {
  const { data } = await supabase
    .from(table)
    .select(`id, title, name, city, state, status, is_published, host_id, created_at, currency`)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data || []).map((d: any) => ({ ...d, listing_type: table.replace(/s$/, '').replace('stay', 'stay') === 'stay' ? 'stay' : table.replace(/s$/, '') }));
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
    </div>
  );
}
