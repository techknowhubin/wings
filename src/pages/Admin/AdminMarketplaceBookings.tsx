import { useState } from 'react';
import { useAdminBookings } from '@/hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Star, MapPin, Trophy, Crown, TrendingUp } from 'lucide-react';
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

export default function AdminMarketplaceBookings() {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: allBookings, isLoading } = useAdminBookings({
    status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    paymentStatus: paymentFilter && paymentFilter !== 'all' ? paymentFilter : undefined,
    listingType: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
  });

  // Filter out any cab-related bookings (which have their own sections)
  const bookings = allBookings?.filter((b: any) => 
    b.listing_type !== 'cab' && 
    b.listing_type !== 'outstation' &&
    !b.cabDetails // Filter out any bookings that exist in cab_bookings (e.g. mistakenly logged as 'car')
  ) ?? [];

  const totalBookings = bookings.length;
  const totalRevenue = bookings.filter((b: any) => b.status === 'completed' || b.payment_status === 'completed')
                               .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);

  // Top Listing Types
  const listingTypeCounts: Record<string, number> = {};
  bookings.forEach((b: any) => {
    listingTypeCounts[b.listing_type] = (listingTypeCounts[b.listing_type] || 0) + 1;
  });
  const topListingType = Object.entries(listingTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Top Hosts
  const hostRevenue: Record<string, number> = {};
  const hostNames: Record<string, string> = {};
  bookings.forEach((b: any) => {
    if (b.status === 'completed' || b.payment_status === 'completed') {
      const rev = Number(b.total_amount || 0);
      hostRevenue[b.host_id] = (hostRevenue[b.host_id] || 0) + rev;
      if (b.host?.full_name) hostNames[b.host_id] = b.host.full_name;
    }
  });
  const topHostEntry = Object.entries(hostRevenue).sort((a, b) => b[1] - a[1])[0];
  const topHostName = topHostEntry ? hostNames[topHostEntry[0]] || 'Unknown' : 'N/A';

  // Highest Revenue Listing
  const listingRevenue: Record<string, number> = {};
  bookings.forEach((b: any) => {
    if (b.status === 'completed' || b.payment_status === 'completed') {
      const rev = Number(b.total_amount || 0);
      const key = b.listing_name || 'Unknown';
      listingRevenue[key] = (listingRevenue[key] || 0) + rev;
    }
  });
  const topListingEntry = Object.entries(listingRevenue).sort((a, b) => b[1] - a[1])[0];
  const topRevenueListing = topListingEntry ? topListingEntry[0] : 'N/A';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-[#013220]" /> Marketplace Bookings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage bookings for Stays, Hotels, Experiences, Rentals, and Packages.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center gap-1 min-h-[90px]">
            <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#013220]" /><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bookings</p></div>
            <h3 className="text-xl font-black">{totalBookings}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center gap-1 min-h-[90px]">
            <div className="flex items-center gap-2"><Star className="h-4 w-4 text-emerald-600" /><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revenue</p></div>
            <h3 className="text-xl font-black text-emerald-700">₹{totalRevenue.toLocaleString('en-IN')}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center gap-1 min-h-[90px]">
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-600" /><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Type</p></div>
            <h3 className="text-sm font-bold capitalize truncate">{topListingType}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center gap-1 min-h-[90px]">
            <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-purple-600" /><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Host</p></div>
            <h3 className="text-sm font-bold truncate">{topHostName}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center gap-1 min-h-[90px]">
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Listing</p></div>
            <h3 className="text-sm font-bold truncate" title={topRevenueListing}>{topRevenueListing}</h3>
          </CardContent>
        </Card>
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
            <SelectItem value="package">Packages</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter && statusFilter !== 'all' || paymentFilter && paymentFilter !== 'all' || typeFilter && typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setPaymentFilter(''); setTypeFilter(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Host & Traveller</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Total Amt</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Host Earning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No marketplace bookings match the current filters.</TableCell></TableRow>
                )}
                {bookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell><code className="text-xs font-mono text-muted-foreground">{b.id?.slice(0, 8)}</code></TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm max-w-[150px] truncate" title={b.listing_name}>{b.listing_name || 'Listing'}</span>
                        <Badge variant="outline" className="w-max text-[10px] capitalize mt-0.5">{b.listing_type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-[#013220]" title="Host">{b.host?.full_name ?? '—'}</span>
                        <span className="text-muted-foreground mt-0.5" title="Traveller">{b.traveler?.full_name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.start_date && format(new Date(b.start_date), 'dd MMM')}
                      {b.end_date && ` - ${format(new Date(b.end_date), 'dd MMM')}`}
                    </TableCell>
                    <TableCell className="text-xs">{b.guests ?? 1}</TableCell>
                    <TableCell className="text-xs font-semibold">₹{Number(b.total_amount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-emerald-600 font-semibold">₹{Number(b.commission_amount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-blue-600 font-semibold">₹{Number((b.total_amount || 0) - (b.commission_amount || 0)).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`text-[9px] capitalize w-fit ${STATUS_COLORS[b.status]}`}>{b.status}</Badge>
                        <Badge variant="outline" className={`text-[9px] capitalize w-fit ${PAYMENT_COLORS[b.payment_status]}`}>{b.payment_status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell><Button size="sm" variant="outline" className="text-xs" onClick={() => setSelected(b)}>Details</Button></TableCell>
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
            <SheetTitle>Marketplace Booking Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking Info</p>
                <code className="text-xs font-mono">{selected.id}</code>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[selected.status]}`}>{selected.status}</Badge>
                  <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_COLORS[selected.payment_status]}`}>{selected.payment_status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Listing</p><p className="font-semibold text-base">{selected.listing_name || 'Listing Details Unavailable'}</p><p className="text-xs capitalize text-muted-foreground">{selected.listing_type}</p></div>
                
                <div><p className="text-xs text-muted-foreground">Traveler</p><p className="font-semibold">{selected.traveler?.full_name ?? '—'}</p><p className="text-xs text-muted-foreground">{selected.traveler?.phone ?? '—'}</p><p className="text-[10px] text-muted-foreground truncate" title={selected.traveler?.email}>{selected.traveler?.email ?? '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Host</p><p className="font-semibold">{selected.host?.full_name ?? '—'}</p><p className="text-xs text-muted-foreground">{selected.host?.phone ?? '—'}</p><p className="text-[10px] text-muted-foreground truncate" title={selected.host?.email}>{selected.host?.email ?? '—'}</p></div>
                
                <div><p className="text-xs text-muted-foreground">Total Guests</p><p className="font-semibold">{selected.guests ?? 1}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Amount</p><p className="font-black text-[#013220] text-base">₹{Number(selected.total_amount).toLocaleString('en-IN')}</p></div>
                
                <div><p className="text-xs text-muted-foreground">Host Earnings</p><p className="font-semibold">₹{Number((selected.total_amount || 0) - (selected.commission_amount || 0)).toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Platform Fee</p><p className="font-semibold text-emerald-600">₹{Number(selected.commission_amount ?? 0).toLocaleString('en-IN')}</p></div>
                
                {selected.start_date && <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-semibold">{format(new Date(selected.start_date), 'dd MMM yyyy')}</p></div>}
                {selected.end_date && <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-semibold">{format(new Date(selected.end_date), 'dd MMM yyyy')}</p></div>}
                
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Booking Date</p><p className="font-semibold text-xs">{format(new Date(selected.created_at), 'dd MMM yyyy, hh:mm a')}</p></div>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                 <Button className="w-full" variant="outline">Download Invoice</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
