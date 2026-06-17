import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Check, X, Car, Calendar, MapPin, Eye, MoreHorizontal, User, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

export default function HubBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['hub-partner-bookings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cab_bookings')
        .select(`
          *,
          traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)
        `)
        .eq('hub_partner_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, isAssignmentStatus = false }: { id: string, status: string, isAssignmentStatus?: boolean }) => {
      if (isAssignmentStatus) {
        const { error } = await supabase
          .from('cab_bookings')
          .update({ assignment_status: status })
          .eq('booking_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ booking_status: status })
          .eq('id', id);
        if (error) throw error;
        // The trigger will update cab_bookings
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-partner-bookings', user?.id] });
      toast({
        title: "Status updated",
        description: "Booking status has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const filteredBookings = bookings?.filter((b: any) => 
    b.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.drop_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.booking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.traveller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Hub Bookings</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search location, name, ID..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route & Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle & Fare</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings?.map((booking: any) => (
                <TableRow key={booking.booking_id}>
                  <TableCell>
                    <div className="font-medium flex flex-col gap-1">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {booking.pickup_location} → {booking.drop_location}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> 
                        {booking.travel_date ? format(new Date(booking.travel_date), 'PP p') : 'TBD'}
                        {booking.return_date && ` - ${format(new Date(booking.return_date), 'PP p')}`}
                      </span>
                      {booking.distance_km && (
                        <span className="text-xs text-muted-foreground">
                          {booking.distance_km} km ({booking.return_date ? 'Round Trip' : 'One-way'})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium flex flex-col gap-1">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {booking.traveller?.full_name || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {booking.traveller?.phone || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-sm font-medium"><Car className="h-3 w-3" /> {booking.cab_type || 'Any Vehicle'}</span>
                      <span className="text-sm">₹{booking.fare_amount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={booking.booking_status === 'Confirmed' ? 'default' : booking.booking_status === 'Completed' ? 'secondary' : 'outline'}>
                        {booking.booking_status || 'Pending'}
                      </Badge>
                      {booking.assignment_status && booking.assignment_status !== 'Assigned' && (
                        <Badge variant="outline" className="text-[10px] w-fit">
                          {booking.assignment_status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Booking Details</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="font-medium text-muted-foreground">Booking ID</div>
                                <div className="break-all">{booking.booking_id}</div>
                                
                                <div className="font-medium text-muted-foreground">Pickup</div>
                                <div>{booking.pickup_location}</div>
                                
                                <div className="font-medium text-muted-foreground">Drop</div>
                                <div>{booking.drop_location}</div>
                                
                                <div className="font-medium text-muted-foreground">Pickup Date & Time</div>
                                <div>{booking.travel_date ? format(new Date(booking.travel_date), 'PP p') : 'N/A'}</div>

                                {booking.return_date && (
                                  <>
                                    <div className="font-medium text-muted-foreground">Return Date & Time</div>
                                    <div>{format(new Date(booking.return_date), 'PP p')}</div>
                                  </>
                                )}
                                
                                <div className="font-medium text-muted-foreground">Vehicle Type</div>
                                <div>{booking.cab_type || 'N/A'}</div>
                                
                                <div className="font-medium text-muted-foreground">Total Fare</div>
                                <div>₹{booking.fare_amount || 0}</div>
                                
                                <div className="font-medium text-muted-foreground">Distance</div>
                                <div>{booking.distance_km || 'N/A'} km</div>
                                
                                <div className="font-medium text-muted-foreground">Customer</div>
                                <div>{booking.traveller?.full_name || 'N/A'}</div>
                                
                                <div className="font-medium text-muted-foreground">Mobile</div>
                                <div>{booking.traveller?.phone || 'N/A'}</div>

                                <div className="font-medium text-muted-foreground">Trip Type</div>
                                <div>{booking.return_date ? 'Outstation Round Trip' : 'Outstation One-way'}</div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <DropdownMenuSeparator />
                        
                        {booking.assignment_status === 'Assigned' && (
                          <>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'Accepted', isAssignmentStatus: true })}>
                              <Check className="mr-2 h-4 w-4 text-emerald-500" /> Accept Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'Rejected', isAssignmentStatus: true })}>
                              <X className="mr-2 h-4 w-4 text-destructive" /> Reject Booking
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'Confirmed' })}>
                          Mark as Confirmed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: booking.booking_id, status: 'Completed' })}>
                          Mark as Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
