import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, Users, CheckCircle, Ban, Eye, Building, Star,
  Phone, Mail, MoreHorizontal, TrendingUp, MessageCircle, ShieldCheck, ShieldX
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Host = any;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600',
};

export default function HubHosts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewHost, setViewHost] = useState<Host | null>(null);

  const { data: hosts, isLoading } = useQuery({
    queryKey: ['hub-hosts', profile?.assigned_state, statusFilter],
    queryFn: async () => {
      // Get host user IDs from user_roles (profiles.role column does not exist)
      const { data: hostRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'host');
      if (rolesError) throw rolesError;

      const hostIds = (hostRoles || []).map((r: any) => r.user_id);
      if (hostIds.length === 0) return [];

      let query = supabase
        .from('profiles')
        .select('*, host_profiles(business_name, business_type)')
        .in('id', hostIds);

      if (statusFilter !== 'all') {
        query = query.eq('kyc_status', statusFilter === 'active' ? 'approved'
          : statusFilter === 'pending' ? 'pending_review'
          : statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Update kyc_status in profiles (approved = active, suspended = rejected)
      const kycMap: Record<string, string> = { active: 'approved', suspended: 'rejected' };
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: kycMap[status] || status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-hosts'] });
      toast({ title: 'Host status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = (hosts || []).filter((h: Host) =>
    !search ||
    h.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    h.phone?.includes(search) ||
    h.email?.toLowerCase().includes(search.toLowerCase()) ||
    h.host_profiles?.[0]?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: hosts?.length || 0,
    active: hosts?.filter((h: Host) => h.kyc_status === 'approved').length || 0,
    pending: hosts?.filter((h: Host) => !h.kyc_status || h.kyc_status === 'pending_review').length || 0,
    suspended: hosts?.filter((h: Host) => h.kyc_status === 'rejected').length || 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Host Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and verify host partners{profile?.assigned_state && ` in ${profile.assigned_state}`}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Hosts', value: counts.all, color: 'text-foreground', bg: 'bg-muted/40' },
          { label: 'KYC Approved', value: counts.active, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pending KYC', value: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Rejected', value: counts.suspended, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border border-border/30 ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, business name..." className="pl-10 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hosts</SelectItem>
            <SelectItem value="active">KYC Approved</SelectItem>
            <SelectItem value="pending">Pending KYC</SelectItem>
            <SelectItem value="suspended">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {['Host / Business', 'Contact', 'KYC', 'Listings', 'Status', 'Member Since', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No hosts found</p>
                </TableCell></TableRow>
              ) : (
                filtered.map((h: Host) => (
                  <TableRow key={h.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-sm text-primary">
                          {h.full_name?.charAt(0)?.toUpperCase() || 'H'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{h.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{h.host_profiles?.[0]?.business_name || 'Individual Host'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{h.phone || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{h.email?.split('@')[0] || ''}...</p>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        h.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                        : h.kyc_status === 'pending_review' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {h.kyc_status?.replace('_', ' ') || 'Not Started'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">—</TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        h.kyc_status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {h.kyc_status === 'approved' ? 'Active' : h.kyc_status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.created_at ? format(new Date(h.created_at), 'dd MMM yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">Host Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewHost(h)}>
                            <Eye className="h-4 w-4 mr-2" />View Profile
                          </DropdownMenuItem>
                          {h.phone && (
                            <>
                              <DropdownMenuItem asChild>
                                <a href={`tel:${h.phone}`}><Phone className="h-4 w-4 mr-2" />Call Host</a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`https://wa.me/91${h.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                  <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />WhatsApp
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          {h.account_status !== 'active' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: h.id, status: 'active' })}>
                              <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />Approve Host
                            </DropdownMenuItem>
                          )}
                          {h.account_status === 'active' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: h.id, status: 'suspended' })}>
                              <ShieldX className="h-4 w-4 mr-2 text-destructive" />Suspend Host
                            </DropdownMenuItem>
                          )}
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

      {/* View Host Dialog */}
      <Dialog open={!!viewHost} onOpenChange={() => setViewHost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                {viewHost?.full_name?.charAt(0)?.toUpperCase()}
              </div>
              {viewHost?.full_name}
            </DialogTitle>
          </DialogHeader>
          {viewHost && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Phone', viewHost.phone],
                  ['Email', viewHost.email],
                  ['Business', viewHost.host_profiles?.[0]?.business_name || 'N/A'],
                  ['KYC', viewHost.kyc_status?.replace('_', ' ') || 'N/A'],
                  ['Status', viewHost.account_status || 'Active'],
                  ['Joined', viewHost.created_at ? format(new Date(viewHost.created_at), 'dd MMM yyyy') : 'N/A'],
                  ['Listings', viewHost.host_profiles?.[0]?.total_listings || 0],
                  ['State', viewHost.state || viewHost.assigned_state || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="font-medium text-foreground mt-0.5">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                {viewHost.account_status !== 'active' && (
                  <Button size="sm" className="rounded-xl flex-1" onClick={() => { updateStatus.mutate({ id: viewHost.id, status: 'active' }); setViewHost(null); }}>
                    <ShieldCheck className="h-4 w-4 mr-2" />Approve
                  </Button>
                )}
                {viewHost.account_status === 'active' && (
                  <Button size="sm" variant="destructive" className="rounded-xl flex-1" onClick={() => { updateStatus.mutate({ id: viewHost.id, status: 'suspended' }); setViewHost(null); }}>
                    <Ban className="h-4 w-4 mr-2" />Suspend
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
