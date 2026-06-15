import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HubTravellers() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: travellers, isLoading } = useQuery({
    queryKey: ['hub-travellers', profile?.assigned_state],
    enabled: !!profile?.assigned_state,
    queryFn: async () => {
      // Fetch users who have role = 'user' and belong to this state
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user');
        
      if (error) throw error;
      return data;
    }
  });

  const filteredTravellers = travellers?.filter(t => 
    (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (t.phone?.includes(searchTerm) || '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Traveller Management</h2>
        <p className="text-muted-foreground">View travellers located in {profile?.assigned_state}. Note: Account modification is restricted.</p>
      </div>

      <div className="flex bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by Name or Phone..." 
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
              <TableHead>Traveller Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Total Bookings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                </TableCell>
              </TableRow>
            ) : filteredTravellers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No travellers found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredTravellers?.map((traveller) => (
                <TableRow key={traveller.id}>
                  <TableCell className="font-medium">{traveller.full_name || 'Unknown'}</TableCell>
                  <TableCell>{traveller.phone || 'N/A'}</TableCell>
                  <TableCell>{traveller.total_bookings || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                      <History className="w-4 h-4 mr-1" /> View History
                    </Button>
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
