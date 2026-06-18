import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function HubBookings() {
  const { uuid } = useParams();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [uuid]);

  const fetchBookings = async () => {
    if (!uuid) return;
    
    // First get hub ID from UUID
    const { data: hubData } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
    if (!hubData) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('package_bookings')
      .select(`
        id, booking_ref, total_amount, payment_status, booking_status, created_at,
        tour_packages(name),
        package_travellers(count)
      `)
      .eq('hub_id', hubData.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setBookings(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Package Bookings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Travellers</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bookings found for your hub.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.booking_ref}</TableCell>
                      <TableCell>{booking.tour_packages?.name}</TableCell>
                      <TableCell>{booking.package_travellers?.[0]?.count || 0}</TableCell>
                      <TableCell>₹{booking.total_amount}</TableCell>
                      <TableCell className="capitalize">{booking.payment_status}</TableCell>
                      <TableCell className="capitalize">{booking.booking_status}</TableCell>
                      <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
