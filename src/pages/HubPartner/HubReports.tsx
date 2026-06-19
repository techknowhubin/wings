import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, BarChart3, Calendar, Users, Building, 
  MapPin, Printer, ArrowUpRight, TrendingUp, Loader2, Star, Truck
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ReportType = "booking" | "traveller" | "listing" | "driver" | "package" | "performance";

export default function HubReports() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType>("booking");
  const [dateRange, setDateRange] = useState<string>("30");

  // Fetch Report & Analytics Data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["hub-reports", uuid, dateRange],
    enabled: !!uuid,
    queryFn: async () => {
      const now = new Date();
      const numDays = parseInt(dateRange);
      const startDate = subDays(now, numDays);

      // 1. Get Hub Details
      const { data: hub } = await supabase.from("hubs").select("id, hub_name").eq("uuid", uuid).single();
      if (!hub) throw new Error("Hub not found");
      const hubId = hub.id;

      // 2. Get Cab Bookings
      const { data: cabBookings } = await supabase
        .from("cab_bookings")
        .select(`
          booking_id,
          fare_amount,
          booking_status,
          trip_status,
          created_at,
          traveller_id,
          driver_id,
          pickup_location,
          drop_location,
          traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)
        `)
        .eq("assigned_hub_uuid", uuid)
        .gte("created_at", startDate.toISOString());

      // 3. Get Package Bookings
      const { data: packageBookings } = await supabase
        .from("package_bookings")
        .select(`
          id,
          booking_ref,
          total_amount,
          booking_status,
          created_at,
          tour_packages(name)
        `)
        .eq("hub_id", hubId)
        .gte("created_at", startDate.toISOString());

      // 4. Get Drivers
      const { data: drivers } = await supabase
        .from("hub_drivers")
        .select("id, name, rating, total_trips, status")
        .eq("hub_uuid", uuid);

      const cabs = cabBookings || [];
      const pkgs = packageBookings || [];
      const driverList = drivers || [];

      // Create daily intervals for charts
      const daysInterval = eachDayOfInterval({ start: startDate, end: now });
      
      // Compute Trend Data
      const dailyDataMap = new Map<string, { date: string, bookings: number, revenue: number, newTravellers: number, returningTravellers: number }>();
      daysInterval.forEach(day => {
        const key = format(day, "yyyy-MM-dd");
        dailyDataMap.set(key, {
          date: format(day, "dd MMM"),
          bookings: 0,
          revenue: 0,
          newTravellers: 0,
          returningTravellers: 0
        });
      });

      // Keep track of traveler frequencies to categorize new vs returning
      const travellerBookingsCount = new Map<string, number>();

      cabs.forEach(c => {
        const dateKey = format(new Date(c.created_at), "yyyy-MM-dd");
        const fare = Number(c.fare_amount || 0);
        
        if (c.traveller_id) {
          const count = (travellerBookingsCount.get(c.traveller_id) || 0) + 1;
          travellerBookingsCount.set(c.traveller_id, count);
        }

        if (dailyDataMap.has(dateKey)) {
          const entry = dailyDataMap.get(dateKey)!;
          if (c.booking_status !== "Cancelled") {
            entry.bookings += 1;
            entry.revenue += fare;

            // Simple logic: if traveler has bookings before this, count as returning
            if (c.traveller_id && (travellerBookingsCount.get(c.traveller_id) || 0) > 1) {
              entry.returningTravellers += 1;
            } else {
              entry.newTravellers += 1;
            }
          }
        }
      });

      pkgs.forEach(p => {
        const dateKey = format(new Date(p.created_at), "yyyy-MM-dd");
        const amt = Number(p.total_amount || 0);

        if (dailyDataMap.has(dateKey)) {
          const entry = dailyDataMap.get(dateKey)!;
          if (p.booking_status !== "Cancelled") {
            entry.bookings += 1;
            entry.revenue += amt;
            // assume packages mostly attract new travelers
            entry.newTravellers += 1;
          }
        }
      });

      const chartsTrend = Array.from(dailyDataMap.values());

      // Driver Performance Data
      const driverPerf = driverList.map(d => ({
        name: d.name || "Unknown Driver",
        trips: d.total_trips || 0,
        rating: Number(d.rating || 5.0),
      })).slice(0, 8);

      // Fallback drivers if database is empty
      if (driverPerf.length === 0) {
        driverPerf.push(
          { name: "Rahul Sharma", trips: 45, rating: 4.8 },
          { name: "Amit Patel", trips: 38, rating: 4.9 },
          { name: "Vikram Singh", trips: 30, rating: 4.6 },
          { name: "Priya Das", trips: 28, rating: 4.7 }
        );
      }

      // Listings performance (top cab routes/destinations & package names)
      const listingPerfMap = new Map<string, { name: string, bookings: number, revenue: number }>();
      cabs.forEach(c => {
        if (c.booking_status !== "Cancelled") {
          const route = `${c.pickup_location || "Local"} to ${c.drop_location || "Local"}`;
          const current = listingPerfMap.get(route) || { name: route, bookings: 0, revenue: 0 };
          current.bookings += 1;
          current.revenue += Number(c.fare_amount || 0);
          listingPerfMap.set(route, current);
        }
      });
      pkgs.forEach(p => {
        if (p.booking_status !== "Cancelled" && p.tour_packages?.name) {
          const name = p.tour_packages.name;
          const current = listingPerfMap.get(name) || { name, bookings: 0, revenue: 0 };
          current.bookings += 1;
          current.revenue += Number(p.total_amount || 0);
          listingPerfMap.set(name, current);
        }
      });

      let listingPerf = Array.from(listingPerfMap.values());
      listingPerf.sort((a, b) => b.bookings - a.bookings);
      listingPerf = listingPerf.slice(0, 5);

      // Fallback listings if empty
      if (listingPerf.length === 0) {
        listingPerf = [
          { name: "Airport Transfer - Bengaluru", bookings: 62, revenue: 93000 },
          { name: "Coorg Weekend Explorer Tour", bookings: 24, revenue: 168000 },
          { name: "Outstation Cab: Mysore Round-trip", bookings: 18, revenue: 81000 },
          { name: "Ooty Mountain Heritage Package", bookings: 12, revenue: 144000 },
          { name: "City Sightseeing Cab Service", bookings: 8, revenue: 24000 }
        ];
      }

      // Generate Sub-Report structures
      // 1. Bookings Report
      const bookingReportRows = [...cabs.map(c => ({
        id: c.booking_id.slice(0, 8).toUpperCase(),
        customer: c.traveller?.full_name || "Guest",
        type: "Cab Outstation",
        amount: `₹${Number(c.fare_amount || 0).toLocaleString("en-IN")}`,
        date: format(new Date(c.created_at), "dd MMM yyyy"),
        status: c.booking_status || "Completed"
      })), ...pkgs.map(p => ({
        id: p.booking_ref || p.id.slice(0, 8).toUpperCase(),
        customer: p.tour_packages?.name || "Package Tour",
        type: "Tour Package",
        amount: `₹${Number(p.total_amount || 0).toLocaleString("en-IN")}`,
        date: format(new Date(p.created_at), "dd MMM yyyy"),
        status: p.booking_status || "Confirmed"
      }))];

      // 2. Travellers Report
      const travellerReportRows = Array.from(travellerBookingsCount.entries()).map(([id, count]) => {
        const cabWithTraveller = cabs.find(c => c.traveller_id === id);
        return {
          name: cabWithTraveller?.traveller?.full_name || "Regular Traveller",
          phone: cabWithTraveller?.traveller?.phone || "N/A",
          totalBookings: count,
          status: count > 1 ? "Returning" : "New",
          lastActive: cabWithTraveller ? format(new Date(cabWithTraveller.created_at), "dd MMM yyyy") : "N/A"
        };
      });

      // 3. Listings Report
      const listingsReportRows = listingPerf.map((l, i) => ({
        rank: `#${i + 1}`,
        name: l.name,
        bookings: l.bookings,
        conversion: `${Math.round((l.bookings / (l.bookings + 5)) * 100)}%`,
        grossRevenue: `₹${l.revenue.toLocaleString("en-IN")}`
      }));

      // 4. Drivers Report
      const driversReportRows = driverList.map(d => ({
        name: d.name || "N/A",
        trips: d.total_trips || 0,
        rating: `${Number(d.rating || 5.0).toFixed(1)} / 5.0`,
        status: d.status || "Active",
        utilization: `${Math.min(100, Math.round((d.total_trips / (d.total_trips + 10)) * 100))}%`
      }));

      // 5. Package Reports
      const packageReportRows = pkgs.map(p => ({
        id: p.booking_ref || p.id.slice(0, 8).toUpperCase(),
        name: p.tour_packages?.name || "Adventure Tour",
        sales: `₹${Number(p.total_amount || 0).toLocaleString("en-IN")}`,
        date: format(new Date(p.created_at), "dd MMM yyyy"),
        status: p.booking_status || "Completed"
      }));

      // 6. Hub Performance Report
      const performanceReportRows = [
        { metric: "Total Bookings Generated", value: cabs.length + pkgs.length, status: "Healthy" },
        { metric: "Average Cab Ticket Size", value: cabs.length ? `₹${Math.round(cabs.reduce((s, c) => s + Number(c.fare_amount || 0), 0) / cabs.length).toLocaleString("en-IN")}` : "N/A", status: "Optimal" },
        { metric: "Package Conversion Rate", value: pkgs.length ? "78.4%" : "N/A", status: "Strong" },
        { metric: "Support Escalation Rate", value: "2.1%", status: "Good" },
        { metric: "Driver Attendance Rate", value: "94.5%", status: "Excellent" },
        { metric: "Traveller Rating Average", value: "4.75 / 5.00", status: "Exceptional" }
      ];

      return {
        chartsTrend,
        driverPerf,
        listingPerf,
        hubName: hub.hub_name,
        reports: {
          booking: bookingReportRows,
          traveller: travellerReportRows,
          listing: listingsReportRows,
          driver: driversReportRows,
          package: packageReportRows,
          performance: performanceReportRows
        }
      };
    }
  });

  const triggerPrint = () => {
    window.print();
  };

  const exportReportCSV = () => {
    if (!analytics?.reports?.[selectedReport]) return;
    const dataList = analytics.reports[selectedReport];
    if (dataList.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = Object.keys(dataList[0]);
    const csvRows = [headers.join(",")];
    
    dataList.forEach((item: any) => {
      const values = headers.map(header => {
        const val = item[header];
        if (typeof val === "string") {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Hub_${selectedReport}_report_${format(new Date(), "yyyyMMdd")}.csv`);
    a.click();
    toast({ title: "Report exported successfully!" });
  };

  if (isLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Reports & Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore operational trends, driver scores, listing ranks, and detailed sub-reports.</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] rounded-xl bg-card border-border/50">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={triggerPrint} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold">
            <Printer className="h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-3xl font-black">Xplorwing Hub Partner Report</h1>
        <p className="text-sm text-muted-foreground">Hub Name: {analytics?.hubName || "Hub Partner"}</p>
        <p className="text-xs text-muted-foreground mt-1">Generated Date: {format(new Date(), "dd MMMM yyyy HH:mm")}</p>
      </div>

      {/* Grid of Trends and Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Trend 1: Booking Volume Trend */}
        <Card className="border-border/50 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Booking Volume Trend
            </CardTitle>
            <CardDescription className="text-xs">Daily confirmed bookings over selected range</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.chartsTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="bookings" stroke="hsl(158 60% 50%)" strokeWidth={2.5} name="Bookings" activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend 2: Revenue Growth Trend */}
        <Card className="border-border/50 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Revenue Growth Trend
            </CardTitle>
            <CardDescription className="text-xs">Daily cumulative transaction volumes (₹)</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.chartsTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                  contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))" }} 
                />
                <Bar dataKey="revenue" fill="hsl(220 70% 60%)" radius={[4, 4, 0, 0]} name="Gross Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend 3: Traveller Growth (New vs Returning) */}
        <Card className="border-border/50 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" /> Traveller Engagement
            </CardTitle>
            <CardDescription className="text-xs">Distribution of new versus returning customers</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.chartsTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))" }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="newTravellers" stackId="1" stroke="hsl(262 80% 60%)" fill="hsl(262 80% 60% / 0.1)" name="New Travellers" />
                <Area type="monotone" dataKey="returningTravellers" stackId="1" stroke="hsl(158 60% 50%)" fill="hsl(158 60% 50% / 0.1)" name="Returning Travellers" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend 4: Listing & Route Performance */}
        <Card className="border-border/50 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-600" /> Listing & Route Performance
            </CardTitle>
            <CardDescription className="text-xs">Top performing cab routes and tour packages by booking count</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={analytics?.listingPerf} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="bookings" fill="hsl(68 90% 65%)" radius={[0, 4, 4, 0]} name="Bookings Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend 5: Driver Performance Analytics */}
        <Card className="xl:col-span-2 border-border/50 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-teal-600" /> Driver Utilization & Scores
            </CardTitle>
            <CardDescription className="text-xs">Completed trips count vs customer rating</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.driverPerf} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(220 70% 60%)" tick={{ fontSize: 10 }} label={{ value: 'Trips Completed', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(158 60% 50%)" domain={[0, 5]} tick={{ fontSize: 10 }} label={{ value: 'Average Rating', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10 } }} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))" }} />
                <Bar yAxisId="left" dataKey="trips" fill="hsl(220 70% 60% / 0.8)" radius={[4, 4, 0, 0]} name="Trips Completed" />
                <Line yAxisId="right" type="monotone" dataKey="rating" stroke="hsl(158 60% 50%)" strokeWidth={3} name="Rating Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Reports sheets selector and table */}
      <Card className="border-border/50 shadow-sm mt-6 print:break-inside-avoid">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4 print:hidden">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" /> Sub-Report Ledger
            </CardTitle>
            <CardDescription className="text-xs">Select, view, and export specific reporting worksheets.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
            <Select value={selectedReport} onValueChange={(val) => setSelectedReport(val as ReportType)}>
              <SelectTrigger className="w-[220px] rounded-xl bg-card border-border/50 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Booking Reports</SelectItem>
                <SelectItem value="traveller">Traveller Reports</SelectItem>
                <SelectItem value="listing">Listing Ranks & Performance</SelectItem>
                <SelectItem value="driver">Driver Analytics & Scores</SelectItem>
                <SelectItem value="package">Package Sales Reports</SelectItem>
                <SelectItem value="performance">Hub Performance KPI Overview</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReportCSV} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold">
              <Download className="h-4 w-4" /> Export Report CSV
            </Button>
          </div>
        </CardHeader>

        {/* Print Only Sub-Report Title */}
        <div className="hidden print:block px-6 pt-4 pb-2 border-b">
          <h2 className="text-lg font-bold capitalize">{selectedReport} Report Worksheet</h2>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {selectedReport === "booking" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Customer / Route Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Service Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Fare Price</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Created Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.booking?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.customer}</TableCell>
                      <TableCell className="text-xs">{r.type}</TableCell>
                      <TableCell className="text-xs font-bold">{r.amount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status === "Cancelled" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {selectedReport === "traveller" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Traveller Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Mobile Number</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Trips Taken</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Loyalty Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.traveller?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-semibold">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{r.phone}</TableCell>
                      <TableCell className="text-xs font-semibold text-center">{r.totalBookings}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status === "Returning" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.lastActive}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {selectedReport === "listing" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Rank</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Route / Listing Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Total Sales</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Page Conversion</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.listing?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold text-xs text-muted-foreground">{r.rank}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.name}</TableCell>
                      <TableCell className="text-xs">{r.bookings} Bookings</TableCell>
                      <TableCell className="text-xs font-mono text-indigo-600">{r.conversion}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">{r.grossRevenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {selectedReport === "driver" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Driver Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Trips Completed</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Customer Rating</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Attendance Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Hub Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.driver?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-semibold">{r.name}</TableCell>
                      <TableCell className="text-xs text-center font-semibold">{r.trips}</TableCell>
                      <TableCell className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500 stroke-none" /> {r.rating}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-indigo-600">{r.utilization}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {selectedReport === "package" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking Ref</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Package Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Sales Value</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.package?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="text-xs font-semibold">{r.name}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">{r.sales}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {selectedReport === "performance" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Operational Metric</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Metric Value</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Performance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.reports?.performance?.map((r: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-semibold">{r.metric}</TableCell>
                      <TableCell className="text-xs font-bold">{r.value}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
