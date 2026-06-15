import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function HubBookings() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-bookings', profile?.assigned_state],
    enabled: !!profile?.assigned_state,
    queryFn: async () => {
      // Due to RLS, this will only return bookings in the assigned state
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          user:profiles!bookings_user_id_fkey(full_name, phone),
          host:profiles!bookings_host_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });

  const filteredBookings = bookings?.filter(booking => 
    (booking.id?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (booking.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Booking Management</h2>
        <p className="text-muted-foreground">View bookings and transactions within {profile?.assigned_state}. Modification is restricted.</p>
      </div>

      <div className="flex bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by Booking ID or Traveller Name..." 
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
              <TableHead>ID / Date</TableHead>
              <TableHead>Traveller</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                </TableCell>
              </TableRow>
            ) : filteredBookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {booking.id.substring(0, 8)}...
                    </div>
                    <div className="text-sm">
                      {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{booking.user?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{booking.user?.phone}</div>
                  </TableCell>
                  <TableCell className="capitalize">{booking.listing_type}</TableCell>
                  <TableCell className="font-medium">
                    {booking.currency === 'USD' ? '$' : '₹'}{booking.total_price}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={booking.booking_status === 'confirmed' ? 'default' : booking.booking_status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {booking.booking_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Pay: {booking.payment_status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Eye className="w-4 h-4 mr-1" /> View
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
