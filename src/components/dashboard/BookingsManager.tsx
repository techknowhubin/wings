import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useHostBookings, useUpdateBookingStatus, useListingTitles } from '@/hooks/useListings';
import { formatPrice, calculateCommission } from '@/lib/supabase-helpers';
import { format, differenceInDays } from 'date-fns';
import type { BookingStatus } from '@/types/database';
import { toast } from 'sonner';

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: CheckCircle },
};

export function BookingsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const { user } = useAuth();

  // Fetch only this host's bookings (filtered server-side by host_id)
  const { data: bookings = [], isLoading } = useHostBookings(user?.id);
  const updateStatus = useUpdateBookingStatus();

  // Batch-fetch listing titles for all bookings
  const listingItems = useMemo(
    () => bookings.map((b) => ({ listing_id: b.listing_id, listing_type: b.listing_type })),
    [bookings]
  );
  const { data: listingTitles = {} } = useListingTitles(listingItems);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (activeTab !== 'all' && booking.booking_status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = listingTitles[booking.listing_id] || '';
        return (
          booking.listing_type.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          booking.id.toLowerCase().includes(q) ||
          (booking.notes || '').toLowerCase().includes(q) ||
          (booking.booking_channel || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, activeTab, searchQuery, listingTitles]);

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateStatus.mutateAsync({ bookingId, status });
      toast.success(`Booking ${status}`);
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const tabCounts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.booking_status === 'pending').length,
    confirmed: bookings.filter((b) => b.booking_status === 'confirmed').length,
    completed: bookings.filter((b) => b.booking_status === 'completed').length,
    cancelled: bookings.filter((b) => b.booking_status === 'cancelled').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reservations</h1>
        <p className="text-muted-foreground mt-1">Manage bookings for your listings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-800">{tabCounts.pending}</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-800">{tabCounts.confirmed}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-800">{tabCounts.completed}</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-800">{tabCounts.cancelled}</span>
            </div>
            <p className="text-sm text-red-700 mt-1">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by listing name, type, booking ID, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({tabCounts.pending})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({tabCounts.confirmed})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({tabCounts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({tabCounts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-secondary rounded w-1/4 mb-2" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card className="py-16">
              <div className="text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'all'
                    ? "You haven't received any bookings yet"
                    : `No ${activeTab} bookings`}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const status = statusConfig[booking.booking_status || 'pending'];
                const StatusIcon = status.icon;
                const duration = differenceInDays(
                  new Date(booking.end_date),
                  new Date(booking.start_date)
                );
                const { hostEarnings, commission, rate } = calculateCommission(booking.total_price, true);
                const listingTitle = listingTitles[booking.listing_id];

                return (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Left Section */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className={status.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {booking.listing_type}
                                </Badge>
                                {booking.booking_channel && (
                                  <Badge variant="secondary" className="capitalize text-xs">
                                    {booking.booking_channel}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold">
                                {listingTitle || `Booking #${booking.id.slice(0, 8)}`}
                              </h3>
                              {listingTitle && (
                                <p className="text-xs text-muted-foreground">ID: {booking.id.slice(0, 8)}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(booking.start_date), 'MMM d, yyyy')} –{' '}
                                {format(new Date(booking.end_date), 'MMM d, yyyy')}
                                <span className="mx-2">·</span>
                                {duration} {duration === 1 ? 'day' : 'days'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled>
                                  <User className="h-4 w-4 mr-2" />
                                  View Guest
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Message Guest
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {booking.booking_status === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Confirm Booking
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                      className="text-destructive"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Decline Booking
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {booking.booking_status === 'confirmed' && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(booking.id, 'completed')}
                                    className="text-blue-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {booking.guests_count ? (
                            <p className="text-sm text-muted-foreground mt-4">
                              {booking.guests_count} guest{booking.guests_count > 1 ? 's' : ''}
                            </p>
                          ) : null}

                          {booking.notes && (
                            <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                              <p className="text-sm text-muted-foreground">{booking.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Section — Pricing */}
                        <div className="lg:w-64 p-6 bg-secondary/30 border-t lg:border-t-0 lg:border-l border-border">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total Amount</span>
                              <span className="font-semibold">{formatPrice(booking.total_price)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Commission ({rate}%)</span>
                              <span className="text-muted-foreground">−{formatPrice(commission)}</span>
                            </div>
                            <div className="pt-3 border-t border-border flex justify-between">
                              <span className="font-medium">Your Earnings</span>
                              <span className="font-bold text-primary">{formatPrice(hostEarnings)}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-border">
                            <Badge
                              variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}
                              className="w-full justify-center capitalize"
                            >
                              Payment: {booking.payment_status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
