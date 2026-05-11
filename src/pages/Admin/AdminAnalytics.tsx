import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Wallet, BarChart3, Zap } from 'lucide-react';

const INR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PERIOD_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const CATEGORY_COLORS: Record<string, string> = {
  stay: '#013220',
  hotel: '#6366f1',
  resort: '#10b981',
  car: '#f59e0b',
  bike: '#ef4444',
  experience: '#ec4899',
};

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminAnalytics(days);

  const summaryCards = [
    { label: 'Total GMV', value: INR(data?.totalGmv ?? 0), icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Platform Revenue', value: INR(data?.platformRevenue ?? 0), icon: Wallet, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Avg. Booking Value', value: INR(data?.avgBookingValue ?? 0), icon: BarChart3, color: 'bg-purple-500/10 text-purple-600' },
  ];

  const topCategory = (data?.bookingsByCategory ?? []).sort((a: any, b: any) => b.count - a.count)[0]?.type ?? '—';

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide performance metrics and trends.</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? 'default' : 'outline'}
              className={days === p.days ? 'bg-[#013220] text-white' : ''}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
                  {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-black">{c.value}</p>}
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fastest Growing</p>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-black capitalize">{topCategory}</p>}
              </div>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV Over Time */}
        <Card>
          <CardHeader><CardTitle className="text-sm">GMV Over Time</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.gmvOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [INR(Number(v)), 'GMV']} />
                  <Line type="monotone" dataKey="gmv" stroke="#013220" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Category */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Bookings by Category</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.bookingsByCategory ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#013220" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Platform Revenue Over Time */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Platform Revenue Over Time</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.gmvOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [INR(Number(v)), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#D4E034" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Booking Count */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Booking Volume</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.gmvOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
