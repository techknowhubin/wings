import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Departures() {
  const [departures, setDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartures();
  }, []);

  const fetchDepartures = async () => {
    const { data, error } = await supabase
      .from('package_departures')
      .select(`
        id, departure_date, capacity, booked_seats, status,
        tour_packages(name, destination)
      `)
      .order('departure_date', { ascending: true });
      
    if (!error && data) {
      setDepartures(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Departures</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Departures</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No departures scheduled.
                    </TableCell>
                  </TableRow>
                ) : (
                  departures.map((dep) => {
                    const occupancy = Math.round((dep.booked_seats / dep.capacity) * 100);
                    return (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">{dep.tour_packages?.name}</TableCell>
                        <TableCell>{dep.tour_packages?.destination}</TableCell>
                        <TableCell>{new Date(dep.departure_date).toLocaleDateString()}</TableCell>
                        <TableCell>{dep.capacity}</TableCell>
                        <TableCell>{dep.booked_seats}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${occupancy}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{occupancy}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{dep.status}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">Manifest</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
