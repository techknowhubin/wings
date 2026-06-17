import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, CalendarCheck, Coins, Car, LifeBuoy, Clock, CheckCircle, CheckSquare, CalendarDays } from "lucide-react";

export default function HubOverview() {
  const { user, profile } = useAuth();
  const state = profile?.assigned_state;
  const district = profile?.assigned_district;
  const area = profile?.assigned_area;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['hub-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: allBookings },
        { count: todayBookings },
      ] = await Promise.all([
        supabase.from('cab_bookings').select('booking_status').eq('hub_partner_id', user.id),
        supabase.from('cab_bookings').select('*', { count: 'exact', head: true })
          .eq('hub_partner_id', user.id)
          .gte('created_at', today)
      ]);

      const bookings = allBookings || [];
      const total = bookings.length;
      const pending = bookings.filter(b => b.booking_status === 'Pending' || !b.booking_status || b.booking_status === 'Awaiting Hub Partner Assignment').length;
      const confirmed = bookings.filter(b => b.booking_status === 'Confirmed').length;
      const completed = bookings.filter(b => b.booking_status === 'Completed').length;

      return {
        total,
        pending,
        confirmed,
        completed,
        today: todayBookings || 0
      };
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading overview...</div>;

  const statCards = [
    { title: "Total Bookings", value: stats?.total || 0, icon: Car },
    { title: "Pending Bookings", value: stats?.pending || 0, icon: Clock },
    { title: "Confirmed Bookings", value: stats?.confirmed || 0, icon: CheckSquare },
    { title: "Completed Bookings", value: stats?.completed || 0, icon: CheckCircle },
    { title: "Today's Bookings", value: stats?.today || 0, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Welcome, Hub Partner</h2>
      <p className="text-muted-foreground">
        Here is the overview for {area ? `${area}, ` : ''}{district ? `${district}, ` : ''}{state || 'your assigned location'}.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
