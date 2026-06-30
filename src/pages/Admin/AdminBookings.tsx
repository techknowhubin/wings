import { useState, useEffect } from 'react';
import { useAdminBookings } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, Award, MapPin, User, IndianRupee, FileText, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-700',
  refunded: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [selectedPaymentMeta, setSelectedPaymentMeta] = useState<{ wingCredits: number; couponCode: string | null; couponDiscount: number } | null>(null);

  useEffect(() => {
    if (!selected) { setSelectedPaymentMeta(null); return; }

    // Parse notes for fallback values (used when DB records don't exist yet, e.g. pending/failed bookings)
    let parsedNotes: any = null;
    try { if (selected.notes) parsedNotes = typeof selected.notes === 'string' ? JSON.parse(selected.notes) : selected.notes; } catch {}
    const pricingFallback = parsedNotes?.pricing ?? null;

    (async () => {
      // Wing credits from DB (only exist after successful payment)
      const { data: wtData } = await supabase
        .from('wallet_transactions' as any)
        .select('amount')
        .eq('reference_id', selected.id)
        .eq('type', 'booking_redemption');
      const dbWingCredits = wtData && wtData.length > 0
        ? Math.abs(wtData.reduce((s: number, r: any) => s + Number(r.amount), 0))
        : null;

      // Coupon from DB via paymentId in booking_context (only exists after successful payment)
      let dbCouponCode: string | null = null;
      if (selected.transaction_id) {
        const { data: crData } = await supabase
          .from('host_coupon_redemptions' as any)
          .select('coupon_id, coupon:host_coupons(code)')
          .eq('user_id', selected.user_id)
          .filter('booking_context->>paymentId', 'eq', selected.transaction_id)
          .maybeSingle();
        if (crData) dbCouponCode = (crData as any).coupon?.code ?? null;
      }

      // DB values take priority (confirmed payments); fall back to notes.pricing (pending/failed)
      const wingCredits = dbWingCredits  ?? pricingFallback?.wingCreditsUsed ?? 0;
      const couponCode  = dbCouponCode   ?? pricingFallback?.couponCode       ?? null;
      const couponDiscount = pricingFallback?.couponDiscount ?? 0;

      setSelectedPaymentMeta({ wingCredits, couponCode, couponDiscount });
    })();
  }, [selected?.id]);

  const { data: bookings, isLoading } = useAdminBookings({
    status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    paymentStatus: paymentFilter && paymentFilter !== 'all' ? paymentFilter : undefined,
    listingType: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">All Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor all transactions across the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Booking status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Service type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stay">Stays</SelectItem>
            <SelectItem value="hotel">Hotels</SelectItem>
            <SelectItem value="resort">Resorts</SelectItem>
            <SelectItem value="car">Cars</SelectItem>
            <SelectItem value="bike">Bikes</SelectItem>
            <SelectItem value="experience">Experiences</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter && statusFilter !== 'all' || paymentFilter && paymentFilter !== 'all' || typeFilter && typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setPaymentFilter(''); setTypeFilter(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Traveler</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Hub Partner</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bookings ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No bookings match the current filters.</TableCell></TableRow>
                )}
                {(bookings ?? []).map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell><code className="text-xs font-mono text-muted-foreground">{b.id?.slice(0, 8)}</code></TableCell>
                    <TableCell className="text-xs font-medium">{b.traveler?.full_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{b.listing_type}</Badge></TableCell>
                    <TableCell className="text-xs">{b.cabDetails?.distance_km ? `${b.cabDetails.distance_km} KM` : '—'}</TableCell>
                    <TableCell>
                      {b.cabDetails?.hubPartnerName ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{b.cabDetails.hubPartnerName}</span>
                          <span className="text-[10px] text-muted-foreground">{b.cabDetails.assignment_status || 'Assigned'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{b.listing_type === 'car' || b.listing_type === 'bike' ? (b.cabDetails?.assignment_status || 'Unassigned') : '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">₹{Number(b.total_amount).toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[b.status]}`}>{b.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLORS[b.payment_status]}`}>{b.payment_status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(b)}>Details</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
          </SheetHeader>
          {selected && (() => {
            let parsedNotes: any = null;
            try {
              if (selected.notes) parsedNotes = typeof selected.notes === 'string' ? JSON.parse(selected.notes) : selected.notes;
            } catch {}
            const primaryGuest = parsedNotes?.primaryGuest;
            const travelerEmail = selected.traveler?.email || primaryGuest?.email;
            const additionalGuests: any[] = parsedNotes?.additionalGuests || [];

            return (
              <div className="mt-6 space-y-4 text-sm">

                {/* Booking Reference */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Booking Reference</p>
                  <code className="text-xs font-mono break-all">{selected.id}</code>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                    <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLORS[selected.payment_status]}`}>{selected.payment_status}</Badge>
                  </div>
                  {selected.transaction_id && (
                    <p className="text-xs text-muted-foreground">Txn ID: <span className="font-mono font-medium text-foreground">{selected.transaction_id}</span></p>
                  )}
                  {selected.payment_method && (
                    <p className="text-xs text-muted-foreground">Payment Method: <span className="font-medium text-foreground capitalize">{selected.payment_method}</span></p>
                  )}
                  <p className="text-xs text-muted-foreground">Created: <span className="font-medium text-foreground">{format(new Date(selected.created_at), 'dd MMM yyyy, hh:mm a')}</span></p>
                </div>

                {/* Failure / Cancellation Alert */}
                {(selected.failure_reason || selected.cancellation_reason) && (
                  <div className="p-3 rounded-xl border border-red-200 bg-red-50 space-y-1">
                    {selected.failure_reason && (
                      <p className="text-xs text-red-700"><span className="font-bold">Failure Reason:</span> {selected.failure_reason}</p>
                    )}
                    {selected.cancellation_reason && (
                      <p className="text-xs text-red-700"><span className="font-bold">Cancellation Reason:</span> {selected.cancellation_reason}</p>
                    )}
                    {selected.payment_attempted_at && (
                      <p className="text-xs text-red-600">Attempted: {format(new Date(selected.payment_attempted_at), 'dd MMM yyyy, hh:mm a')}</p>
                    )}
                  </div>
                )}

                {/* Traveller — Primary Guest */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Traveller Details</p>

                  {/* Primary guest as entered in booking form */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Primary Guest</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-semibold">{primaryGuest?.name || selected.traveler?.full_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-semibold">{primaryGuest?.phone || selected.traveler?.phone || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-semibold break-all">{travelerEmail || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Guests</p>
                        <p className="font-semibold">{selected.guests ?? 1}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional guests with all fields */}
                  {additionalGuests.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Additional Guests ({additionalGuests.length})</p>
                      {additionalGuests.map((g: any, i: number) => (
                        <div key={i} className="bg-background rounded-lg border border-border p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-foreground">Guest {i + 2}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {g.name && <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{g.name}</span></div>}
                            {g.phone && <div><span className="text-muted-foreground">Phone: </span><span className="font-medium">{g.phone}</span></div>}
                            {g.email && <div className="col-span-2"><span className="text-muted-foreground">Email: </span><span className="font-medium">{g.email}</span></div>}
                            {g.age && <div><span className="text-muted-foreground">Age: </span><span className="font-medium">{g.age}</span></div>}
                            {g.id_proof && <div><span className="text-muted-foreground">ID Proof: </span><span className="font-medium">{g.id_proof}</span></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Provider & Booking Info */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><CalendarCheck className="h-3 w-3" /> Booking Info</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Provider</p><p className="font-semibold">{selected.host?.full_name ?? '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">Service Type</p><p className="font-semibold capitalize">{selected.listing_type}</p></div>
                    {selected.start_date && <div><p className="text-xs text-muted-foreground">Check-in / From</p><p className="font-semibold">{format(new Date(selected.start_date), 'dd MMM yyyy')}</p></div>}
                    {selected.end_date && <div><p className="text-xs text-muted-foreground">Check-out / To</p><p className="font-semibold">{format(new Date(selected.end_date), 'dd MMM yyyy')}</p></div>}
                  </div>
                </div>

                {/* Cab / Trip Details — immediately below Booking Info */}
                {(selected.cabDetails || (selected.listing_type === 'cab' && parsedNotes?.cabDetails)) && (() => {
                  const cab = selected.cabDetails ?? (parsedNotes as any)?.cabDetails;
                  return (
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" /> Cab / Trip Details</p>

                    <div className="space-y-1">
                      <div className="flex gap-2 items-start"><span className="text-green-600 font-bold text-xs shrink-0 mt-0.5">Pickup:</span><span className="text-sm font-medium">{cab.pickup_location || '—'}</span></div>
                      <div className="flex gap-2 items-start"><span className="text-red-600 font-bold text-xs shrink-0 mt-0.5">Drop:</span><span className="text-sm font-medium">{cab.drop_location || '—'}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-xs text-muted-foreground">Vehicle</p><p className="font-semibold">{cab.cab_type || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Distance</p><p className="font-semibold">{cab.distance_km ? `${cab.distance_km} km` : '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Travel Date</p><p className="font-semibold">{cab.travel_date ? format(new Date(cab.travel_date), 'dd MMM yyyy, hh:mm a') : '—'}</p></div>
                      {cab.return_date && (
                        <div><p className="text-xs text-muted-foreground">Return Date</p><p className="font-semibold">{format(new Date(cab.return_date), 'dd MMM yyyy')}</p></div>
                      )}
                      <div><p className="text-xs text-muted-foreground">Booking Type</p><p className="font-semibold">{cab.booking_type || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Customer Name</p><p className="font-semibold">{cab.customer_name || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Customer Phone</p><p className="font-semibold">{cab.customer_phone || '—'}</p></div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Fare Breakdown</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Base Fare</span><span>₹{Number(cab.base_fare || cab.base_amount || 0).toLocaleString('en-IN')}</span></div>
                        {Number(cab.airport_parking_charge) > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Airport Parking</span><span>₹{Number(cab.airport_parking_charge).toLocaleString('en-IN')}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">GST ({cab.gst_percentage || 0}%)</span><span>₹{Number(cab.gst_amount || 0).toLocaleString('en-IN')}</span></div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-semibold"><span>Full Trip Fare</span><span>₹{Number(cab.fare_amount || 0).toLocaleString('en-IN')}</span></div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-xs text-muted-foreground">Hub Partner</p><p className="font-semibold">{cab.hubPartnerName || 'Unassigned'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Assignment Status</p><p className="font-semibold">{cab.assignment_status || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">District</p><p className="font-semibold">{cab.assigned_district || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Area</p><p className="font-semibold">{cab.assigned_area || '—'}</p></div>
                    </div>

                    {cab.pickup_latitude && cab.pickup_longitude && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Pickup Map</p>
                        <div className="rounded-xl overflow-hidden border border-border/50">
                          <iframe
                            width="100%"
                            height="180"
                            style={{ border: 0 }}
                            src={cab.drop_latitude && cab.drop_longitude
                              ? `https://maps.google.com/maps?saddr=${cab.pickup_latitude},${cab.pickup_longitude}&daddr=${cab.drop_latitude},${cab.drop_longitude}&output=embed`
                              : `https://maps.google.com/maps?q=${cab.pickup_latitude},${cab.pickup_longitude}&z=15&output=embed`}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${cab.pickup_latitude},${cab.pickup_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-sm transition-colors"
                        >
                          <MapPin className="h-4 w-4" />
                          Open in Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Financials */}
                {(() => {
                  const p = parsedNotes?.pricing;
                  const amountPaid = Number(selected.total_price ?? selected.total_amount ?? 0);

                  // Full fare: pricing block → cab fare_amount → base+gst
                  const cabFare = selected.cabDetails?.fare_amount ? Number(selected.cabDetails.fare_amount) : 0;
                  const totalBeforeDiscounts = p?.totalBeforeDiscounts
                    ?? (cabFare > 0 ? cabFare : Number(selected.base_amount ?? 0) + Number(selected.gst_amount ?? 0));

                  const isBookingFeeOnly = p
                    ? p.paymentType === 'booking_fee'
                    : totalBeforeDiscounts > 0 && amountPaid > 0 && totalBeforeDiscounts > amountPaid * 1.5;

                  // For old bookings: infer booking fee amount using 20% default rate
                  const feePercent = p?.bookingFeePercent ?? 20;
                  const bookingFeeAmount = isBookingFeeOnly
                    ? (p ? amountPaid + (p.couponDiscount ?? 0) + (p.wingCreditsUsed ?? 0) + (p.hostDiscount ?? 0)
                         : Math.round(totalBeforeDiscounts * feePercent / 100))
                    : totalBeforeDiscounts;

                  // Discounts
                  const hostDiscount   = p?.hostDiscount ?? 0;
                  const couponDiscount = p?.couponDiscount ?? 0;
                  const wingCredits    = p?.wingCreditsUsed ?? 0;
                  // For old bookings: infer combined discount from booking fee vs amount paid
                  const impliedDiscount = (!p && isBookingFeeOnly) ? Math.max(bookingFeeAmount - amountPaid, 0) : 0;
                  const totalDiscount  = p ? (hostDiscount + couponDiscount + wingCredits) : impliedDiscount;

                  // Remaining = full fare minus the booking-fee portion (not minus what was paid)
                  const remainingAmount = isBookingFeeOnly
                    ? Math.max(totalBeforeDiscounts - bookingFeeAmount, 0)
                    : 0;

                  return (
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Payment Breakdown</p>

                      <div className="space-y-1.5 text-sm">
                        {/* Base + Tax (new bookings only) */}
                        {p && (
                          <>
                            <div className="flex justify-between text-muted-foreground text-xs">
                              <span>Base Amount</span>
                              <span>₹{Number(p.baseAmount).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground text-xs">
                              <span>GST</span>
                              <span>₹{Number(p.gstAmount).toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between font-semibold">
                          <span>Total Fare</span>
                          <span>₹{totalBeforeDiscounts.toLocaleString('en-IN')}</span>
                        </div>

                        {isBookingFeeOnly && (
                          <div className="flex justify-between text-muted-foreground text-xs">
                            <span>Booking Fee ({feePercent}%)</span>
                            <span>₹{bookingFeeAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Discounts — detailed for new bookings, combined for old */}
                        {p ? (
                          <>
                            {hostDiscount > 0 && (
                              <div className="flex justify-between text-green-700 text-xs">
                                <span>Host Discount</span>
                                <span>- ₹{hostDiscount.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {couponDiscount > 0 && (
                              <div className="flex justify-between text-green-700 text-xs">
                                <span>Coupon ({p.couponCode || 'Applied'})</span>
                                <span>- ₹{couponDiscount.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {wingCredits > 0 && (
                              <div className="flex justify-between text-green-700 text-xs">
                                <span>Wing Credits</span>
                                <span>- ₹{wingCredits.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </>
                        ) : impliedDiscount > 0 && (
                          <div className="flex justify-between text-green-700 text-xs">
                            <span>Discounts Applied (coupon / credits)</span>
                            <span>- ₹{impliedDiscount.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        <Separator className="my-1" />

                        <div className="flex justify-between font-bold text-base">
                          <span>Amount Paid</span>
                          <span className="text-[#013220]">₹{amountPaid.toLocaleString('en-IN')}</span>
                        </div>

                        {remainingAmount > 0 && (
                          <div className="flex justify-between font-semibold text-amber-700">
                            <span>Remaining (Pay at Service)</span>
                            <span>₹{remainingAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>

                      {/* Coupon & Wing Credits labels */}
                      {(() => {
                        const meta = selectedPaymentMeta;
                        // DB records take priority (meta always fetched now); notes.pricing as fallback
                        const displayCoupon = meta?.couponCode ?? p?.couponCode ?? null;
                        const displayCouponDiscount = meta?.couponDiscount || couponDiscount;
                        const displayWingCredits = meta?.wingCredits ?? wingCredits;

                        return (
                          <>
                            <Separator className="my-1" />
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Coupon Applied</span>
                                {displayCoupon
                                  ? <span className="font-semibold text-green-700">
                                      {displayCoupon}{displayCouponDiscount > 0 ? ` (- ₹${Number(displayCouponDiscount).toLocaleString('en-IN')})` : ''}
                                    </span>
                                  : <span className="text-muted-foreground">—</span>}
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Wing Credits Used</span>
                                {displayWingCredits > 0
                                  ? <span className="font-semibold text-blue-700">₹{displayWingCredits.toLocaleString('en-IN')}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}

              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
