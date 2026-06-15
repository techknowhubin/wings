import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, CheckCircle, XCircle, Ban, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HubHosts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: hosts, isLoading } = useQuery({
    queryKey: ['hub-hosts', profile?.assigned_state, statusFilter],
    enabled: !!profile?.assigned_state,
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'host');
      
      if (statusFilter !== 'all') {
        query = query.eq('account_status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const updateHostStatus = useMutation({
    mutationFn: async ({ hostId, newStatus }: { hostId: string, newStatus: string }) => {
      // In a real app, you might use a specific RPC for hub partners to avoid bypassing security.
      // But since RLS allows updating profiles in their state, this works natively.
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', hostId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['hub-hosts'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const filteredHosts = hosts?.filter(host => 
    (host.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (host.phone?.includes(searchTerm) || '')
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Host Management</h2>
          <p className="text-muted-foreground">Manage hosts in {profile?.assigned_state}.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search hosts by name or phone..." 
            className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-900 border-none">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead>Host Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                </TableCell>
              </TableRow>
            ) : filteredHosts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hosts found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredHosts?.map((host) => (
                <TableRow key={host.id}>
                  <TableCell className="font-medium">{host.full_name || "Unknown"}</TableCell>
                  <TableCell>{host.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={host.kyc_status === 'approved' ? 'default' : 'secondary'}>
                      {host.kyc_status?.replace('_', ' ') || 'Not Started'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      host.account_status === 'active' ? 'default' : 
                      host.account_status === 'suspended' ? 'destructive' : 'secondary'
                    }>
                      {host.account_status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {host.account_status !== 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateHostStatus.mutate({ hostId: host.id, newStatus: 'active' })}
                        disabled={updateHostStatus.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {host.account_status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => updateHostStatus.mutate({ hostId: host.id, newStatus: 'suspended' })}
                        disabled={updateHostStatus.isPending}
                      >
                        <Ban className="w-4 h-4 mr-1" /> Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
