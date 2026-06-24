import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, TrendingUp, IndianRupee, Coins, Clock, Loader2, 
  ArrowUpRight, ArrowDownRight, CreditCard, Wallet, BadgeCheck, FileSpreadsheet
} from "lucide-react";
import { format, subDays, startOfDay, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function HubEarnings() {
  const { uuid } = useParams<{ uuid: string }>();
  const { toast } = useToast();
  const [activeLogTab, setActiveLogTab] = useState<"settlements" | "payments">("settlements");

  // Query Hub & Financial Analytics
  const { data: financeData, isLoading } = useQuery({
    queryKey: ["hub-financials", uuid],
    enabled: !!uuid,
    queryFn: async () => {
      // 1. Fetch Hub ID
      const { data: hub } = await supabase.from("hubs").select("id").eq("uuid", uuid).single();
      if (!hub) throw new Error("Hub not found");
      const hubId = hub.id;

      // 2. Fetch all Cab Bookings
      const { data: cabBookings } = await supabase
        .from("cab_bookings")
        .select(`
          booking_id,
          fare_amount,
          booking_status,
          payment_status,
          created_at,
          trip_status,
          pickup_location,
          drop_location,
          traveller:profiles!cab_bookings_traveller_id_fkey(full_name, phone)
        `)
        .eq("assigned_hub_uuid", uuid);

      // 3. Fetch Package Bookings
      const { data: packageBookings } = await supabase
        .from("package_bookings")
        .select(`
          id,
          booking_ref,
          total_amount,
          payment_status,
          booking_status,
          created_at,
          tour_packages(name)
        `)
        .eq("hub_id", hubId);

      const cabs = cabBookings || [];
      const packages = packageBookings || [];

      const now = new Date();
      const startOfToday = startOfDay(now);
      const sevenDaysAgo = subDays(now, 7);
      const startOfM = startOfMonth(now);

      // Define helpers to compute earnings
      // Hub Partner Commission: 5% on Cab Bookings, 10% on Packages (standard commission assumption)
      const getCabHubEarning = (fare: number) => fare * 0.05;
      const getPkgHubEarning = (amt: number) => amt * 0.10;

      const getCabPlatShare = (fare: number) => fare * 0.02;
      const getPkgPlatShare = (amt: number) => amt * 0.03;

      let todayRev = 0;
      let weeklyRev = 0;
      let monthlyRev = 0;
      let totalRev = 0;

      let hubEarningsTotal = 0;
      let platShareTotal = 0;

      let completedSettlements = 0;
      let pendingSettlements = 0;

      const settlementsList: any[] = [];
      const paymentsList: any[] = [];

      // Process Cab Bookings
      cabs.forEach((b: any) => {
        const createdDate = new Date(b.created_at);
        const fare = Number(b.fare_amount || 0);
        const isCompleted = b.booking_status === "Completed" || b.trip_status === "Trip Completed";
        const isCancelled = b.booking_status === "Cancelled";

        if (isCompleted) {
          totalRev += fare;
          const hEarn = getCabHubEarning(fare);
          const pShare = getCabPlatShare(fare);

          hubEarningsTotal += hEarn;
          platShareTotal += pShare;

          if (createdDate >= startOfToday) todayRev += fare;
          if (createdDate >= sevenDaysAgo) weeklyRev += fare;
          if (createdDate >= startOfM) monthlyRev += fare;

          if (b.payment_status === "paid" || b.payment_status === "completed") {
            completedSettlements += hEarn;
          } else {
            pendingSettlements += hEarn;
          }

          // Add to settlements
          settlementsList.push({
            id: `SET-CAB-${b.booking_id.slice(-8).toUpperCase()}`,
            bookingRef: b.booking_id.slice(0, 8).toUpperCase(),
            type: "Cab Ride",
            amount: fare,
            hubCommission: hEarn,
            date: b.created_at,
            status: (b.payment_status === "paid" || b.payment_status === "completed") ? "Cleared" : "Pending",
          });
        }

        // Add to payments log if not cancelled (or even if cancelled with refund status)
        if (!isCancelled) {
          paymentsList.push({
            id: `TXN-CAB-${b.booking_id.slice(-8).toUpperCase()}`,
            bookingRef: b.booking_id.slice(0, 8).toUpperCase(),
            source: b.traveller?.full_name || "Traveller",
            details: `${b.pickup_location || "N/A"} → ${b.drop_location || "N/A"}`,
            type: "Traveller Payment",
            grossAmount: fare,
            netEarning: getCabHubEarning(fare),
            date: b.created_at,
            status: b.payment_status || "pending",
          });
        }
      });

      // Process Package Bookings
      packages.forEach((pkg: any) => {
        const createdDate = new Date(pkg.created_at);
        const amt = Number(pkg.total_amount || 0);
        const isCompleted = pkg.booking_status !== "Cancelled" && pkg.booking_status !== "Pending";

        if (isCompleted) {
          totalRev += amt;
          const hEarn = getPkgHubEarning(amt);
          const pShare = getPkgPlatShare(amt);

          hubEarningsTotal += hEarn;
          platShareTotal += pShare;

          if (createdDate >= startOfToday) todayRev += amt;
          if (createdDate >= sevenDaysAgo) weeklyRev += amt;
          if (createdDate >= startOfM) monthlyRev += amt;

          if (pkg.payment_status === "paid" || pkg.payment_status === "completed") {
            completedSettlements += hEarn;
          } else {
            pendingSettlements += hEarn;
          }

          // Add to settlements
          settlementsList.push({
            id: `SET-PKG-${pkg.id.slice(-8).toUpperCase()}`,
            bookingRef: pkg.booking_ref || pkg.id.slice(0, 8).toUpperCase(),
            type: "Tour Package",
            amount: amt,
            hubCommission: hEarn,
            date: pkg.created_at,
            status: (pkg.payment_status === "paid" || pkg.payment_status === "completed") ? "Cleared" : "Pending",
          });
        }

        if (pkg.booking_status !== "Cancelled") {
          paymentsList.push({
            id: `TXN-PKG-${pkg.id.slice(-8).toUpperCase()}`,
            bookingRef: pkg.booking_ref || pkg.id.slice(0, 8).toUpperCase(),
            source: pkg.tour_packages?.name || "Tour Package",
            details: "Standard Tour Booking",
            type: "Traveller Payment",
            grossAmount: amt,
            netEarning: getPkgHubEarning(amt),
            date: pkg.created_at,
            status: pkg.payment_status || "pending",
          });
        }
      });

      // Sort lists by date descending
      settlementsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        todayRev,
        weeklyRev,
        monthlyRev,
        totalRev,
        hubEarningsTotal,
        platShareTotal,
        completedSettlements,
        pendingSettlements,
        settlements: settlementsList,
        payments: paymentsList,
      };
    }
  });

  const exportCSV = (dataList: any[], filename: string, headers: string[]) => {
    if (!dataList || dataList.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const csvRows = [headers.join(",")];
    
    dataList.forEach(item => {
      const values = headers.map(header => {
        const val = item[header];
        // Clean values to avoid issues in CSV parsing
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
    a.setAttribute("download", `${filename}_${format(new Date(), "yyyyMMdd")}.csv`);
    a.click();
    toast({ title: "Report exported successfully!" });
  };

  const exportSettlements = () => {
    if (!financeData?.settlements) return;
    const formatted = financeData.settlements.map((s: any) => ({
      "Settlement ID": s.id,
      "Booking Ref": s.bookingRef,
      "Service Type": s.type,
      "Gross Booking Value": s.amount,
      "Hub Commission (Net)": s.hubCommission,
      "Booking Date": format(new Date(s.date), "yyyy-MM-dd HH:mm"),
      "Settlement Status": s.status,
    }));
    exportCSV(
      formatted,
      "Hub_Settlements_Report",
      ["Settlement ID", "Booking Ref", "Service Type", "Gross Booking Value", "Hub Commission (Net)", "Booking Date", "Settlement Status"]
    );
  };

  const exportRevenue = () => {
    if (!financeData?.payments) return;
    const formatted = financeData.payments.map((p: any) => ({
      "Transaction ID": p.id,
      "Booking Ref": p.bookingRef,
      "Customer / Service": p.source,
      "Details": p.details,
      "Txn Type": p.type,
      "Gross Fare": p.grossAmount,
      "Hub Share": p.netEarning,
      "Transaction Date": format(new Date(p.date), "yyyy-MM-dd HH:mm"),
      "Payment Status": p.status,
    }));
    exportCSV(
      formatted,
      "Hub_Revenue_Transactions",
      ["Transaction ID", "Booking Ref", "Customer / Service", "Details", "Txn Type", "Gross Fare", "Hub Share", "Transaction Date", "Payment Status"]
    );
  };

  if (isLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: "Today's Revenue", value: `₹${(financeData?.todayRev || 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/5 border border-blue-500/10", sub: "Gross fares today" },
    { label: "Weekly Revenue", value: `₹${(financeData?.weeklyRev || 0).toLocaleString("en-IN")}`, icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-500/5 border border-indigo-500/10", sub: "Last 7 days gross" },
    { label: "Monthly Revenue", value: `₹${(financeData?.monthlyRev || 0).toLocaleString("en-IN")}`, icon: FileSpreadsheet, color: "text-purple-600", bg: "bg-purple-500/5 border border-purple-500/10", sub: "Current month gross" },
    { label: "Pending Payout", value: `₹${(financeData?.pendingSettlements || 0).toLocaleString("en-IN")}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/5 border border-amber-500/10", sub: "Awaiting settlement" },
    { label: "Cleared Payout", value: `₹${(financeData?.completedSettlements || 0).toLocaleString("en-IN")}`, icon: BadgeCheck, color: "text-emerald-600", bg: "bg-emerald-500/5 border border-emerald-500/10", sub: "Paid to bank / wallet" },
    { label: "Total Hub Earnings", value: `₹${(financeData?.hubEarningsTotal || 0).toLocaleString("en-IN")}`, icon: Coins, color: "text-emerald-600", bg: "bg-emerald-500/10 border border-emerald-500/20", sub: "Gross partner commission" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Earnings & Settlements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track your hub's commissions, payouts, and revenue streams.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportSettlements} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold">
            <Download className="h-4 w-4" /> Settlements CSV
          </Button>
          <Button onClick={exportRevenue} variant="outline" size="sm" className="rounded-xl gap-2 font-semibold">
            <Download className="h-4 w-4" /> Transactions CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className={`rounded-2xl p-4 shadow-sm ${k.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-lg font-black text-foreground">{k.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tables Log Area */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4">
          <div>
            <CardTitle className="text-base font-bold">Financial History</CardTitle>
            <CardDescription className="text-xs">Browse individual payment collections and commission payout settlements.</CardDescription>
          </div>
          <div className="mt-2 sm:mt-0 flex gap-1 bg-muted/60 p-0.5 rounded-xl">
            <button
              onClick={() => setActiveLogTab("settlements")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeLogTab === "settlements" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Settlements Log
            </button>
            <button
              onClick={() => setActiveLogTab("payments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeLogTab === "payments" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Payments & Refunds
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeLogTab === "settlements" ? (
            <div className="overflow-x-auto min-w-0 w-full pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Settlement ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking Ref</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Service Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking Value</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Hub Net Share</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Payout Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeData?.settlements?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-xs text-muted-foreground py-12">No settlement records found.</TableCell>
                    </TableRow>
                  ) : (
                    financeData?.settlements?.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{s.id}</TableCell>
                        <TableCell className="font-mono text-xs text-foreground">#{s.bookingRef}</TableCell>
                        <TableCell className="text-xs">{s.type}</TableCell>
                        <TableCell className="text-xs font-semibold">₹{s.amount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-bold text-emerald-600">₹{s.hubCommission.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(s.date), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === "Cleared" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                            {s.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 w-full pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Transaction ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Booking Ref</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Customer / Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Service Details</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Txn Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Gross Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Net Commission</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Txn Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeData?.payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-28 text-center text-xs text-muted-foreground py-12">No transaction logs found.</TableCell>
                    </TableRow>
                  ) : (
                    financeData?.payments?.map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{p.id}</TableCell>
                        <TableCell className="font-mono text-xs text-foreground">#{p.bookingRef}</TableCell>
                        <TableCell className="text-xs font-semibold">{p.source}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.details}</TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500 shrink-0" />
                            {p.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">₹{p.grossAmount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs font-bold text-emerald-600">₹{p.netEarning.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize`}>
                            {p.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
