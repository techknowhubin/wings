import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Search, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';

export default function HubBookings() {
  const { uuid } = useParams();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [uuid]);

  const fetchBookings = async () => {
    if (!uuid) return;
    const { data: hubData } = await supabase.from('hubs').select('id').eq('uuid', uuid).single();
    if (!hubData) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('package_bookings')
      .select(`
        id, booking_ref, total_amount, amount_paid, wing_credits_used, payment_status, booking_status, created_at, payment_id, booking_details,
        tour_packages(name, max_capacity, booked_seats, adult_price, child_price, single_sharing_price, twin_sharing_price),
        package_travellers(id, name, email, mobile, age, gender)
      `)
      .eq('hub_id', hubData.id)
      .order('created_at', { ascending: false });

    if (!error && data) setBookings(data);
    setLoading(false);
  };

  const paymentBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      partial:   'bg-amber-100 text-amber-800',
      pending:   'bg-gray-100 text-gray-700',
      failed:    'bg-red-100 text-red-800',
    };
    return map[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  };

  // Derive package type breakdown for old bookings without booking_details
  const deriveTypes = (booking: any): any[] => {
    const pkg = booking.tour_packages;
    if (!pkg) return [];
    const travellers: any[] = booking.package_travellers || [];
    const n = travellers.length;
    if (n === 0) return [];
    const total = Number(booking.total_amount);
    const options = [
      { type: 'Adult Package',   price: Number(pkg.adult_price) },
      { type: 'Child Package',   price: Number(pkg.child_price) },
      { type: 'Single Sharing',  price: Number(pkg.single_sharing_price) },
      { type: 'Twin Sharing',    price: Number(pkg.twin_sharing_price) },
    ].filter(o => o.price > 0);

    // Try all-same-type first (covers most real cases)
    for (const opt of options) {
      if (Math.round(opt.price * n) === Math.round(total)) {
        return [{ type: opt.type, quantity: n, price: opt.price }];
      }
    }
    // Try each single type for qty=1
    for (const opt of options) {
      if (Math.round(opt.price) === Math.round(total)) {
        return [{ type: opt.type, quantity: 1, price: opt.price }];
      }
    }
    return [];
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      confirmed:  'bg-blue-100 text-blue-800',
      pending:    'bg-amber-100 text-amber-800',
      cancelled:  'bg-red-100 text-red-800',
      completed:  'bg-green-100 text-green-800',
    };
    return map[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? bookings.filter((b) => {
        const primary = b.package_travellers?.[0];
        return (
          b.booking_ref?.toLowerCase().includes(q) ||
          b.tour_packages?.name?.toLowerCase().includes(q) ||
          primary?.name?.toLowerCase().includes(q) ||
          primary?.email?.toLowerCase().includes(q) ||
          primary?.mobile?.includes(q) ||
          b.booking_status?.toLowerCase().includes(q) ||
          b.payment_status?.toLowerCase().includes(q)
        );
      })
    : bookings;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Package Bookings</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="shrink-0">Recent Bookings</CardTitle>
            <div className="relative w-full sm:max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search ref, name, package…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {q ? `No bookings match "${query}".` : 'No bookings found for your hub.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((b) => {
                  const travellers: any[] = b.package_travellers || [];
                  const primary = travellers[0];
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-medium">{b.booking_ref}</TableCell>
                      <TableCell className="font-medium">{b.tour_packages?.name}</TableCell>
                      <TableCell>
                        {primary ? (
                          <div>
                            <p className="font-medium text-sm">{primary.name}</p>
                            <p className="text-xs text-muted-foreground">{primary.email}</p>
                            {primary.mobile && <p className="text-xs text-muted-foreground">{primary.mobile}</p>}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          <Users className="h-3.5 w-3.5" /> {travellers.length}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">₹{Number(b.total_amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${paymentBadge(b.payment_status)}`}>
                          {b.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge(b.booking_status)}`}>
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

      {/* Booking detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
          </SheetHeader>
          {selected && (() => {
            const travellers: any[] = selected.package_travellers || [];
            const details: any[] = Array.isArray(selected.booking_details) && selected.booking_details.length > 0
              ? selected.booking_details
              : deriveTypes(selected);

            const total       = Number(selected.total_amount || 0);
            const wingCredits = Number(selected.wing_credits_used || 0);
            const razorpayPaid = Number(selected.amount_paid || 0);
            const totalPaid   = razorpayPaid + wingCredits;
            const remaining   = Math.max(total - totalPaid, 0);
            return (
              <div className="mt-6 space-y-5 text-sm">

                {/* Booking ref + status */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking</p>
                  <p className="font-mono text-sm font-semibold">{selected.booking_ref}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(selected.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] capitalize ${paymentBadge(selected.payment_status)}`}>{selected.payment_status}</Badge>
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge(selected.booking_status)}`}>{selected.booking_status}</Badge>
                  </div>
                  {selected.payment_id && (
                    <p className="text-xs text-muted-foreground">Payment ID: <code className="font-mono">{selected.payment_id}</code></p>
                  )}
                </div>

                {/* Package name + amount */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Package</p>
                  <p className="font-semibold text-base">{selected.tour_packages?.name}</p>
                  <p className="text-lg font-bold text-foreground">₹{Number(selected.total_amount).toLocaleString('en-IN')}</p>
                </div>

                {/* Package type breakdown — dedicated section */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Package Types Selected</p>
                  {details.length > 0 ? (
                    details.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-background border px-3 py-2">
                        <div>
                          <p className="font-semibold text-sm">{d.type}</p>
                          <p className="text-xs text-muted-foreground">₹{Number(d.price).toLocaleString('en-IN')} / person</p>
                        </div>
                        <span className="text-base font-bold text-foreground">× {d.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {travellers.length} traveller{travellers.length !== 1 ? 's' : ''} — type breakdown not recorded for this booking.
                    </p>
                  )}
                </div>

                {/* Payment breakdown */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Breakdown</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Package Price</span>
                      <span className="font-semibold">₹{total.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="border-t border-border pt-2 space-y-1.5">
                      {wingCredits > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Wing Credits used</span>
                          <span className="font-semibold text-green-600">-₹{wingCredits.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid via Razorpay</span>
                        <span className="font-semibold">₹{razorpayPaid.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-dashed border-border pt-1">
                        <span>Total Paid</span>
                        <span>₹{totalPaid.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {remaining > 0 && (
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="font-semibold text-amber-700">Remaining Balance</span>
                        <span className="font-bold text-amber-700">₹{remaining.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Traveller details */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Travellers ({travellers.length})</p>
                  {travellers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No traveller details available.</p>
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
