import { useState, useMemo } from 'react';
import { useAdminAnalyticsData } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Wallet, BarChart3, Zap, Calculator, Percent,
  ArrowRightLeft, QrCode, Tag, RotateCcw, AlertTriangle, ShieldCheck, CheckSquare
} from 'lucide-react';

const INR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CATEGORY_COLORS: Record<string, string> = {
  'Homestays': '#013220',
  'Hotels': '#6366f1',
  'Resorts': '#10b981',
  'Cab Bookings': '#f59e0b',
  'Tour Packages': '#8b5cf6',
  'Activities': '#ec4899',
  'Restaurants': '#14b8a6',
  'Chai Points': '#ef4444',
  'Car Rentals': '#f97316',
  'Bike Rentals': '#06b6d4',
  'Packages/Experiences': '#8b5cf6',
};

const PARTNER_COLORS: Record<string, string> = {
  'Franchise': '#6366f1',
  'Hub': '#10b981',
  'Restaurant': '#14b8a6',
  'Chai Point': '#ef4444',
  'Cab Driver': '#f59e0b',
};

// Simulator seed data (kept for simulator tab only)
const SIM_INITIAL_BOOKINGS = [
  {
    booking_id: 'BK-7049',
    user_id: 'USR-8931',
    user_name: 'Anjali Sharma',
    host_id: 'HST-2291',
    host_name: 'Green Villa Homestay',
    category: 'Homestays',
    city: 'Coorg',
    amount: 10000,
    coupon_applied: 'WELCOME10',
    coupon_discount: 1000,
    coupon_funded_by: 'Host',
    booking_fee: 900,
    platform_revenue: 810,
    referral_commission: 90,
    host_earning: 8100,
    payment_status: 'completed',
    booking_status: 'completed',
    referral_partner: 'Hub-4291',
    partner_type: 'Hub',
    created_at: '2026-06-01T10:30:00Z',
  },
  {
    booking_id: 'BK-5523',
    user_id: 'USR-1204',
    user_name: 'Rohan Mehta',
    host_id: 'HST-1102',
    host_name: 'Sea Breeze Hotel',
    category: 'Hotels',
    city: 'Goa',
    amount: 15000,
    coupon_applied: 'None',
    coupon_discount: 0,
    coupon_funded_by: 'None',
    booking_fee: 1500,
    platform_revenue: 1350,
    referral_commission: 150,
    host_earning: 13500,
    payment_status: 'completed',
    booking_status: 'confirmed',
    referral_partner: 'Cab-9081',
    partner_type: 'Cab Driver',
    created_at: '2026-06-03T14:15:00Z',
  },
];

export default function AdminAnalytics() {
  const { toast } = useToast();

  // Real data from database
  const { data: realBookings = [], isLoading: realDataLoading } = useAdminAnalyticsData();

  // Custom Dynamic State for Engine configuration & Simulation
  const [commissionConfig, setCommissionConfig] = useState({
    bookingFeePct: 10, // Platform Booking Fee
    franchiseCommPct: 10, // Referrer share of Booking Fee
    hubCommPct: 10,
    restaurantCommPct: 10,
    chaiPointCommPct: 10,
    cabDriverCommPct: 10,
  });

  // Simulator-only state (separate from real data)
  const [simBookingsList, setSimBookingsList] = useState(SIM_INITIAL_BOOKINGS);

  // New Booking Simulator Form State
  const [simAmount, setSimAmount] = useState<number>(10000);
  const [simCategory, setSimCategory] = useState<string>('Homestays');
  const [simCity, setSimCity] = useState<string>('Coorg');
  const [simReferrer, setSimReferrer] = useState<string>('Hub');
  const [simCouponCode, setSimCouponCode] = useState<string>('');
  const [simCouponDiscount, setSimCouponDiscount] = useState<number>(0);
  const [simCouponFundedBy, setSimCouponFundedBy] = useState<'Host' | 'Platform'>('Host');
  const [simHostId, setSimHostId] = useState<string>('HST-001');
  const [simHostName, setSimHostName] = useState<string>('Standard Host');

  // Refund Simulator State
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<string>('');
  const [cancellationTiming, setCancellationTiming] = useState<'before' | 'after'>('before');
  const [cancellationChargesPct, setCancellationChargesPct] = useState<number>(30);

  // Dynamic calculations based on configuration
  const calculatedOutput = useMemo(() => {
    const finalAmount = Math.max(simAmount - simCouponDiscount, 0);
    const bookingFee = Math.round(finalAmount * (commissionConfig.bookingFeePct / 100));
    
    // Determine partner referral commission percentage based on partner type
    let partnerSharePct = 10;
    if (simReferrer === 'Franchise') partnerSharePct = commissionConfig.franchiseCommPct;
    else if (simReferrer === 'Hub') partnerSharePct = commissionConfig.hubCommPct;
    else if (simReferrer === 'Restaurant') partnerSharePct = commissionConfig.restaurantCommPct;
    else if (simReferrer === 'Chai Point') partnerSharePct = commissionConfig.chaiPointCommPct;
    else if (simReferrer === 'Cab Driver') partnerSharePct = commissionConfig.cabDriverCommPct;

    const referralCommission = Math.round(bookingFee * (partnerSharePct / 100));
    
    // Platform revenue gets the rest of the booking fee. If coupon is platform-funded, we subtract it from platform revenue.
    let basePlatformRevenue = bookingFee - referralCommission;
    let netPlatformRevenue = basePlatformRevenue;
    if (simCouponDiscount > 0 && simCouponFundedBy === 'Platform') {
      netPlatformRevenue -= simCouponDiscount;
    }

    // Host earnings: final payable amount minus the booking fee. If coupon is host-funded, host earnings is affected.
    const hostEarning = finalAmount - bookingFee;

    return {
      finalAmount,
      bookingFee,
      referralCommission,
      netPlatformRevenue,
      hostEarning,
      partnerSharePct,
    };
  }, [simAmount, simCouponDiscount, simCouponFundedBy, simReferrer, commissionConfig]);

  // Handle Recording simulated booking into ledger
  const handleRecordBooking = () => {
    if (simAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Listing amount must be greater than 0' });
      return;
    }

    const newBooking = {
      booking_id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      user_name: 'Simulated Traveler',
      host_id: simHostId,
      host_name: simHostName,
      category: simCategory,
      city: simCity,
      amount: simAmount,
      coupon_applied: simCouponCode || 'None',
      coupon_discount: simCouponDiscount,
      coupon_funded_by: simCouponDiscount > 0 ? simCouponFundedBy : 'None',
      booking_fee: calculatedOutput.bookingFee,
      platform_revenue: calculatedOutput.netPlatformRevenue,
      referral_commission: calculatedOutput.referralCommission,
      host_earning: calculatedOutput.hostEarning,
      payment_status: 'completed',
      booking_status: 'completed',
      referral_partner: `${simReferrer}-${Math.floor(1000 + Math.random() * 9000)}`,
      partner_type: simReferrer,
      created_at: new Date().toISOString(),
    };

    setSimBookingsList([newBooking, ...simBookingsList]);
    toast({
      title: 'Booking Recorded Successfully!',
      description: `Recorded booking ${newBooking.booking_id} with Platform Revenue of ${INR(newBooking.platform_revenue)}`,
    });
  };

  // Handle Cancellation/Refund simulation
  const handleProcessRefund = () => {
    if (!selectedBookingToCancel) {
      toast({ variant: 'destructive', title: 'Select Booking', description: 'Please select a booking to cancel.' });
      return;
    }

    setSimBookingsList(prev => prev.map(b => {
      if (b.booking_id === selectedBookingToCancel) {
        if (cancellationTiming === 'before') {
          // Free Cancellation: Full Refund, reverse everything
          return {
            ...b,
            booking_status: 'cancelled',
            payment_status: 'refunded',
            platform_revenue: 0,
            referral_commission: 0,
            host_earning: 0,
          };
        } else {
          // After window: Retain configured cancellation charges (e.g. 30% penalty)
          const penaltyAmount = b.amount * (cancellationChargesPct / 100);
          // Platform retains booking fee, rest goes to Host or is split
          const penaltyBookingFee = Math.round(penaltyAmount * (commissionConfig.bookingFeePct / 100));
          const penaltyReferral = Math.round(penaltyBookingFee * (10 / 100)); // standard 10%
          const penaltyPlatform = penaltyBookingFee - penaltyReferral;
          const penaltyHost = penaltyAmount - penaltyBookingFee;

          return {
            ...b,
            booking_status: 'cancelled',
            payment_status: 'refunded',
            platform_revenue: penaltyPlatform,
            referral_commission: penaltyReferral,
            host_earning: penaltyHost,
          };
        }
      }
      return b;
    }));

    toast({
      title: 'Cancellation Processed',
      description: `Booking ${selectedBookingToCancel} cancellation processed successfully.`,
    });
  };

  // Financial metrics calculated over the entire ledger
  const ledgerMetrics = useMemo(() => {
    let totalGMV = 0;
    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let pendingRevenue = 0;

    let totalBookings = 0;
    let bookingFeeRevenue = 0;
    let couponImpact = 0;
    let refundImpact = 0;

    let franchiseComm = 0;
    let hubComm = 0;
    let restComm = 0;
    let chaiComm = 0;
    let cabComm = 0;

    let totalHostEarnings = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = new Date().toISOString().substring(0, 7);

    // Use REAL bookings from DB for overview metrics
    realBookings.forEach(b => {
      const isCompletedOrConfirmed = b.booking_status === 'completed' || b.booking_status === 'confirmed';
      
      if (isCompletedOrConfirmed) {
        totalGMV += b.amount;
        bookingFeeRevenue += b.booking_fee;
        couponImpact += b.coupon_discount;

        if (b.payment_status === 'completed') {
          yearlyRevenue += b.platform_revenue;
          if (b.created_at.startsWith(todayStr)) {
            todayRevenue += b.platform_revenue;
          }
          if (b.created_at.startsWith(monthStr)) {
            monthlyRevenue += b.platform_revenue;
          }
          completedPayouts += b.host_earning;
        } else if (b.payment_status === 'pending') {
          pendingRevenue += b.platform_revenue;
          pendingPayouts += b.host_earning;
        }

        totalHostEarnings += b.host_earning;
        totalBookings += 1;
      } else if (b.booking_status === 'cancelled') {
        refundImpact += (b.amount - b.host_earning - b.platform_revenue);
      }
    });

    return {
      totalGMV,
      todayRevenue,
      monthlyRevenue,
      yearlyRevenue,
      pendingRevenue,
      totalBookings,
      bookingFeeRevenue,
      couponImpact,
      refundImpact,
      franchiseComm,
      hubComm,
      restComm,
      chaiComm,
      cabComm,
      totalHostEarnings,
      pendingPayouts,
      completedPayouts,
    };
  }, [realBookings]);

  // Aggregate Category Chart Data (real bookings)
  const categoryChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    realBookings.forEach(b => {
      if (b.booking_status !== 'cancelled') {
        categoryTotals[b.category] = (categoryTotals[b.category] ?? 0) + b.platform_revenue;
      }
    });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [realBookings]);

  // Aggregate Referral Partner Commission Data
  const partnerPieData = useMemo(() => {
    return [
      { name: 'Franchise', value: ledgerMetrics.franchiseComm },
      { name: 'Hub', value: ledgerMetrics.hubComm },
      { name: 'Restaurant', value: ledgerMetrics.restComm },
      { name: 'Chai Point', value: ledgerMetrics.chaiComm },
      { name: 'Cab Driver', value: ledgerMetrics.cabComm },
    ].filter(p => p.value > 0);
  }, [ledgerMetrics]);

  // Daily Trend (real bookings)
  const dailyTrendData = useMemo(() => {
    const dates: Record<string, { gmv: number; revenue: number; host: number }> = {};
    realBookings.forEach(b => {
      const date = b.created_at.split('T')[0].slice(5); // MM-DD format
      if (!dates[date]) dates[date] = { gmv: 0, revenue: 0, host: 0 };
      if (b.booking_status !== 'cancelled') {
        dates[date].gmv += b.amount;
        dates[date].revenue += b.platform_revenue;
        dates[date].host += b.host_earning;
      }
    });
    return Object.entries(dates)
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [realBookings]);

  // Derived views from real bookings
  const bookingsSchemaView = realBookings;

  const revenueTransactionsSchemaView = useMemo(() => {
    const transactions: any[] = [];
    realBookings.forEach((b, idx) => {
      if (b.booking_fee > 0) {
        transactions.push({
          transaction_id: `TX-FEE-${1000 + idx}`,
          booking_id: b.booking_id,
          revenue_type: 'Booking Fee',
          amount: b.booking_fee,
          status: b.payment_status,
          created_at: b.created_at,
        });
      }
      if (b.platform_revenue > 0) {
        transactions.push({
          transaction_id: `TX-REV-${2000 + idx}`,
          booking_id: b.booking_id,
          revenue_type: 'Platform Revenue',
          amount: b.platform_revenue,
          status: b.payment_status,
          created_at: b.created_at,
        });
      }
      if (b.coupon_discount > 0 && b.coupon_funded_by === 'Platform') {
        transactions.push({
          transaction_id: `TX-CPN-${3000 + idx}`,
          booking_id: b.booking_id,
          revenue_type: 'Coupon Cost',
          amount: -b.coupon_discount,
          status: b.payment_status,
          created_at: b.created_at,
        });
      }
    });
    return transactions;
  }, [realBookings]);

  const referralCommissionsSchemaView = useMemo(() => {
    return realBookings
      .filter(b => b.referral_commission > 0)
      .map((b, idx) => ({
        referral_id: `REF-COMM-${1000 + idx}`,
        booking_id: b.booking_id,
        partner_id: b.referral_partner,
        partner_type: b.partner_type,
        commission_amount: b.referral_commission,
        status: b.payment_status === 'completed' ? 'paid' : 'pending',
      }));
  }, [realBookings]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#013220]">Platform Revenue Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete revenue engine tracking bookings, coupons, referrals, payouts, and engine simulations.
          </p>
        </div>
        {realDataLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Loading live data…
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="simulator">Revenue Engine Simulator</TabsTrigger>
          <TabsTrigger value="ledger">Engine Audit Ledger</TabsTrigger>
          <TabsTrigger value="configs">Configuration Rules</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW & ANALYTICS TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {realDataLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-5">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-7 w-28 mb-1" />
                    <Skeleton className="h-2 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total GMV</p>
                <p className="text-2xl font-black text-[#013220]">{INR(ledgerMetrics.totalGMV)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Booking GMV</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Today's Revenue</p>
                <p className="text-2xl font-black text-emerald-600">{INR(ledgerMetrics.todayRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Platform earnings today</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Monthly Revenue</p>
                <p className="text-2xl font-black text-[#6366f1]">{INR(ledgerMetrics.monthlyRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Platform monthly total</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Platform Net Revenue</p>
                <p className="text-2xl font-black text-amber-500">{INR(ledgerMetrics.yearlyRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Net Platform Earnings</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pending Revenue</p>
                <p className="text-2xl font-black text-rose-500">{INR(ledgerMetrics.pendingRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Unsettled online bookings</p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Sub Stats breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Revenue Statistics */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-[#013220]" /> Booking Revenue Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Bookings</span>
                  <span className="font-bold">{ledgerMetrics.totalBookings} Bookings</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Gross Booking Fee</span>
                  <span className="font-bold">{INR(ledgerMetrics.bookingFeeRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Coupon Cost Impact</span>
                  <span className="font-bold text-red-500">-{INR(ledgerMetrics.couponImpact)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t pt-2.5">
                  <span className="text-muted-foreground">Net Platform Earnings</span>
                  <span className="font-black text-[#013220]">{INR(ledgerMetrics.yearlyRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Partner Referral Commissions */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#013220]" /> QR Referral Commissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#6366f1]" /> Franchise Commission
                  </span>
                  <span className="font-semibold">{INR(ledgerMetrics.franchiseComm)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Hub Commission
                  </span>
                  <span className="font-semibold">{INR(ledgerMetrics.hubComm)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#14b8a6]" /> Restaurant Commission
                  </span>
                  <span className="font-semibold">{INR(ledgerMetrics.restComm)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t pt-2.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b]" /> Cab Driver Commission
                  </span>
                  <span className="font-bold text-[#013220]">{INR(ledgerMetrics.cabComm)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Host Settlement tracking */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#013220]" /> Host Settlement Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Host Earning</span>
                  <span className="font-bold">{INR(ledgerMetrics.totalHostEarnings)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground text-rose-500 font-medium">Pending Payouts</span>
                  <span className="font-bold text-rose-500">{INR(ledgerMetrics.pendingPayouts)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground text-emerald-600 font-medium">Completed Payouts</span>
                  <span className="font-bold text-emerald-600">{INR(ledgerMetrics.completedPayouts)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t pt-2.5">
                  <span className="text-muted-foreground">Platform Policy Retained</span>
                  <span className="font-black text-[#013220]">₹90% to Host</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend line chart */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Revenue Flow Trends</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(v) => [INR(Number(v))]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="gmv" stroke="#6366f1" strokeWidth={2.5} name="Total GMV" />
                    <Line type="monotone" dataKey="revenue" stroke="#D4E034" strokeWidth={2.5} name="Platform Revenue" />
                    <Line type="monotone" dataKey="host" stroke="#013220" strokeWidth={2.5} name="Host Earning" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Categories breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Revenue by Category</CardTitle></CardHeader>
              <CardContent>
                {categoryChartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground text-xs">
                    No active category metrics
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [INR(Number(v)), 'Platform Revenue']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] ?? '#013220'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Referral partner pie chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">QR Referral Share</CardTitle></CardHeader>
              <CardContent className="flex justify-center items-center">
                {partnerPieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground text-xs">
                    No referral transactions recorded yet
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={partnerPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {partnerPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PARTNER_COLORS[entry.name] ?? '#8884d8'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [INR(Number(v)), 'Commission']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {partnerPieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PARTNER_COLORS[entry.name] }} />
                          <span className="font-medium">{entry.name}</span>
                          <span className="text-muted-foreground">({INR(entry.value)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* City analysis */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Revenue by City / Host</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host/City</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Total GMV</TableHead>
                      <TableHead>Host Earning</TableHead>
                      <TableHead>Platform Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingsList.filter(b => b.booking_status !== 'cancelled').slice(0, 4).map((b) => (
                      <TableRow key={b.booking_id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-xs">{b.host_name}</p>
                            <p className="text-[10px] text-muted-foreground">{b.city} • {b.category}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">1</TableCell>
                        <TableCell className="text-xs font-semibold">{INR(b.amount)}</TableCell>
                        <TableCell className="text-xs text-emerald-600">{INR(b.host_earning)}</TableCell>
                        <TableCell className="text-xs font-bold text-[#013220]">{INR(b.platform_revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. REVENUE ENGINE SIMULATOR TAB */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Config Card */}
            <Card className="lg:col-span-2 border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#013220]">
                  <Calculator className="h-5 w-5" /> Booking Earning Calculator
                </CardTitle>
                <CardDescription>Simulate standard listing calculations with referral codes and coupons.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Listing Amount (₹)</Label>
                    <Input type="number" value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={simCategory} onValueChange={setSimCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_COLORS).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Coupon Code (Optional)</Label>
                    <Input placeholder="e.g. DISCOUNT10" value={simCouponCode} onChange={(e) => setSimCouponCode(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Coupon Discount (₹)</Label>
                    <Input type="number" value={simCouponDiscount} onChange={(e) => setSimCouponDiscount(Number(e.target.value))} />
                  </div>
                </div>

                {simCouponDiscount > 0 && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-xs font-semibold">Discount Discount Source</Label>
                    <div className="flex items-center gap-4 mt-1">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="funded" checked={simCouponFundedBy === 'Host'} onChange={() => setSimCouponFundedBy('Host')} />
                        Host Funded (Deducted from Host Earnings)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="funded" checked={simCouponFundedBy === 'Platform'} onChange={() => setSimCouponFundedBy('Platform')} />
                        Platform Funded (Deducted from Platform Revenue)
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Referral Partner Type (QR Code Scan)</Label>
                    <Select value={simReferrer} onValueChange={setSimReferrer}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Franchise">Franchise QR Code</SelectItem>
                        <SelectItem value="Hub">Hub QR Code</SelectItem>
                        <SelectItem value="Restaurant">Restaurant QR Code</SelectItem>
                        <SelectItem value="Chai Point">Chai Point QR Code</SelectItem>
                        <SelectItem value="Cab Driver">Cab Driver QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Host Provider</Label>
                    <Input value={simHostName} onChange={(e) => setSimHostName(e.target.value)} />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button onClick={handleRecordBooking} className="bg-[#013220] hover:bg-[#013220]/90 text-white">
                    Record Simulated Booking to Ledger
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calculations Breakdown Output Card */}
            <Card className="border border-border/50 bg-[#013220]/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#013220]">Simulation Revenue Distribution</CardTitle>
                <CardDescription>Step-by-step engine logic calculation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Listing Amount</span>
                    <span className="font-semibold">{INR(simAmount)}</span>
                  </div>
                  {simCouponDiscount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Applied Coupon ({simCouponCode || 'PROMO'})</span>
                      <span>-{INR(simCouponDiscount)} ({simCouponFundedBy} funded)</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold text-sm">
                    <span>Final Payable Amount</span>
                    <span>{INR(calculatedOutput.finalAmount)}</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Booking Fee (10% of Final Amount)</span>
                    <span className="font-bold text-[#013220]">{INR(calculatedOutput.bookingFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pl-2 border-l-2">
                    <span>Referrer Partner Commission ({calculatedOutput.partnerSharePct}% of Fee)</span>
                    <span>{INR(calculatedOutput.referralCommission)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pl-2 border-l-2">
                    <span>Platform Revenue Share (Remainder of Fee)</span>
                    <span>{INR(calculatedOutput.bookingFee - calculatedOutput.referralCommission)}</span>
                  </div>
                  {simCouponDiscount > 0 && simCouponFundedBy === 'Platform' && (
                    <div className="flex justify-between items-center text-[11px] text-rose-500 pl-2 border-l-2">
                      <span>Less: Platform Coupon Subsidy</span>
                      <span>-{INR(simCouponDiscount)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Host Net Earnings</span>
                    <span className="text-emerald-600">{INR(calculatedOutput.hostEarning)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Platform Net Revenue</span>
                    <span className="text-amber-500">{INR(calculatedOutput.netPlatformRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Partner Referral Commission</span>
                    <span className="text-indigo-600">{INR(calculatedOutput.referralCommission)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refund Logic Simulator */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-600">
                <RotateCcw className="h-5 w-5" /> Booking Cancellation & Refund Simulator
              </CardTitle>
              <CardDescription>
                Simulate refund triggers and revenue reversals based on platform cancellation policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Active Booking</Label>
                  <Select value={selectedBookingToCancel} onValueChange={setSelectedBookingToCancel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose booking..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bookingsList
                        .filter(b => b.booking_status !== 'cancelled')
                        .map(b => (
                          <SelectItem key={b.booking_id} value={b.booking_id}>
                            {b.booking_id} - {b.host_name} ({INR(b.amount)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cancellation Window Timeframe</Label>
                  <Select value={cancellationTiming} onValueChange={(v: any) => setCancellationTiming(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Before cancellation period (Free Refund)</SelectItem>
                      <SelectItem value="after">After cancellation window (With Penalty)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {cancellationTiming === 'after' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cancellation Charge Percentage (%)</Label>
                    <Input type="number" value={cancellationChargesPct} onChange={(e) => setCancellationChargesPct(Number(e.target.value))} />
                  </div>
                )}

                <Button onClick={handleProcessRefund} variant="destructive">
                  Process Cancellation & Reversal
                </Button>
              </div>

              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 space-y-1">
                  <p className="font-bold">Refund Policy Guidance:</p>
                  <p>• **Before cancellation period**: User receives 100% refund. Platform and Referral commissions are completely reversed (set to ₹0).</p>
                  <p>• **After cancellation period**: We retain cancellation charges (e.g. {cancellationChargesPct}%). Platform retains booking fee and referral commission computed on the penalty; host earns the rest of the penalty charge.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. LEDGER & AUDIT TAB (with Schema Views) */}
        <TabsContent value="ledger" className="space-y-6">
          <Tabs defaultValue="bookings_tbl" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList className="bg-muted p-0.5 rounded-lg border">
                <TabsTrigger value="bookings_tbl" className="text-xs">bookings table</TabsTrigger>
                <TabsTrigger value="revenue_tbl" className="text-xs">revenue_transactions table</TabsTrigger>
                <TabsTrigger value="referral_tbl" className="text-xs">referral_commissions table</TabsTrigger>
              </TabsList>
            </div>

            {/* bookings table view */}
            <TabsContent value="bookings_tbl">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Schema: bookings</CardTitle>
                  <CardDescription>Primary records of user bookings, platform fee splits, and host shares.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">booking_id</TableHead>
                        <TableHead className="text-xs">user_id</TableHead>
                        <TableHead className="text-xs">host_id</TableHead>
                        <TableHead className="text-xs">amount</TableHead>
                        <TableHead className="text-xs">booking_fee</TableHead>
                        <TableHead className="text-xs">platform_revenue</TableHead>
                        <TableHead className="text-xs">referral_commission</TableHead>
                        <TableHead className="text-xs">host_earning</TableHead>
                        <TableHead className="text-xs">payment_status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsSchemaView.map((b) => (
                        <TableRow key={b.booking_id}>
                          <TableCell className="font-mono text-xs font-bold">{b.booking_id}</TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono block">{b.user_id}</span>
                            <span className="text-[10px] text-muted-foreground">{b.user_name}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono block">{b.host_id}</span>
                            <span className="text-[10px] text-muted-foreground">{b.host_name}</span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{INR(b.amount)}</TableCell>
                          <TableCell className="text-xs">{INR(b.booking_fee)}</TableCell>
                          <TableCell className="text-xs text-amber-600 font-medium">{INR(b.platform_revenue)}</TableCell>
                          <TableCell className="text-xs text-indigo-600">{INR(b.referral_commission)}</TableCell>
                          <TableCell className="text-xs text-emerald-600 font-semibold">{INR(b.host_earning)}</TableCell>
                          <TableCell>
                            <Badge
                              className="text-[9px] uppercase"
                              variant={b.payment_status === 'completed' ? 'default' : b.payment_status === 'pending' ? 'secondary' : 'destructive'}
                            >
                              {b.payment_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* revenue transactions table view */}
            <TabsContent value="revenue_tbl">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Schema: revenue_transactions</CardTitle>
                  <CardDescription>Auditable transaction log recording fee generation, referrals, and coupon cost adjustments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">transaction_id</TableHead>
                        <TableHead className="text-xs">booking_id</TableHead>
                        <TableHead className="text-xs">revenue_type</TableHead>
                        <TableHead className="text-xs">amount</TableHead>
                        <TableHead className="text-xs">status</TableHead>
                        <TableHead className="text-xs">created_at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueTransactionsSchemaView.map((tx) => (
                        <TableRow key={tx.transaction_id}>
                          <TableCell className="font-mono text-xs font-bold">{tx.transaction_id}</TableCell>
                          <TableCell className="font-mono text-xs">{tx.booking_id}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {tx.revenue_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-xs font-bold ${tx.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {tx.amount < 0 ? '-' : ''}{INR(Math.abs(tx.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge className="text-[9px]" variant="secondary">{tx.status}</Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* referral commissions view */}
            <TabsContent value="referral_tbl">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Schema: referral_commissions</CardTitle>
                  <CardDescription>Partner payouts list tracking Hub, Franchise, Restaurant, and Chai Point payouts.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">referral_id</TableHead>
                        <TableHead className="text-xs">booking_id</TableHead>
                        <TableHead className="text-xs">partner_id</TableHead>
                        <TableHead className="text-xs">partner_type</TableHead>
                        <TableHead className="text-xs">commission_amount</TableHead>
                        <TableHead className="text-xs">status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralCommissionsSchemaView.map((ref) => (
                        <TableRow key={ref.referral_id}>
                          <TableCell className="font-mono text-xs font-bold">{ref.referral_id}</TableCell>
                          <TableCell className="font-mono text-xs">{ref.booking_id}</TableCell>
                          <TableCell className="font-mono text-xs">{ref.partner_id}</TableCell>
                          <TableCell className="text-xs">
                            <Badge className="text-[9px]" style={{ backgroundColor: PARTNER_COLORS[ref.partner_type] }}>
                              {ref.partner_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-[#013220]">{INR(ref.commission_amount)}</TableCell>
                          <TableCell>
                            <Badge className="text-[9px]" variant={ref.status === 'paid' ? 'default' : 'secondary'}>
                              {ref.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* 4. CONFIGURATION RULES TAB */}
        <TabsContent value="configs" className="space-y-6">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#013220]">
                <Percent className="h-5 w-5" /> Configurable Revenue Sharing Rules
              </CardTitle>
              <CardDescription>
                Modify percentages of platform booking fees and referral commission cuts. Changes apply instantly to simulator calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3.5">
                  <h3 className="font-bold text-xs text-[#013220] uppercase tracking-wider">Base Platform Rules</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Platform Booking Fee (%)</Label>
                    <Input
                      type="number"
                      value={commissionConfig.bookingFeePct}
                      onChange={(e) => setCommissionConfig(prev => ({ ...prev, bookingFeePct: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Standard markup calculated on final payable amount.</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h3 className="font-bold text-xs text-[#013220] uppercase tracking-wider">QR Referral Splits (% of Booking Fee)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Franchise QR (%)</Label>
                      <Input
                        type="number"
                        value={commissionConfig.franchiseCommPct}
                        onChange={(e) => setCommissionConfig(prev => ({ ...prev, franchiseCommPct: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hub QR (%)</Label>
                      <Input
                        type="number"
                        value={commissionConfig.hubCommPct}
                        onChange={(e) => setCommissionConfig(prev => ({ ...prev, hubCommPct: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Restaurant QR (%)</Label>
                      <Input
                        type="number"
                        value={commissionConfig.restaurantCommPct}
                        onChange={(e) => setCommissionConfig(prev => ({ ...prev, restaurantCommPct: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chai Point QR (%)</Label>
                      <Input
                        type="number"
                        value={commissionConfig.chaiPointCommPct}
                        onChange={(e) => setCommissionConfig(prev => ({ ...prev, chaiPointCommPct: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cab Driver QR (%)</Label>
                      <Input
                        type="number"
                        value={commissionConfig.cabDriverCommPct}
                        onChange={(e) => setCommissionConfig(prev => ({ ...prev, cabDriverCommPct: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button onClick={() => toast({ title: 'Rules Updated', description: 'Platform revenue config updated successfully.' })} className="bg-[#013220] text-white hover:bg-[#013220]/90">
                  Save Share Configuration Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
