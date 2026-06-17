import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building, CalendarCheck, Coins, Car, LifeBuoy, Clock, CheckCircle, CheckSquare, CalendarDays } from "lucide-react";

function MetricCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-black tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500">
          <h2 className="text-xl font-bold">Something went wrong.</h2>
          <pre className="mt-4 p-4 bg-gray-100 rounded text-sm text-black">{this.state.error?.message || String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function HubOverviewContent() {
  const { uuid } = useParams<{ uuid: string }>();

  // Fetch hub details
  const { data: hubDetails } = useQuery({
    queryKey: ['hub-details', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .eq('uuid', uuid)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['hub-stats', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: allBookings },
        { count: todayBookings },
      ] = await Promise.all([
        supabase.from('cab_bookings').select('booking_status').eq('assigned_hub_uuid', uuid),
        supabase.from('cab_bookings').select('*', { count: 'exact', head: true })
          .eq('assigned_hub_uuid', uuid)
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
    { title: "Total Bookings", value: stats?.total || 0, icon: Car, color: "bg-blue-500/10 text-blue-600" },
    { title: "Today's Bookings", value: stats?.today || 0, icon: CalendarDays, color: "bg-purple-500/10 text-purple-600" },
    { title: "Pending Bookings", value: stats?.pending || 0, icon: Clock, color: "bg-orange-500/10 text-orange-600" },
    { title: "Confirmed Bookings", value: stats?.confirmed || 0, icon: CheckSquare, color: "bg-emerald-500/10 text-emerald-600" },
    { title: "Completed Bookings", value: stats?.completed || 0, icon: CheckCircle, color: "bg-teal-500/10 text-teal-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Welcome to {hubDetails?.hub_name || "Hub Partner Dashboard"}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here is the overview for {hubDetails?.area ? `${hubDetails.area}, ` : ''}{hubDetails?.district ? `${hubDetails.district}, ` : ''}your assigned location.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <MetricCard 
            key={i} 
            label={stat.title} 
            value={stat.value} 
            icon={stat.icon} 
            color={stat.color} 
          />
        ))}
      </div>
    </div>
  );
}

export default function HubOverview() {
  return (
    <ErrorBoundary>
      <HubOverviewContent />
    </ErrorBoundary>
  );
}
