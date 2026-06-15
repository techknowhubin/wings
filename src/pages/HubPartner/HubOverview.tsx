import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, CalendarCheck, Coins, Car, LifeBuoy } from "lucide-react";

export default function HubOverview() {
  const { profile } = useAuth();
  const state = profile?.assigned_state;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['hub-stats', state],
    enabled: !!state,
    queryFn: async () => {
      // In a real app, these would be executed in parallel or via a dedicated RPC function
      // For now, we query tables using RLS (which naturally filters by assigned_state)
      
      const [
        { count: hostsCount },
        { count: staysCount },
        { count: bookingsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'host'),
        supabase.from('stays').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
      ]);

      return {
        hosts: hostsCount || 0,
        listings: staysCount || 0, // Simplified to stays for overview
        bookings: bookingsCount || 0,
        revenue: 0, // Requires complex joins or RPC
        drivers: 0,
        tickets: 0
      };
    }
  });

  if (isLoading) return <div>Loading statistics...</div>;

  const statCards = [
    { title: "Total Hosts", value: stats?.hosts, icon: Users },
    { title: "Total Listings", value: stats?.listings, icon: Building },
    { title: "Total Bookings", value: stats?.bookings, icon: CalendarCheck },
    { title: "Revenue Generated", value: `₹${stats?.revenue}`, icon: Coins },
    { title: "Total Drivers", value: stats?.drivers, icon: Car },
    { title: "Open Support Tickets", value: stats?.tickets, icon: LifeBuoy },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Welcome, Hub Partner</h2>
      <p className="text-muted-foreground">Here is the overview for {state || 'your assigned state'}.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
