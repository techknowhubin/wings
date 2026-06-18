import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Loader2, MapPin, History, Phone, Mail, Calendar,
  TrendingUp, Car, MoreHorizontal, IndianRupee, Send, User, Tag
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Traveller = any;

export default function HubTravellers() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [viewTraveller, setViewTraveller] = useState<Traveller | null>(null);
  const [travBookings, setTravBookings] = useState<any[]>([]);

  const { data: travellers, isLoading } = useQuery({
    queryKey: ['hub-travellers'],
    queryFn: async () => {
      // Get traveller user IDs from user_roles table (profiles has no 'role' column)
      const { data: travRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');
      if (rolesError) throw rolesError;

      const travIds = (travRoles || []).map((r: any) => r.user_id);
      if (travIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', travIds)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    }
  });

  const handleViewTraveller = async (t: Traveller) => {
    setViewTraveller(t);
    const { data } = await supabase.from('bookings').select('*').eq('user_id', t.id).order('created_at', { ascending: false }).limit(10);
    setTravBookings(data || []);
  };

  const filtered = (travellers || []).filter((t: Traveller) =>
    !search ||
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Travellers CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View and manage all registered travellers</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-2">
          <MapPin className="h-4 w-4" />
          <span>{travellers?.length || 0} registered travellers</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, email..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Traveller', 'Mobile', 'City', 'Member Since', 'KYC', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No travellers found</p>
                </TableCell></TableRow>
              ) : (
                filtered.map((t: Traveller) => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center font-bold text-sm text-rose-600 shrink-0">
                          {t.full_name?.charAt(0)?.toUpperCase() || 'T'}
                        </div>
                        <p className="font-semibold text-sm">{t.full_name || 'Unknown'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.phone || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{t.city || t.state || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        t.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                        : t.kyc_status === 'pending_review' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.kyc_status?.replace('_', ' ') || 'None'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">CRM Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewTraveller(t)}>
                            <History className="h-4 w-4 mr-2" />View Booking History
                          </DropdownMenuItem>
                          {t.phone && (
                            <>
                              <DropdownMenuItem asChild>
                                <a href={`tel:${t.phone}`}><Phone className="h-4 w-4 mr-2" />Call</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`https://wa.me/91${t.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                  <Send className="h-4 w-4 mr-2 text-emerald-600" />WhatsApp
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><Tag className="h-4 w-4 mr-2" />Send Coupon</DropdownMenuItem>
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

      {/* Traveller Detail Dialog */}
      <Dialog open={!!viewTraveller} onOpenChange={() => { setViewTraveller(null); setTravBookings([]); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center font-bold text-sm text-rose-600">
                {viewTraveller?.full_name?.charAt(0)?.toUpperCase()}
              </div>
              {viewTraveller?.full_name}
            </DialogTitle>
          </DialogHeader>
          {viewTraveller && (
            <div className="space-y-5 py-2">
              {/* Profile Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Mobile', viewTraveller.phone],
                  ['City', viewTraveller.city || viewTraveller.state || 'N/A'],
                  ['KYC Status', viewTraveller.kyc_status?.replace('_', ' ') || 'Not Started'],
                  ['Member Since', viewTraveller.created_at ? format(new Date(viewTraveller.created_at), 'MMM yyyy') : 'N/A'],
                  ['Total Bookings', travBookings.length],
                  ['Lifetime Value', `₹${travBookings.reduce((s, b) => s + (b.total_price || 0), 0).toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="font-medium text-foreground mt-0.5">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>

              {/* Booking History */}
              <div>
                <p className="text-sm font-bold mb-3">Booking History</p>
                {travBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-2">
                    {travBookings.map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                        <div className="h-7 w-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <Car className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{b.listing_type?.toUpperCase() || 'BOOKING'}</p>
                          <p className="text-xs text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd MMM yyyy') : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">₹{(b.total_price || 0).toLocaleString('en-IN')}</p>
                          <p className={`text-[10px] ${b.booking_status === 'Confirmed' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {b.booking_status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {viewTraveller.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild className="rounded-xl flex-1">
                      <a href={`tel:${viewTraveller.phone}`}><Phone className="h-4 w-4 mr-2" />Call</a>
                    </Button>
                    <Button size="sm" variant="outline" asChild className="rounded-xl flex-1 text-emerald-600 border-emerald-200">
                      <a href={`https://wa.me/91${viewTraveller.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                        <Send className="h-4 w-4 mr-2" />WhatsApp
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
