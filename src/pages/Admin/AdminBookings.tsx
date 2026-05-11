import { useState } from 'react';
import { useAdminBookings } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarCheck, Award } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">{b.host?.full_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{b.listing_type}</Badge></TableCell>
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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking</p>
                <code className="text-xs font-mono">{selected.id}</code>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                  <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLORS[selected.payment_status]}`}>{selected.payment_status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Traveler</p><p className="font-semibold">{selected.traveler?.full_name ?? '—'}</p><p className="text-xs text-muted-foreground">{selected.traveler?.phone ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Provider</p><p className="font-semibold">{selected.host?.full_name ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Service Type</p><p className="font-semibold capitalize">{selected.listing_type}</p></div>
                <div><p className="text-xs text-muted-foreground">Guests</p><p className="font-semibold">{selected.guests ?? 1}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Amount</p><p className="font-semibold">₹{Number(selected.total_amount).toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Commission</p><p className="font-semibold">₹{Number(selected.commission_amount ?? 0).toLocaleString('en-IN')}</p></div>
                {selected.start_date && <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-semibold">{format(new Date(selected.start_date), 'dd MMM yyyy')}</p></div>}
                {selected.end_date && <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-semibold">{format(new Date(selected.end_date), 'dd MMM yyyy')}</p></div>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
