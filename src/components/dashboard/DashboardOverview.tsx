import { motion } from 'framer-motion';
import {
  Home,
  Building,
  Palmtree,
  Car,
  Bike,
  Compass,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useHostStays,
  useHostHotels,
  useHostResorts,
  useHostCars,
  useHostBikes,
  useHostExperiences,
  useHostBookings,
  useProfile,
} from '@/hooks/useListings';
import { formatPrice, calculateCommission } from '@/lib/supabase-helpers';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { StaggerContainer, StaggerItem, LayoutCard, ModuleSkeleton } from './DashboardTransitions';

export function DashboardOverview() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: stays = [] } = useHostStays(user?.id);
  const { data: hotels = [] } = useHostHotels(user?.id);
  const { data: resorts = [] } = useHostResorts(user?.id);
  const { data: cars = [] } = useHostCars(user?.id);
  const { data: bikes = [] } = useHostBikes(user?.id);
  const { data: experiences = [] } = useHostExperiences(user?.id);
  const { data: bookings = [] } = useHostBookings(user?.id);

  const totalListings = stays.length + hotels.length + resorts.length + cars.length + bikes.length + experiences.length;
  const pendingBookings = bookings.filter((b) => b.booking_status === 'pending').length;
  const confirmedBookings = bookings.filter((b) => b.booking_status === 'confirmed').length;
  const completedBookings = bookings.filter((b) => b.booking_status === 'completed').length;

  const totalEarnings = bookings
    .filter((b) => b.payment_status === 'completed')
    .reduce((sum, b) => {
      const { hostEarnings } = calculateCommission(b.total_price, true);
      return sum + hostEarnings;
    }, 0);

  const thisMonthBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.created_at);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
  });

  const thisMonthEarnings = thisMonthBookings
    .filter((b) => b.payment_status === 'completed')
    .reduce((sum, b) => {
      const { hostEarnings } = calculateCommission(b.total_price, true);
      return sum + hostEarnings;
    }, 0);

  const totalViews = [...stays, ...hotels, ...resorts, ...cars, ...bikes, ...experiences].reduce(
    (sum, listing) => sum + (listing.views_count || 0),
    0
  );

  const firstName = profile?.full_name?.split(' ')[0] || 'Host';

  const stats = [
    {
      label: 'Total Listings',
      value: totalListings,
      change: 'Across all categories',
      icon: Home,
      highlighted: true,
    },
    {
      label: 'Completed Bookings',
      value: completedBookings,
      change: 'All time',
      icon: Calendar,
      highlighted: false,
    },
    {
      label: 'Active Bookings',
      value: confirmedBookings,
      change: `${pendingBookings} pending`,
      icon: TrendingUp,
      highlighted: false,
    },
    {
      label: 'Pending Bookings',
      value: pendingBookings,
      change: 'Needs attention',
      icon: Users,
      highlighted: false,
    },
  ];

  const listingTypes = [
    { icon: Home, label: 'Stays', count: stays.length, path: '/host/stays', color: 'bg-primary/10 text-primary-text' },
    { icon: Building, label: 'Hotels', count: hotels.length, path: '/host/hotels', color: 'bg-accent/10 text-accent' },
    { icon: Palmtree, label: 'Resorts', count: resorts.length, path: '/host/resorts', color: 'bg-primary/10 text-primary-text' },
    { icon: Car, label: 'Cars', count: cars.length, path: '/host/cars', color: 'bg-accent/10 text-accent' },
    { icon: Bike, label: 'Bikes', count: bikes.length, path: '/host/bikes', color: 'bg-primary/10 text-primary-text' },
    { icon: Compass, label: 'Experiences', count: experiences.length, path: '/host/experiences', color: 'bg-accent/10 text-accent' },
  ];

  const recentBookings = bookings.slice(0, 5);

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <StaggerItem className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back, {firstName}! Here's your overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="rounded-xl h-10 shadow-md">
            <Link to="/host/stays?mode=add">
              <span className="mr-1">+</span> Add Listing
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl h-10">
            <Link to="/host/earnings">View Reports</Link>
          </Button>
        </div>
      </StaggerItem>

      {/* Stats Cards */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <LayoutCard key={index} layoutId={`stat-${stat.label}`}>
              <Card
                className={`relative overflow-hidden rounded-2xl border-0 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  stat.highlighted
                    ? 'text-primary-foreground'
                    : 'bg-card'
                }`}
                style={stat.highlighted ? {
                  background: 'linear-gradient(135deg, hsl(158 100% 10%) 0%, hsl(158 80% 25%) 50%, hsl(158 60% 35%) 100%)',
                } : undefined}
              >
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-medium ${stat.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {stat.label}
                    </p>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      stat.highlighted ? 'bg-primary-foreground/15 backdrop-blur-sm' : 'bg-muted/60'
                    }`}>
                      <ArrowUpRight className={`h-4 w-4 ${stat.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                  <p className={`text-3xl lg:text-4xl font-bold ${stat.highlighted ? '' : 'text-foreground'}`}>
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${stat.highlighted ? 'bg-primary-foreground/60' : 'bg-primary'}`} />
                    <p className={`text-xs ${stat.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
                {stat.highlighted && (
                  <div className="absolute inset-0 opacity-20" style={{
                    background: 'radial-gradient(circle at 80% 20%, hsl(158 60% 55% / 0.6) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(158 80% 20% / 0.4) 0%, transparent 50%)',
                  }} />
                )}
              </Card>
            </LayoutCard>
          ))}
        </div>
      </StaggerItem>

      {/* Middle Row: Listings + Earnings */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Listings Grid */}
        <StaggerItem className="lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Your Listings</CardTitle>
                <CardDescription>Manage across categories</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" asChild>
                <Link to="/host/stays">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {listingTypes.map((type) => (
                  <Link key={type.path} to={type.path}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${type.color}`}>
                        <type.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold text-foreground">{type.count}</p>
                        <p className="text-xs text-muted-foreground">{type.label}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Earnings Card */}
        <StaggerItem>
          <Card className="rounded-2xl border-0 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Earnings</CardTitle>
                <CardDescription>Your income overview</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" asChild>
                <Link to="/host/earnings">Details</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl text-primary-foreground relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, hsl(158 100% 10%) 0%, hsl(158 80% 25%) 60%, hsl(158 60% 35%) 100%)',
              }}>
                <div className="relative z-10">
                  <p className="text-xs text-primary-foreground/70">Total Earnings</p>
                  <p className="text-2xl font-bold mt-1">{formatPrice(totalEarnings)}</p>
                  <p className="text-[11px] text-primary-foreground/60 mt-1">After 20% commission</p>
                </div>
                <div className="absolute inset-0 opacity-15" style={{
                  background: 'radial-gradient(circle at 90% 10%, hsl(158 60% 55% / 0.8) 0%, transparent 40%)',
                }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-[11px] text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{formatPrice(thisMonthEarnings)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-[11px] text-muted-foreground">Views</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{totalViews.toLocaleString()}</p>
                </div>
              </div>
              <Button className="w-full rounded-xl h-10" asChild>
                <Link to="/host/link">
                  Create Link-in-Bio
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>

      {/* Recent Bookings */}
      <StaggerItem>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Bookings</CardTitle>
              <CardDescription>Latest booking activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" asChild>
              <Link to="/host/bookings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm mt-1">Share your listings to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((booking, i) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{booking.listing_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.start_date), 'MMM d')} –{' '}
                          {format(new Date(booking.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatPrice(booking.total_price)}</p>
                      </div>
                      <Badge
                        variant={
                          booking.booking_status === 'confirmed'
                            ? 'default'
                            : booking.booking_status === 'pending'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[11px] rounded-lg capitalize"
                      >
                        {booking.booking_status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
