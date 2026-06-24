import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Download, BarChart3, Calendar, Users, FileText,
  Printer, TrendingUp, Loader2, Star, UserPlus, Activity, MapPin, 
  CreditCard, XCircle, Clock, Maximize2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth, subMonths, eachDayOfInterval, isSameDay, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ReportType = "revenue_service" | "revenue_status" | "revenue_date" | "revenue_traveller" | "revenue_hub";

export default function HubReports() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType>("revenue_service");
  const [dateRange, setDateRange] = useState<string>("all_time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  const [drilldownData, setDrilldownData] = useState<{ title: string; data: any[] } | null>(null);
  const [expandedChart, setExpandedChart] = useState<"bookings" | "revenue" | null>(null);
  const queryClient = useQueryClient();

  // Real-time subscriptions
  useEffect(() => {
    if (!uuid) return;
    const channel = supabase.channel('hub-reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => queryClient.invalidateQueries({ queryKey: ["hub-reports-enhanced", uuid] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cab_bookings' }, () => queryClient.invalidateQueries({ queryKey: ["hub-reports-enhanced", uuid] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_bookings' }, () => queryClient.invalidateQueries({ queryKey: ["hub-reports-enhanced", uuid] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => queryClient.invalidateQueries({ queryKey: ["hub-reports-enhanced", uuid] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uuid, queryClient]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["hub-reports-enhanced", uuid, dateRange, customStart, customEnd],
    enabled: !!uuid,
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (dateRange === "today") {
        startDate = startOfDay(now);
      } else if (dateRange === "yesterday") {
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
      } else if (dateRange === "7") {
        startDate = startOfDay(subDays(now, 7));
      } else if (dateRange === "30") {
        startDate = startOfDay(subDays(now, 30));
      } else if (dateRange === "this_month") {
        startDate = startOfMonth(now);
      } else if (dateRange === "last_month") {
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
      } else if (dateRange === "this_year") {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = endOfDay(now);
      } else if (dateRange === "all_time") {
        startDate = new Date(0); // 1970
        endDate = new Date(2100, 0, 1);
      } else if (dateRange === "custom" && customStart && customEnd) {
        startDate = startOfDay(new Date(customStart));
        endDate = endOfDay(new Date(customEnd));
      } else {
        startDate = startOfDay(now);
      }

      const { data: hub } = await supabase.from("hubs").select("id, hub_name").eq("uuid", uuid).single();
      if (!hub) throw new Error("Hub not found");
      const hubId = hub.id;

      // Fetch all required data
      const [
        { data: cabBookings },
        { data: pkgs },
        { data: mkps },
        { count: totalUsersCount },
        { count: newUsersTodayCount },
        { data: allProfiles }
      ] = await Promise.all([
        supabase.from("cab_bookings").select(`*, traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)`).or(`assigned_hub_uuid.eq.${uuid},hub_partner_id.eq.${hubId}`),
        supabase.from("package_bookings").select(`*, user:profiles(full_name, phone), tour_packages(name)`).or(`assigned_hub_uuid.eq.${uuid},hub_id.eq.${hubId}`),
        supabase.from("bookings").select(`*, user:profiles!bookings_user_id_fkey(full_name, phone)`).or(`assigned_hub_uuid.eq.${uuid},hub_id.eq.${hubId}`),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "user"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfDay(now).toISOString()).lte("created_at", endOfDay(now).toISOString()),
        supabase.from("profiles").select("id, full_name, phone, created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
      ]);

      const cabsListRaw = cabBookings || [];
      const pkgsListRaw = pkgs || [];
      const mkpsListRaw = mkps || [];
      const registeredUsers = allProfiles || [];

      // Apply Date Filter to Bookings (Since we fetch all of them initially to handle 'all_time' efficiently)
      const isDateInRange = (dateStr: string) => {
        if (startDate && endDate) {
          const d = new Date(dateStr);
          return d >= startDate && d <= endDate;
        }
        return true; // all_time
      };

      const cabsList = cabsListRaw.filter(c => isDateInRange(c.created_at));
      const pkgsList = pkgsListRaw.filter(p => isDateInRange(p.created_at));
      const mkpsList = mkpsListRaw.filter(m => isDateInRange(m.created_at));

      // Calculate Top Level Cards
      let totalBookings = cabsList.length + pkgsList.length + mkpsList.length;
      let newUsersToday = newUsersTodayCount || 0;
      
      let todaysBookingsCount = 0;
      let grossRevenue = 0;
      let successfulRevenue = 0;
      let pendingRevenue = 0;
      let failedRevenue = 0;
      let pendingBookings = 0;
      let cancelledBookings = 0;
      let activeUserIds = new Set<string>();

      const revenueCategories = {
        marketplace: { revenue: 0, count: 0 },
        airport: { revenue: 0, count: 0 },
        local: { revenue: 0, count: 0 },
        outstation: { revenue: 0, count: 0 },
        experiences: { revenue: 0, count: 0 }
      };

      const processMetrics = (b: any, amount: number, isToday: boolean, status: string, paymentStatus: string, source: string, userId: string) => {
        const bStat = (status || '').toLowerCase();
        const pStat = (paymentStatus || '').toLowerCase();
        
        const isSuccessfulBooking = ['confirmed', 'completed', 'assigned'].includes(bStat);
        const isSuccessfulPayment = ['success', 'successful', 'paid', 'completed'].includes(pStat);
        const addsToRevenue = isSuccessfulBooking && isSuccessfulPayment;
        
        const isPending = bStat === 'pending' || bStat === 'awaiting hub partner assignment' || pStat === 'pending';
        const isCancelled = ['cancelled', 'rejected', 'failed'].includes(bStat) || ['failed'].includes(pStat);

        // Revenue Breakdown
        grossRevenue += amount;
        if (isSuccessfulPayment || addsToRevenue) {
          successfulRevenue += amount;
        } else if (isCancelled || pStat === 'failed') {
          failedRevenue += amount;
        } else {
          pendingRevenue += amount;
        }

        if (isToday) todaysBookingsCount++;
        if (isPending && !isCancelled) pendingBookings++;
        if (isCancelled) cancelledBookings++;
        if (userId) activeUserIds.add(userId);

        // Always add to category regardless of success (Gross Category Revenue)
        if (source === 'marketplace') { revenueCategories.marketplace.revenue += amount; revenueCategories.marketplace.count++; }
        else if (source === 'airport') { revenueCategories.airport.revenue += amount; revenueCategories.airport.count++; }
        else if (source === 'local') { revenueCategories.local.revenue += amount; revenueCategories.local.count++; }
        else if (source === 'outstation') { revenueCategories.outstation.revenue += amount; revenueCategories.outstation.count++; }
        else if (source === 'experiences') { revenueCategories.experiences.revenue += amount; revenueCategories.experiences.count++; }
      };

      cabsList.forEach(c => {
        let source = c.booking_source;
        if (source?.includes('airport')) source = 'airport';
        else if (source?.includes('local')) source = 'local';
        else source = 'outstation';
        processMetrics(c, Number(c.fare_amount || 0), isSameDay(new Date(c.created_at), now), c.booking_status || 'pending', c.payment_status || 'pending', source, c.traveller_id);
      });

      pkgsList.forEach(p => {
        processMetrics(p, Number(p.total_amount || 0), isSameDay(new Date(p.created_at), now), p.booking_status || 'pending', p.payment_status || 'pending', 'experiences', p.user_id);
      });

      mkpsList.forEach(m => {
        processMetrics(m, Number(m.total_price || 0), isSameDay(new Date(m.created_at), now), m.status || 'pending', m.payment_status || 'pending', 'marketplace', m.user_id);
      });

      // Chart Data preparation
      let daysInterval: Date[] = [];
      try { 
        if (!startDate || !endDate || (startDate.getTime() === new Date(0).getTime())) {
          // If "All Time", we show the last 30 days as a reasonable graph default
          daysInterval = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
        } else {
          daysInterval = eachDayOfInterval({ start: startDate, end: endDate }); 
        }
      } catch (e) { 
        daysInterval = [new Date()]; 
      }
      
      const dailyDataMap = new Map<string, { date: string, bookings: number, revenue: number, rawBookings: any[] }>();
      daysInterval.forEach(day => {
        dailyDataMap.set(format(day, "yyyy-MM-dd"), { date: format(day, "dd MMM"), bookings: 0, revenue: 0, rawBookings: [] });
      });

      const pushToChart = (dateStr: string, amount: number, raw: any, status: string, paymentStatus: string) => {
        const key = format(new Date(dateStr), "yyyy-MM-dd");
        if (dailyDataMap.has(key)) {
          const entry = dailyDataMap.get(key)!;
          entry.bookings += 1;
          
          const bStat = (status || '').toLowerCase();
          const pStat = (paymentStatus || '').toLowerCase();
          const isSuccessfulBooking = ['confirmed', 'completed', 'assigned'].includes(bStat);
          const isSuccessfulPayment = ['success', 'successful', 'paid', 'completed'].includes(pStat);
          
          if (isSuccessfulBooking && isSuccessfulPayment) entry.revenue += amount;
          entry.rawBookings.push(raw);
        }
      };

      cabsList.forEach(c => pushToChart(c.created_at, Number(c.fare_amount || 0), { id: c.booking_id, type: "Cab", customer: c.traveller?.full_name, amount: c.fare_amount, date: format(new Date(c.created_at), "dd MMM yyyy"), status: c.booking_status, category: "Cab" }, c.booking_status, c.payment_status));
      pkgsList.forEach(p => pushToChart(p.created_at, Number(p.total_amount || 0), { id: p.booking_ref, type: "Package", customer: p.user?.full_name, amount: p.total_amount, date: format(new Date(p.created_at), "dd MMM yyyy"), status: p.booking_status, category: "Experience" }, p.booking_status, p.payment_status));
      mkpsList.forEach(m => pushToChart(m.created_at, Number(m.total_price || 0), { id: m.id, type: m.listing_type, customer: m.user?.full_name, amount: m.total_price, date: format(new Date(m.created_at), "dd MMM yyyy"), status: m.status, category: "Marketplace" }, m.status, m.payment_status));

      const chartsTrend = Array.from(dailyDataMap.values());

      // User Registration Analytics & Total Spend calc
      const userSpendMap = new Map<string, { bookings: number, spent: number }>();
      [...cabsList, ...pkgsList, ...mkpsList].forEach(b => {
        const uid = b.traveller_id || b.user_id;
        const amt = Number(b.fare_amount || b.total_amount || b.total_price || 0);
        const stat = b.booking_status || b.status;
        const pStat = b.payment_status || 'pending';
        const isSuccessfulPayment = ['paid', 'completed', 'successful'].includes((pStat || '').toLowerCase()) || ['completed', 'confirmed'].includes((stat || '').toLowerCase());
        
        if (uid && isSuccessfulPayment) {
          const curr = userSpendMap.get(uid) || { bookings: 0, spent: 0 };
          curr.bookings += 1;
          curr.spent += amt;
          userSpendMap.set(uid, curr);
        }
      });

      const userRegistrationRows = registeredUsers.map(u => {
        const stats = userSpendMap.get(u.id) || { bookings: 0, spent: 0 };
        return {
          name: u.full_name || "Unknown",
          email: u.email || "N/A",
          phone: u.phone || "N/A",
          date: format(new Date(u.created_at), "dd MMM yyyy"),
          source: "Organic",
          bookings: stats.bookings,
          spent: stats.spent
        };
      });

      // 1. Revenue by Service
      const revenueServiceRows = [
        { category: "Marketplace", revenue: revenueCategories.marketplace.revenue, bookings: revenueCategories.marketplace.count, avg: revenueCategories.marketplace.count ? (revenueCategories.marketplace.revenue / revenueCategories.marketplace.count).toFixed(2) : 0 },
        { category: "Airport Transfers", revenue: revenueCategories.airport.revenue, bookings: revenueCategories.airport.count, avg: revenueCategories.airport.count ? (revenueCategories.airport.revenue / revenueCategories.airport.count).toFixed(2) : 0 },
        { category: "Local Rentals", revenue: revenueCategories.local.revenue, bookings: revenueCategories.local.count, avg: revenueCategories.local.count ? (revenueCategories.local.revenue / revenueCategories.local.count).toFixed(2) : 0 },
        { category: "Outstation Cabs", revenue: revenueCategories.outstation.revenue, bookings: revenueCategories.outstation.count, avg: revenueCategories.outstation.count ? (revenueCategories.outstation.revenue / revenueCategories.outstation.count).toFixed(2) : 0 },
        { category: "Experiences", revenue: revenueCategories.experiences.revenue, bookings: revenueCategories.experiences.count, avg: revenueCategories.experiences.count ? (revenueCategories.experiences.revenue / revenueCategories.experiences.count).toFixed(2) : 0 },
      ];

      // 2. Revenue by Status
      const revenueStatusRows = [
        { status: "Successful", revenue: successfulRevenue },
        { status: "Pending", revenue: pendingRevenue },
        { status: "Failed / Cancelled", revenue: failedRevenue },
      ];

      // 3. Revenue by Date (using dailyDataMap)
      const revenueDateRows = Array.from(dailyDataMap.values()).map(d => ({
        date: d.date,
        bookings: d.bookings,
        revenue: d.revenue
      })).reverse(); // Newest first

      // 4. Revenue by Traveller
      const revenueTravellerRows = Array.from(userSpendMap.entries()).map(([uid, stats]) => {
        const profile = registeredUsers.find(u => u.id === uid);
        return {
          name: profile?.full_name || "Guest",
          phone: profile?.phone || "N/A",
          bookings: stats.bookings,
          revenue: stats.spent
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // 5. Revenue by Hub
      const revenueHubRows = [
        { hub: hub.hub_name, bookings: totalBookings, gross_revenue: grossRevenue, successful_revenue: successfulRevenue }
      ];

      const allBookingsForTable = [
        ...cabsList.map(c => ({ id: c.booking_id, name: c.traveller?.full_name || "Guest", category: "Cab", amount: Number(c.fare_amount), date: format(new Date(c.created_at), "dd MMM yyyy"), status: c.booking_status })),
        ...pkgsList.map(p => ({ id: p.booking_ref || p.id, name: p.user?.full_name, category: "Experience", amount: Number(p.total_amount), date: format(new Date(p.created_at), "dd MMM yyyy"), status: p.booking_status })),
        ...mkpsList.map(m => ({ id: m.id, name: m.user?.full_name, category: "Marketplace", amount: Number(m.total_price), date: format(new Date(m.created_at), "dd MMM yyyy"), status: m.status }))
      ];

      return {
        hubName: hub.hub_name,
        totalUsersCount: totalUsersCount || 0,
        newUsersToday,
        activeUsers: activeUserIds.size,
        grossRevenue,
        successfulRevenue,
        pendingRevenue,
        failedRevenue,
        totalBookings,
        todaysBookingsCount,
        pendingBookings,
        cancelledBookings,
        chartsTrend,
        reports: {
          revenue_service: revenueServiceRows,
          revenue_status: revenueStatusRows,
          revenue_date: revenueDateRows,
          revenue_traveller: revenueTravellerRows,
          revenue_hub: revenueHubRows,
          booking: allBookingsForTable
        }
      };
    }
  });

  const exportReport = (formatType: "csv" | "excel" | "pdf") => {
    if (!analytics?.reports?.[selectedReport]) return;
    const dataList = analytics.reports[selectedReport];
    if (dataList.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }

    if (formatType === "csv" || formatType === "excel") {
      const headers = Object.keys(dataList[0]);
      const rows = [headers.join(",")];
      dataList.forEach((item: any) => {
        const values = headers.map(h => typeof item[h] === "string" ? `"${item[h].replace(/"/g, '""')}"` : item[h]);
        rows.push(values.join(","));
      });
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `Hub_${selectedReport}_${format(new Date(), "yyyyMMdd")}.csv`;
      a.click();
      toast({ title: `Exported to ${formatType.toUpperCase()}` });
    } else {
      window.print();
    }
  };

  const handleChartClick = (data: any, title: string) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const point = data.activePayload[0].payload;
      if(point.rawBookings.length > 0) {
        setDrilldownData({ title: `${title} on ${point.date}`, data: point.rawBookings });
      }
    }
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Reports & Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deep insights, completely filtered by your chosen dates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] rounded-xl bg-card border-border/50 font-semibold">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === "custom" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-muted/30 p-1.5 rounded-xl">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[140px] rounded-lg h-9 text-xs justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {customStart ? format(new Date(customStart), "dd MMM yyyy") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customStart ? new Date(customStart) : undefined}
                    onSelect={(date) => {
                      if (date) setCustomStart(format(date, "yyyy-MM-dd"));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-xs text-muted-foreground font-medium hidden sm:block">to</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[140px] rounded-lg h-9 text-xs justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {customEnd ? format(new Date(customEnd), "dd MMM yyyy") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customEnd ? new Date(customEnd) : undefined}
                    onSelect={(date) => {
                      if (date) setCustomEnd(format(date, "yyyy-MM-dd"));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button onClick={() => window.print()} variant="outline" size="sm" className="rounded-xl h-10">
            <Printer className="h-4 w-4 mr-2 text-muted-foreground" /> Print Dashboard
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Top Level Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden mb-4">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Users</p><p className="text-2xl font-black">{analytics?.totalUsersCount}</p></div>
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Users className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New Users Today</p><p className="text-2xl font-black">{analytics?.newUsersToday}</p></div>
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><UserPlus className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Users</p><p className="text-2xl font-black">{analytics?.activeUsers}</p></div>
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><Activity className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Bookings</p><p className="text-2xl font-black">{analytics?.totalBookings}</p></div>
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><FileText className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Today's Bookings</p><p className="text-2xl font-black">{analytics?.todaysBookingsCount}</p></div>
                <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center"><Clock className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Pending Bookings</p><p className="text-2xl font-black">{analytics?.pendingBookings}</p></div>
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center"><Clock className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Cancelled Bookings</p><p className="text-2xl font-black">{analytics?.cancelledBookings}</p></div>
                <div className="h-10 w-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><XCircle className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Top Level Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden mb-6">
            <Card className="border-border/50 shadow-sm bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Gross Revenue</p><p className="text-2xl font-black text-primary">₹{analytics?.grossRevenue?.toLocaleString()}</p></div>
                <div className="h-10 w-10 bg-primary/20 text-primary rounded-full flex items-center justify-center"><CreditCard className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Successful Revenue</p><p className="text-2xl font-black text-emerald-600">₹{analytics?.successfulRevenue?.toLocaleString()}</p></div>
                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center"><CreditCard className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Pending Revenue</p><p className="text-2xl font-black text-amber-600">₹{analytics?.pendingRevenue?.toLocaleString()}</p></div>
                <div className="h-10 w-10 bg-amber-500/20 text-amber-600 rounded-full flex items-center justify-center"><Clock className="h-5 w-5" /></div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm bg-red-500/5 border-red-500/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Failed Revenue</p><p className="text-2xl font-black text-red-600">₹{analytics?.failedRevenue?.toLocaleString()}</p></div>
                <div className="h-10 w-10 bg-red-500/20 text-red-600 rounded-full flex items-center justify-center"><XCircle className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-border/50 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" /> Booking Volume Trend
                  </CardTitle>
                  <CardDescription className="text-xs">Click on any point to drill-down into detailed data.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedChart("bookings")}>
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="h-[220px] pt-0 min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.chartsTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }} onClick={(d) => handleChartClick(d, 'Bookings')}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Line type="monotone" dataKey="bookings" stroke="hsl(158 60% 50%)" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm cursor-pointer hover:border-blue-500/50 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" /> Revenue Growth Trend
                  </CardTitle>
                  <CardDescription className="text-xs">Click on any bar to see the specific revenue breakdown.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedChart("revenue")}>
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="h-[220px] pt-0 min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.chartsTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} onClick={(d) => handleChartClick(d, 'Revenue')}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(220 70% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Sub-Reports */}
          <Card className="border-border/50 shadow-sm mt-6 print:break-inside-avoid">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4 print:hidden">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Advanced Data Views
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedReport} onValueChange={(val) => setSelectedReport(val as ReportType)}>
                  <SelectTrigger className="w-[220px] rounded-xl font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue_service">Revenue by Service</SelectItem>
                    <SelectItem value="revenue_status">Revenue by Status</SelectItem>
                    <SelectItem value="revenue_date">Revenue by Date</SelectItem>
                    <SelectItem value="revenue_traveller">Revenue by Traveller</SelectItem>
                    <SelectItem value="revenue_hub">Revenue by Hub</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => exportReport("excel")} variant="outline" size="sm" className="rounded-xl"><Download className="h-4 w-4 mr-2" /> Export to Excel/CSV</Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto min-w-0 w-full pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      {selectedReport === "revenue_service" && (
                        <><TableHead>Category</TableHead><TableHead>Total Bookings</TableHead><TableHead>Gross Revenue Generated</TableHead><TableHead>Average Booking Value</TableHead></>
                      )}
                      {selectedReport === "revenue_status" && (
                        <><TableHead>Status</TableHead><TableHead>Gross Revenue</TableHead></>
                      )}
                      {selectedReport === "revenue_date" && (
                        <><TableHead>Date</TableHead><TableHead>Total Bookings</TableHead><TableHead>Gross Revenue</TableHead></>
                      )}
                      {selectedReport === "revenue_traveller" && (
                        <><TableHead>Traveller Name</TableHead><TableHead>Phone</TableHead><TableHead>Total Bookings</TableHead><TableHead>Total Revenue Spend</TableHead></>
                      )}
                      {selectedReport === "revenue_hub" && (
                        <><TableHead>Hub Name</TableHead><TableHead>Total Bookings</TableHead><TableHead>Gross Revenue</TableHead><TableHead>Successful Revenue</TableHead></>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.reports[selectedReport]?.map((r: any, i: number) => (
                      <TableRow key={i}>
                        {selectedReport === "revenue_service" && (
                          <><TableCell className="font-semibold">{r.category}</TableCell><TableCell>{r.bookings}</TableCell><TableCell className="font-bold text-primary">₹{r.revenue.toLocaleString()}</TableCell><TableCell>₹{r.avg}</TableCell></>
                        )}
                        {selectedReport === "revenue_status" && (
                          <><TableCell className="font-semibold">{r.status}</TableCell><TableCell className="font-bold text-primary">₹{r.revenue.toLocaleString()}</TableCell></>
                        )}
                        {selectedReport === "revenue_date" && (
                          <><TableCell className="font-medium">{r.date}</TableCell><TableCell>{r.bookings}</TableCell><TableCell className="font-bold text-primary">₹{r.revenue.toLocaleString()}</TableCell></>
                        )}
                        {selectedReport === "revenue_traveller" && (
                          <><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.phone}</TableCell><TableCell>{r.bookings}</TableCell><TableCell className="font-bold text-primary">₹{r.revenue.toLocaleString()}</TableCell></>
                        )}
                        {selectedReport === "revenue_hub" && (
                          <><TableCell className="font-medium">{r.hub}</TableCell><TableCell>{r.bookings}</TableCell><TableCell className="font-bold text-primary">₹{r.gross_revenue.toLocaleString()}</TableCell><TableCell className="font-bold text-emerald-600">₹{r.successful_revenue.toLocaleString()}</TableCell></>
                        )}
                      </TableRow>
                    ))}
                    {analytics?.reports[selectedReport]?.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No data found for this date range.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Drill-down Modal */}
      <Dialog open={!!drilldownData} onOpenChange={() => setDrilldownData(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Drill-down: {drilldownData?.title}</DialogTitle>
            <DialogDescription>Detailed records contributing to this specific data point.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4 rounded-xl border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0">
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Traveller</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drilldownData?.data.map((b: any, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{String(b.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="font-semibold text-sm">{b.customer || "Guest"}</TableCell>
                    <TableCell>{b.category}</TableCell>
                    <TableCell className="font-bold text-emerald-600">₹{Number(b.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted uppercase tracking-wider">{b.status || 'Pending'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Graph Modal */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {expandedChart === "bookings" ? <TrendingUp className="h-6 w-6 text-emerald-600" /> : <BarChart3 className="h-6 w-6 text-blue-600" />}
              {expandedChart === "bookings" ? "Booking Volume Analytics" : "Revenue Growth Analytics"}
            </DialogTitle>
            <DialogDescription>Interactive full-screen analytics. Click any data point to drill-down into specific records.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 mt-4 border border-border/50 rounded-xl p-6 bg-card/50">
            <ResponsiveContainer width="100%" height="100%">
              {expandedChart === "bookings" ? (
                <LineChart data={analytics?.chartsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} onClick={(d) => { if(d) handleChartClick(d, 'Bookings'); }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={15} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="bookings" stroke="hsl(158 60% 50%)" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0, fill: "hsl(158 60% 40%)" }} dot={{ r: 4, fill: "hsl(158 60% 50%)" }} />
                </LineChart>
              ) : (
                <BarChart data={analytics?.chartsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} onClick={(d) => { if(d) handleChartClick(d, 'Revenue'); }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={15} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="revenue" fill="hsl(220 70% 60%)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
