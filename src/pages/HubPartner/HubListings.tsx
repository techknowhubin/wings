import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HubListings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("stays");

  // Fetch listings based on type. RLS will automatically restrict to the Hub Partner's assigned_state
  const { data: listings, isLoading } = useQuery({
    queryKey: ['hub-listings', typeFilter, profile?.assigned_state],
    enabled: !!profile?.assigned_state,
    queryFn: async () => {
      // Dynamically fetch from the selected table (stays, hotels, resorts, cars, bikes, experiences)
      const { data, error } = await supabase
        .from(typeFilter as any)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });

  const updateApprovalStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const { error } = await supabase
        .from(typeFilter as any)
        .update({ approval_status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Listing updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['hub-listings'] });
    },
    onError: (error) => {
      toast({ title: "Error updating listing", description: error.message, variant: "destructive" });
    }
  });

  const filteredListings = listings?.filter(listing => 
    (listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (listing.location?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Listing Management</h2>
        <p className="text-muted-foreground">Manage property and vehicle listings in {profile?.assigned_state}.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search listings by title or location..." 
            className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-900 border-none">
            <SelectValue placeholder="Listing Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stays">Home Stays</SelectItem>
            <SelectItem value="hotels">Hotels</SelectItem>
            <SelectItem value="resorts">Resorts</SelectItem>
            <SelectItem value="cars">Car Rentals</SelectItem>
            <SelectItem value="bikes">Bike Rentals</SelectItem>
            <SelectItem value="experiences">Experiences</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
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
            ) : filteredListings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No {typeFilter} found in your state.
                </TableCell>
              </TableRow>
            ) : (
              filteredListings?.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={listing.title}>
                    {listing.title}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{listing.location}</TableCell>
                  <TableCell>
                    {listing.currency === 'USD' ? '$' : '₹'}
                    {listing.price_per_night || listing.price_per_day || listing.price_per_person || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={listing.approval_status === 'approved' ? 'default' : listing.approval_status === 'rejected' ? 'destructive' : 'secondary'}>
                      {listing.approval_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {listing.approval_status !== 'approved' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateApprovalStatus.mutate({ id: listing.id, newStatus: 'approved' })}
                        disabled={updateApprovalStatus.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {listing.approval_status !== 'rejected' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateApprovalStatus.mutate({ id: listing.id, newStatus: 'rejected' })}
                        disabled={updateApprovalStatus.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
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
