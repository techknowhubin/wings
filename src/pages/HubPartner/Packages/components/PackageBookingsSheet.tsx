import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, IndianRupee } from 'lucide-react';

interface PackageBookingsSheetProps {
  packageId: string | null;
  packageName: string;
  hubId: string;
  open: boolean;
  onClose: () => void;
}

export function PackageBookingsSheet({ packageId, packageName, hubId, open, onClose }: PackageBookingsSheetProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !packageId || !hubId) return;
    setLoading(true);
    supabase
      .from('package_bookings')
      .select(`
        id, booking_ref, total_amount, amount_paid, wing_credits_used,
        payment_status, booking_status, created_at,
        package_travellers(id, name, age, gender, email, mobile),
        booking_details
      `)
      .eq('package_id', packageId)
      .eq('hub_id', hubId)
      .neq('booking_status', 'cancelled')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBookings(data || []);
        setLoading(false);
      });
  }, [open, packageId, hubId]);

  const totalTravellers = bookings.reduce((sum, b) => sum + (b.package_travellers?.length || 0), 0);
  const confirmedRevenue = bookings
    .filter(b => b.booking_status === 'confirmed' || b.booking_status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const statusClass = (s: string) => ({
    confirmed: 'bg-blue-100 text-blue-800',
    pending:   'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-700');

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base leading-snug">Bookings — {packageName}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-muted/20 p-3 text-center">
                <p className="text-2xl font-bold">{bookings.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bookings</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 text-center">
                <p className="text-2xl font-bold">{totalTravellers}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Travellers</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 text-center">
                <p className="text-lg font-bold">₹{confirmedRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No bookings for this package yet.</p>
            ) : (
              bookings.map((b) => {
                const travellers: any[] = b.package_travellers || [];
                const primary = travellers[0];
                const details: any[] = Array.isArray(b.booking_details) ? b.booking_details : [];

                return (
                  <div key={b.id} className="rounded-xl border bg-card overflow-hidden">
                    {/* Booking header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b">
                      <div>
                        <p className="font-mono text-xs font-semibold">{b.booking_ref}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] capitalize ${statusClass(b.booking_status)}`}>
                          {b.booking_status}
                        </Badge>
                        <span className="text-sm font-bold">₹{Number(b.total_amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Package types selected */}
                      {details.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {details.map((d: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {d.type} × {d.quantity}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Travellers */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {travellers.length} Traveller{travellers.length !== 1 ? 's' : ''}
                        </p>
                        {travellers.map((t, i) => (
                          <div key={t.id} className="rounded-lg bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                            <p className="font-semibold text-sm">{t.name} {i === 0 && <span className="text-[10px] text-muted-foreground font-normal">(Primary)</span>}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                              {t.age && <span>Age: {t.age}</span>}
                              {t.gender && <span className="capitalize">{t.gender}</span>}
                              {i === 0 && t.mobile && <span>{t.mobile}</span>}
                              {i === 0 && t.email && <span className="break-all">{t.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Payment summary */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />
                          Paid: ₹{(Number(b.amount_paid || 0) + Number(b.wing_credits_used || 0)).toLocaleString('en-IN')}
                          {Number(b.wing_credits_used) > 0 && ` (incl. ₹${Number(b.wing_credits_used).toLocaleString('en-IN')} credits)`}
                        </span>
                        <span className="text-amber-600 font-medium">
                          Due: ₹{Math.max(Number(b.total_amount) - Number(b.amount_paid || 0) - Number(b.wing_credits_used || 0), 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
