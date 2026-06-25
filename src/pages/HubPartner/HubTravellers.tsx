import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Loader2, MapPin, History, Phone, Mail, Calendar,
  TrendingUp, Car, MoreHorizontal, IndianRupee, Send, User, Tag, ArrowUpDown, Plus
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

type Traveller = any;

export default function HubTravellers() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [viewTraveller, setViewTraveller] = useState<Traveller | null>(null);
  const [travBookings, setTravBookings] = useState<any[]>([]);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const { data: travellers, isLoading } = useQuery({
    queryKey: ['hub-travellers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hub_travellers');
      if (error) throw error;
      return data || [];
    }
  });

  const handleViewTraveller = async (t: Traveller) => {
    setViewTraveller(t);
    const { data } = await supabase.from('bookings').select('*').eq('user_id', t.id).order('created_at', { ascending: false }).limit(10);
    setTravBookings(data || []);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sorted = [...(travellers || [])].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filtered = sorted.filter((t: Traveller) =>
    !search ||
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.wing_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTraveller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName || !createForm.phone || !createForm.email || !createForm.password) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      // Save the current hub partner session before signing up the new user
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session;

      // Create the new traveller account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            full_name: createForm.fullName,
            phone: createForm.phone,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Restore the hub partner's session immediately
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // Update profile with phone number if user was created
      if (signUpData?.user?.id) {
        await supabase.from('profiles').update({
          full_name: createForm.fullName,
          phone: createForm.phone,
        }).eq('id', signUpData.user.id);
      }

      toast({ 
        title: "Traveller Created Successfully", 
        description: `Name: ${createForm.fullName}\nMobile: ${createForm.phone}\nEmail: ${createForm.email}`,
      });
      
      setShowCreateForm(false);
      setCreateForm({ fullName: '', phone: '', email: '', password: '' });
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to create traveller", description: err.message || "An error occurred", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

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
        <Button onClick={() => setShowCreateForm(true)} className="rounded-xl whitespace-nowrap bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Create Traveller
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email, wing id..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 text-sm">
          <Button variant="outline" size="sm" onClick={() => handleSort('full_name')} className="rounded-xl"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Name</Button>
          <Button variant="outline" size="sm" onClick={() => handleSort('email')} className="rounded-xl hidden sm:flex"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Email</Button>
          <Button variant="outline" size="sm" onClick={() => handleSort('created_at')} className="rounded-xl hidden sm:flex"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Date</Button>
          <Button variant="outline" size="sm" onClick={() => handleSort('total_trips')} className="rounded-xl"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Trips</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto min-w-0 w-full pb-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Name', 'Mobile', 'Email', 'Wing ID', 'City', 'Total Trips', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{t.email || 'N/A'}</TableCell>
                    <TableCell className="text-xs font-medium">{t.wing_id || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{t.city || t.state || 'N/A'}</TableCell>
                    <TableCell className="text-xs font-semibold">{t.total_trips || 0}</TableCell>
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
                  ['Email', viewTraveller.email],
                  ['Wing ID', viewTraveller.wing_id],
                  ['City', viewTraveller.city || viewTraveller.state || 'N/A'],
                  ['KYC Status', viewTraveller.kyc_status?.replace('_', ' ') || 'Not Started'],
                  ['Member Since', viewTraveller.created_at ? format(new Date(viewTraveller.created_at), 'MMM yyyy') : 'N/A'],
                  ['Total Bookings', viewTraveller.total_trips || travBookings.length || 0],
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

      {/* Create Traveller Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Traveller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTraveller} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Full Name *</label>
              <Input 
                required 
                placeholder="E.g. Sriram" 
                value={createForm.fullName} 
                onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Mobile Number *</label>
              <Input 
                required 
                placeholder="+91XXXXXXXXXX" 
                value={createForm.phone} 
                onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email Address *</label>
              <Input 
                required 
                type="email"
                placeholder="sriram@example.com" 
                value={createForm.email} 
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Password *</label>
              <Input 
                required 
                type="password"
                placeholder="Enter password" 
                value={createForm.password} 
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} 
              />
            </div>
            <Button type="submit" disabled={creating} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Traveller
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
