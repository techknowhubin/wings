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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, Plus, PhoneIncoming, Users, MessageCircle,
  Mail, Calendar, ArrowRight, Phone, MoreHorizontal, Edit, Eye,
  TrendingUp, CheckCircle, XCircle, Clock, Send
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Enquiry = any;

const LEAD_STATUSES = ['All', 'New', 'Interested', 'Quotation Sent', 'Follow-Up', 'Converted', 'Lost'];
const LEAD_SOURCES = ['Walk-In', 'Phone Call', 'WhatsApp', 'Referral', 'Social Media'];
const SERVICES = ['Outstation Cab', 'Hotel', 'Homestay', 'Resort', 'Experience', 'Tour Package', 'Car Rental', 'Bike Rental'];

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-700',
  'Interested': 'bg-indigo-100 text-indigo-700',
  'Quotation Sent': 'bg-purple-100 text-purple-700',
  'Follow-Up': 'bg-amber-100 text-amber-700',
  'Converted': 'bg-emerald-100 text-emerald-700',
  'Lost': 'bg-red-100 text-red-600',
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  'Walk-In': Users,
  'Phone Call': Phone,
  'WhatsApp': MessageCircle,
  'Referral': TrendingUp,
  'Social Media': Send,
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>;
}

const emptyForm = {
  name: '', mobile: '', email: '', destination: '',
  travel_date: '', budget: '', service_type: 'Outstation Cab',
  lead_source: 'Walk-In', notes: ''
};

export default function HubWalkInEnquiries() {
  const { uuid } = useParams<{ uuid: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [viewEnquiry, setViewEnquiry] = useState<Enquiry | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ['hub-walkin-enquiries', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('walkin_enquiries')
        .select('*')
        .eq('hub_uuid', uuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createEnquiry = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const { error } = await supabase.from('walkin_enquiries').insert({
        hub_uuid: uuid,
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        destination: data.destination || null,
        travel_date: data.travel_date || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        service_type: data.service_type,
        lead_source: data.lead_source,
        notes: data.notes || null,
        lead_status: 'New',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-walkin-enquiries'] });
      toast({ title: 'Enquiry created', description: 'Walk-in lead has been recorded.' });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('walkin_enquiries').update({ lead_status: status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-walkin-enquiries'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = (enquiries || []).filter((e: Enquiry) => {
    const matchSearch = !search ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.mobile?.includes(search) ||
      e.destination?.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'All' || e.lead_status === activeTab;
    return matchSearch && matchTab;
  });

  const counts: Record<string, number> = Object.fromEntries(
    LEAD_STATUSES.slice(1).map(s => [s, (enquiries || []).filter((e: Enquiry) => e.lead_status === s).length])
  );

  const f = (k: keyof typeof emptyForm) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Walk-In Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage leads from walk-ins, calls, WhatsApp & referrals</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> New Enquiry
        </Button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {LEAD_STATUSES.slice(1).map(s => (
          <div key={s} onClick={() => setActiveTab(s)}
            className={`rounded-xl p-3 border cursor-pointer transition-all ${activeTab === s ? 'border-primary/50 bg-primary/5' : 'border-border/30 hover:bg-muted/30'}`}>
            <p className="text-xl font-black text-foreground">{counts[s] || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {LEAD_STATUSES.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, destination..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Name', 'Mobile', 'Destination', 'Service', 'Budget', 'Source', 'Follow-up', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  <PhoneIncoming className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No enquiries found</p>
                </TableCell></TableRow>
              ) : (
                filtered.map((e: Enquiry) => {
                  const SrcIcon = SOURCE_ICONS[e.lead_source] || PhoneIncoming;
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm">{e.name}</TableCell>
                      <TableCell className="text-xs">{e.mobile}</TableCell>
                      <TableCell className="text-xs">{e.destination || '—'}</TableCell>
                      <TableCell className="text-xs">{e.service_type || '—'}</TableCell>
                      <TableCell className="text-xs">{e.budget ? `₹${Number(e.budget).toLocaleString('en-IN')}` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <SrcIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs">{e.lead_source}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{e.follow_up_date ? format(new Date(e.follow_up_date), 'dd MMM') : '—'}</TableCell>
                      <TableCell><StatusPill status={e.lead_status || 'New'} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Lead Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setViewEnquiry(e)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`tel:${e.mobile}`}><Phone className="h-4 w-4 mr-2" />Call</a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`https://wa.me/91${e.mobile?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />WhatsApp
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Change Status</DropdownMenuLabel>
                            {['Interested', 'Quotation Sent', 'Follow-Up', 'Converted', 'Lost'].map(s => (
                              <DropdownMenuItem key={s} onClick={() => updateStatus.mutate({ id: e.id, status: s })}>
                                <ArrowRight className="h-4 w-4 mr-2" />{s}
                              </DropdownMenuItem>
                            ))}
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

      {/* Create Enquiry Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneIncoming className="h-5 w-5 text-primary" />New Walk-In Enquiry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Name *</Label>
                <Input value={form.name} onChange={e => f('name')(e.target.value)} placeholder="Full name" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile *</Label>
                <Input value={form.mobile} onChange={e => f('mobile')(e.target.value)} placeholder="+91 XXXXX XXXXX" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input value={form.email} onChange={e => f('email')(e.target.value)} placeholder="email@example.com" className="rounded-xl" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination</Label>
                <Input value={form.destination} onChange={e => f('destination')(e.target.value)} placeholder="Where to?" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Travel Date</Label>
                <Input value={form.travel_date} onChange={e => f('travel_date')(e.target.value)} type="date" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Budget (₹)</Label>
                <Input value={form.budget} onChange={e => f('budget')(e.target.value)} placeholder="Approx budget" type="number" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Service Interested In</Label>
                <Select value={form.service_type} onValueChange={f('service_type')}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lead Source</Label>
                <Select value={form.lead_source} onValueChange={f('lead_source')}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes')(e.target.value)} placeholder="Additional details..." className="rounded-xl resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => createEnquiry.mutate(form)}
              disabled={!form.name || !form.mobile || createEnquiry.isPending}
              className="rounded-xl"
            >
              {createEnquiry.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Enquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Enquiry Dialog */}
      <Dialog open={!!viewEnquiry} onOpenChange={() => setViewEnquiry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewEnquiry?.name}</DialogTitle>
          </DialogHeader>
          {viewEnquiry && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              {[
                ['Mobile', viewEnquiry.mobile],
                ['Email', viewEnquiry.email || 'N/A'],
                ['Destination', viewEnquiry.destination || 'N/A'],
                ['Travel Date', viewEnquiry.travel_date ? format(new Date(viewEnquiry.travel_date), 'dd MMM yyyy') : 'N/A'],
                ['Budget', viewEnquiry.budget ? `₹${Number(viewEnquiry.budget).toLocaleString('en-IN')}` : 'N/A'],
                ['Service', viewEnquiry.service_type || 'N/A'],
                ['Source', viewEnquiry.lead_source],
                ['Status', viewEnquiry.lead_status],
                ['Created', viewEnquiry.created_at ? format(new Date(viewEnquiry.created_at), 'dd MMM yyyy') : 'N/A'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
              {viewEnquiry.notes && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="font-medium text-foreground mt-0.5">{viewEnquiry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
