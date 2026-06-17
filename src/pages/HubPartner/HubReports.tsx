import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

export default function HubReports() {
  const { profile, user } = useAuth();
  
  // Fetch real data from cab_bookings
  const { data: analytics } = useQuery({
    queryKey: ['hub-reports-analytics', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from('cab_bookings')
        .select('created_at, fare_amount, payment_status, booking_status')
        .eq('hub_partner_id', user?.id);
        
      if (error) throw error;
      
      let totalCommission = 0;
      let pendingPayout = 0;
      
      // Initialize last 7 days chart data
      const chartDataMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        chartDataMap.set(format(date, 'MMM dd'), { name: format(date, 'EEE'), commission: 0 });
      }

      bookings?.forEach(b => {
        // Calculate 5% commission on fare amount
        const commission = (b.fare_amount || 0) * 0.05;
        
        if (b.booking_status !== 'cancelled') {
          totalCommission += commission;
          
          if (b.payment_status === 'pending') {
            pendingPayout += commission;
          }

          // Add to chart data if within last 7 days
          const bookingDate = startOfDay(new Date(b.created_at));
          const dateKey = format(bookingDate, 'MMM dd');
          if (chartDataMap.has(dateKey)) {
            const current = chartDataMap.get(dateKey);
            current.commission += commission;
          }
        }
      });

      return {
        totalCommission,
        pendingPayout,
        chartData: Array.from(chartDataMap.values())
      };
    }
  });

  const chartData = analytics?.chartData || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Earnings & Reports</h2>
          <p className="text-muted-foreground">Financial overview and commission generation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white dark:bg-gray-800">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4 mr-2" /> Generate Full Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Your Total Commission (5%)</CardTitle>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              ₹{(analytics?.totalCommission || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> Lifetime Earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
            <IndianRupee className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ₹{(analytics?.pendingPayout || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">To be settled next cycle</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Commission Trends</CardTitle>
          <CardDescription>Your daily earnings over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="commission" fill="#10b981" radius={[4, 4, 0, 0]} name="Your Commission" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
