import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  ArrowUpRight,
  Wallet,
  PiggyBank,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useHostBookings } from '@/hooks/useListings';
import { formatPrice, calculateCommission } from '@/lib/supabase-helpers';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export function EarningsTracker() {
  const [period, setPeriod] = useState('this-month');
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useHostBookings(user?.id);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last-3-months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last-6-months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'all-time':
      default:
        return { start: new Date(0), end: now };
    }
  };

  const filteredBookings = useMemo(() => {
    const { start, end } = getDateRange();
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return isWithinInterval(bookingDate, { start, end });
    });
  }, [bookings, period]);

  const completedBookings = filteredBookings.filter((b) => b.payment_status === 'completed');
  const pendingBookings = filteredBookings.filter((b) => b.payment_status === 'pending');

  const totalEarnings = completedBookings.reduce((sum, b) => {
    const { hostEarnings } = calculateCommission(b.total_price, true);
    return sum + hostEarnings;
  }, 0);

  const totalCommission = completedBookings.reduce((sum, b) => {
    const { commission } = calculateCommission(b.total_price, true);
    return sum + commission;
  }, 0);

  const pendingEarnings = pendingBookings.reduce((sum, b) => {
    const { hostEarnings } = calculateCommission(b.total_price, true);
    return sum + hostEarnings;
  }, 0);

  const avgBookingValue = completedBookings.length > 0 
    ? totalEarnings / completedBookings.length 
    : 0;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months: Record<string, { earnings: number; bookings: number }> = {};
    
    completedBookings.forEach((booking) => {
      const monthKey = format(new Date(booking.created_at), 'MMM yyyy');
      if (!months[monthKey]) {
        months[monthKey] = { earnings: 0, bookings: 0 };
      }
      const { hostEarnings } = calculateCommission(booking.total_price, true);
      months[monthKey].earnings += hostEarnings;
      months[monthKey].bookings += 1;
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    })).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
  }, [completedBookings]);

  // Earnings by listing type
  const earningsByType = useMemo(() => {
    const types: Record<string, number> = {};
    
    completedBookings.forEach((booking) => {
      if (!types[booking.listing_type]) {
        types[booking.listing_type] = 0;
      }
      const { hostEarnings } = calculateCommission(booking.total_price, true);
      types[booking.listing_type] += hostEarnings;
    });

    return Object.entries(types).map(([type, earnings]) => ({
      type,
      earnings,
      percentage: totalEarnings > 0 ? (earnings / totalEarnings) * 100 : 0,
    }));
  }, [completedBookings, totalEarnings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-1">Track your revenue and commission breakdown</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-primary-text mb-2">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium">Total Earnings</span>
            </div>
            <p className="text-3xl font-bold text-primary-text">{formatPrice(totalEarnings)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              From {completedBookings.length} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <PiggyBank className="h-5 w-5" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-3xl font-bold">{formatPrice(pendingEarnings)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingBookings.length} awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Receipt className="h-5 w-5" />
              <span className="text-sm font-medium">Commission Paid</span>
            </div>
            <p className="text-3xl font-bold">{formatPrice(totalCommission)}</p>
            <p className="text-sm text-muted-foreground mt-1">20% marketplace fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-accent mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Avg. Booking</span>
            </div>
            <p className="text-3xl font-bold">{formatPrice(avgBookingValue)}</p>
            <p className="text-sm text-muted-foreground mt-1">Per completed booking</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Info */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-primary-text">Save on Commission!</h3>
              <p className="text-muted-foreground mt-1">
                Create your Link-in-Bio page and pay only 10% commission instead of 20%
              </p>
            </div>
            <Button className="shrink-0" asChild>
              <a href="/host/link">
                Create Link-in-Bio
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Your earnings month by month</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No earnings data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyData.map((data) => (
                  <div key={data.month} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">{data.month}</p>
                      <p className="text-sm text-muted-foreground">{data.bookings} bookings</p>
                    </div>
                    <p className="text-lg font-bold text-primary-text">{formatPrice(data.earnings)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Category</CardTitle>
            <CardDescription>Revenue distribution across listing types</CardDescription>
          </CardHeader>
          <CardContent>
            {earningsByType.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No earnings data yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {earningsByType.map((data) => (
                  <div key={data.type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{data.type}s</span>
                      <span className="text-sm text-muted-foreground">
                        {data.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${data.percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{formatPrice(data.earnings)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest completed bookings and payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {completedBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedBookings.slice(0, 10).map((booking) => {
                const { hostEarnings, commission, rate } = calculateCommission(booking.total_price, true);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-100">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.created_at), 'MMM d, yyyy')} •{' '}
                          <span className="capitalize">{booking.listing_type}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{formatPrice(hostEarnings)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(booking.total_price)} - {rate}% fee
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
