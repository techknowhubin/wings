import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

const PAYMENT_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  partial:   'bg-amber-100 text-amber-800',
  pending:   'bg-gray-100 text-gray-700',
  failed:    'bg-red-100 text-red-800',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed:  'bg-blue-100 text-blue-800',
  pending:    'bg-amber-100 text-amber-800',
  cancelled:  'bg-red-100 text-red-800',
  completed:  'bg-green-100 text-green-800',
};

export default function AdminPackageBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('package_bookings')
      .select(`
        id, booking_ref, total_amount, payment_status, booking_status,
        created_at, payment_id,
        tour_packages(name, destination, max_capacity, booked_seats),
        package_travellers(id, name, email, mobile, age, gender),
        hubs(name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) setBookings(data);
    else if (error) console.error('[AdminPackageBookings]', error);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Package Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">All tour package bookings across the platform.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Package Bookings ({bookings.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Primary Traveller</TableHead>
                  <TableHead>Travellers</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      No package bookings yet.
                    </TableCell>
                  </TableRow>
                ) : bookings.map((b) => {
                  const travellers: any[] = b.package_travellers || [];
                  const primary = travellers[0];
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-medium">{b.booking_ref}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{b.tour_packages?.name}</p>
                          <p className="text-xs text-muted-foreground">{b.tour_packages?.destination}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{b.hubs?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {primary ? (
                          <div>
                            <p className="font-medium text-sm">{primary.name}</p>
                            <p className="text-xs text-muted-foreground">{primary.email}</p>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5" /> {travellers.length}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        ₹{Number(b.total_amount).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLOR[b.payment_status?.toLowerCase()] ?? ''}`}>
                          {b.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLOR[b.booking_status?.toLowerCase()] ?? ''}`}>
                          {b.booking_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(b)}>Details</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Package Booking Details</SheetTitle></SheetHeader>
          {selected && (() => {
            const travellers: any[] = selected.package_travellers || [];
            return (
              <div className="mt-6 space-y-6 text-sm">
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking</p>
                  <p className="font-mono text-sm font-semibold">{selected.booking_ref}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLOR[selected.payment_status?.toLowerCase()] ?? ''}`}>{selected.payment_status}</Badge>
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLOR[selected.booking_status?.toLowerCase()] ?? ''}`}>{selected.booking_status}</Badge>
                  </div>
                  {selected.payment_id && (
                    <p className="text-xs text-muted-foreground mt-1">Payment ID: <code className="font-mono">{selected.payment_id}</code></p>
                  )}
                  <p className="text-xs text-muted-foreground">Booked on {new Date(selected.created_at).toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Package</p>
                  <p className="font-semibold">{selected.tour_packages?.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.tour_packages?.destination}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>Total Capacity: {selected.tour_packages?.max_capacity ?? '—'}</span>
                    <span>Booked: {selected.tour_packages?.booked_seats ?? '—'}</span>
                  </div>
                  <p className="text-base font-bold mt-1">₹{Number(selected.total_amount).toLocaleString('en-IN')}</p>
                  {selected.hubs?.name && (
                    <p className="text-xs text-muted-foreground">Hub: {selected.hubs.name}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Travellers ({travellers.length})</p>
                  {travellers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No traveller records.</p>
                  ) : travellers.map((t, i) => (
                    <div key={t.id} className="p-4 rounded-xl border bg-card space-y-2">
                      <p className="font-semibold text-sm">{i === 0 ? '👤 Primary Contact' : `Traveller ${i + 1}`}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Name</span><p className="font-medium">{t.name}</p></div>
                        <div><span className="text-muted-foreground">Age</span><p className="font-medium">{t.age ?? '—'}</p></div>
                        <div><span className="text-muted-foreground">Gender</span><p className="font-medium capitalize">{t.gender ?? '—'}</p></div>
                        {i === 0 && <>
                          <div><span className="text-muted-foreground">Email</span><p className="font-medium break-all">{t.email ?? '—'}</p></div>
                          <div><span className="text-muted-foreground">Mobile</span><p className="font-medium">{t.mobile ?? '—'}</p></div>
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
