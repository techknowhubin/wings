import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, HeadphonesIcon, User, Phone, Car, Calendar,
  CreditCard, LifeBuoy, MessageCircle, ArrowUpRight, AlertTriangle,
  CheckCircle, Clock, MapPin, Mail, Plus, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

type SearchResult = {
  traveller: any;
  bookings: any[];
  tickets: any[];
};

const ISSUE_TYPES = ['Booking Issue', 'Refund Request', 'Driver Complaint', 'Host Complaint', 'Trip Modification', 'Payment Issue', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUS_COLORS: Record<string, string> = {
  'Confirmed': 'bg-emerald-100 text-emerald-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Completed': 'bg-gray-100 text-gray-600',
  'Cancelled': 'bg-red-100 text-red-600',
  'Open': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-purple-100 text-purple-700',
  'Resolved': 'bg-emerald-100 text-emerald-700',
  'Escalated': 'bg-red-100 text-red-600',
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>;
}

export default function HubTravellerAssistance() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ issue_type: 'Booking Issue', description: '', priority: 'Medium', booking_id: '' });

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearched(searchQuery);
    try {
      // Search traveller by phone, name, or email
      const { data: travellers } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(1);

      const traveller = travellers?.[0] || null;
      let bookings: any[] = [];
      let tickets: any[] = [];

      if (traveller) {
        const [bRes, tRes] = await Promise.all([
          supabase.from('bookings').select('*').eq('user_id', traveller.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('hub_support_tickets').select('*').eq('traveller_id', traveller.id).order('created_at', { ascending: false }).limit(5),
        ]);
        bookings = bRes.data || [];
        tickets = tRes.data || [];
      } else {
        // Try searching by booking ID
        const { data: cabB } = await supabase
          .from('cab_bookings')
          .select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(*)`)
          .or(`booking_id.ilike.%${searchQuery}%`)
          .limit(1);
        if (cabB?.[0]?.traveller) {
          setResult({ traveller: cabB[0].traveller, bookings: [cabB[0]], tickets: [] });
          setSearching(false);
          return;
        }
      }

      setResult({ traveller, bookings, tickets });
    } catch (e: any) {
      toast({ title: 'Search failed', description: e.message, variant: 'destructive' });
    }
    setSearching(false);
  };

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!result?.traveller) throw new Error('No traveller selected');
      const { error } = await supabase.from('hub_support_tickets').insert({
        hub_uuid: uuid,
        traveller_id: result.traveller.id,
        booking_id: ticketForm.booking_id || null,
        issue_type: ticketForm.issue_type,
        description: ticketForm.description,
        priority: ticketForm.priority,
        status: 'Open',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Support ticket created' });
      setShowTicket(false);
      setTicketForm({ issue_type: 'Booking Issue', description: '', priority: 'Medium', booking_id: '' });
      doSearch();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Traveller Assistance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Hub support desk — look up any traveller and manage their trip</p>
      </div>

      {/* Search Bar */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Mobile, Name, Email, Booking ID, or Wing ID..."
                className="pl-10 rounded-xl h-11"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
              />
            </div>
            <Button onClick={doSearch} disabled={searching || !searchQuery.trim()} className="rounded-xl h-11 px-6">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Search by: Mobile Number · Booking ID · Name · Email · Wing ID
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        result?.traveller ? (
          <div className="space-y-4">
            {/* Traveller Profile */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">Traveller Profile</CardTitle>
                  <div className="flex gap-2">
                    {result.traveller.phone && (
                      <>
                        <Button size="sm" variant="outline" asChild className="rounded-lg h-8 text-xs">
                          <a href={`tel:${result.traveller.phone}`}><Phone className="h-3.5 w-3.5 mr-1" />Call</a>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="rounded-lg h-8 text-xs text-emerald-600 border-emerald-200">
                          <a href={`https://wa.me/91${result.traveller.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
                          </a>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setShowTicket(true)} className="rounded-lg h-8 text-xs">
                      <LifeBuoy className="h-3.5 w-3.5 mr-1" />Raise Ticket
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: User, label: 'Full Name', value: result.traveller.full_name || 'N/A' },
                    { icon: Phone, label: 'Mobile', value: result.traveller.phone || 'N/A' },
                    { icon: Mail, label: 'Email', value: result.traveller.email || 'N/A' },
                    { icon: MapPin, label: 'City', value: result.traveller.city || result.traveller.state || 'N/A' },
                    { icon: Calendar, label: 'Member Since', value: result.traveller.created_at ? format(new Date(result.traveller.created_at), 'MMM yyyy') : 'N/A' },
                    { icon: CheckCircle, label: 'KYC Status', value: result.traveller.kyc_status || 'Not Started' },
                    { icon: Car, label: 'Total Bookings', value: result.bookings.length },
                    { icon: CreditCard, label: 'Lifetime Value', value: `₹${result.bookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0).toLocaleString('en-IN')}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Booking History */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Booking History ({result.bookings.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {result.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No bookings found</p>
                ) : (
                  <div className="space-y-0 divide-y divide-border/50">
                    {result.bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center gap-3 py-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <Car className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{b.listing_type?.toUpperCase() || 'CAB'} Booking</p>
                          <p className="text-xs text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd MMM yyyy') : 'N/A'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <StatusPill status={b.booking_status || 'Pending'} />
                          <p className="text-xs text-muted-foreground mt-0.5">₹{(b.total_price || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support Tickets */}
            {result.tickets.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Support Tickets ({result.tickets.length})</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0 divide-y divide-border/50">
                    {result.tickets.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 py-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${t.priority === 'Critical' || t.priority === 'High' ? 'bg-red-50' : 'bg-muted'}`}>
                          <LifeBuoy className={`h-4 w-4 ${t.priority === 'Critical' ? 'text-red-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{t.issue_type}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                        </div>
                        <StatusPill status={t.status || 'Open'} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm font-semibold text-muted-foreground">No traveller found for "{searched}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching by mobile number, name, or booking ID</p>
            </CardContent>
          </Card>
        )
      )}

      {!searched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {[
            { icon: Phone, title: 'Search by Mobile', desc: 'Enter 10-digit mobile number', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { icon: Car, title: 'Search by Booking ID', desc: 'Enter full or partial booking ID', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            { icon: User, title: 'Search by Name', desc: 'Enter traveller full name', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          ].map((c, i) => (
            <div key={i} className={`rounded-xl p-5 border border-border/30 ${c.color.split(' ').slice(1).join(' ')}`}>
              <c.icon className={`h-6 w-6 ${c.color.split(' ')[0]} mb-2`} />
              <p className="font-semibold text-sm text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Raise Ticket Dialog */}
      <Dialog open={showTicket} onOpenChange={setShowTicket}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Raise Support Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">For: <strong>{result?.traveller?.full_name}</strong></p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Issue Type</Label>
              <Select value={ticketForm.issue_type} onValueChange={v => setTicketForm(p => ({ ...p, issue_type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={ticketForm.priority} onValueChange={v => setTicketForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description *</Label>
              <Textarea
                value={ticketForm.description}
                onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue in detail..."
                className="rounded-xl resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicket(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => createTicket.mutate()}
              disabled={!ticketForm.description || createTicket.isPending}
              className="rounded-xl"
            >
              {createTicket.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LifeBuoy className="h-4 w-4 mr-2" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
