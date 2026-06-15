import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, CheckCircle, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HubDrivers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['hub-drivers', profile?.assigned_state],
    enabled: !!profile?.assigned_state,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver_partner')
        .eq('state', profile?.assigned_state);
        
      if (error) throw error;
      return data;
    }
  });

  const updateDriverStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Driver status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['hub-drivers'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const filteredDrivers = drivers?.filter(d => 
    (d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (d.phone?.includes(searchTerm) || '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Driver Management</h2>
        <p className="text-muted-foreground">Manage and verify driver partners operating in {profile?.assigned_state}.</p>
      </div>

      <div className="flex bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by Driver Name or Phone..." 
            className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead>Driver Name</TableHead>
              <TableHead>Contact</TableHead>
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
            ) : filteredDrivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No driver partners found.
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers?.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name || 'Unknown'}</TableCell>
                  <TableCell>{driver.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={driver.kyc_status === 'approved' ? 'default' : 'secondary'}>
                      {driver.kyc_status?.replace('_', ' ') || 'Not Started'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.account_status === 'active' ? 'default' : 'destructive'}>
                      {driver.account_status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {driver.account_status !== 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateDriverStatus.mutate({ id: driver.id, newStatus: 'active' })}
                        disabled={updateDriverStatus.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {driver.account_status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => updateDriverStatus.mutate({ id: driver.id, newStatus: 'suspended' })}
                        disabled={updateDriverStatus.isPending}
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
