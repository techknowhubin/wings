import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardPageTransition } from '@/components/dashboard/DashboardTransitions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicLogo } from '@/components/DynamicLogo';
import NotificationBell from '@/components/NotificationBell';
import {
  LayoutDashboard, Users, Building, CalendarCheck, Car,
  LifeBuoy, BarChart3, Settings, User, LogOut, Menu, X, Bell, Search,
  Building2, PhoneIncoming, HeadphonesIcon, MapPin, Star,
  ShoppingBag, Coins, FileText, ChevronDown, ChevronRight, Truck,
  Navigation, Mail, Map, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function HubLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { uuid } = useParams<{ uuid: string }>();
  const baseUrl = `/hub/${uuid}`;

  const { data: hubDetails } = useQuery({
    queryKey: ['hub-layout-details', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data: hub, error: hubError } = await supabase
        .from('hubs')
        .select('id, hub_name, district, area')
        .eq('uuid', uuid)
        .single();
      if (hubError) throw hubError;

      let fullName = hub.hub_name;
      let hubState = 'N/A';

      if (hub.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, assigned_state')
          .eq('id', hub.id)
          .single();

        if (profile) {
          if (profile.full_name) fullName = profile.full_name;
          if (profile.assigned_state) hubState = profile.assigned_state;
        }
      }

      return { ...hub, display_name: fullName, state: hubState };
    }
  });

  // Fetch pending booking requests count for badge
  const { data: pendingCount } = useQuery({
    queryKey: ['hub-pending-count', uuid],
    enabled: !!uuid,
    refetchInterval: 60000,
    queryFn: async () => {
      const { count } = await supabase
        .from('cab_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_hub_uuid', uuid)
        .in('booking_status', ['Pending', 'Awaiting Hub Partner Assignment']);
      return count || 0;
    }
  });

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', to: `${baseUrl}`, icon: LayoutDashboard },
      ],
    },
    {
      title: 'Bookings',
      items: [
        { label: 'Booking Requests', to: `${baseUrl}/booking-requests`, icon: CalendarCheck, badge: pendingCount && pendingCount > 0 ? String(pendingCount) : undefined },
        { label: 'Outstation Cabs', to: `${baseUrl}/outstation-cabs`, icon: Car },
        { label: 'Airport & Local Rentals', to: `${baseUrl}/local-cabs`, icon: Car },
        { label: 'Marketplace Bookings', to: `${baseUrl}/marketplace-bookings`, icon: ShoppingBag },
        { label: 'Walk-In Enquiries', to: `${baseUrl}/walkin-enquiries`, icon: PhoneIncoming },
        { label: 'Traveller Assistance', to: `${baseUrl}/traveller-assistance`, icon: HeadphonesIcon },
      ],
    },
    {
      title: 'Network',
      items: [
        { label: 'Hosts', to: `${baseUrl}/hosts`, icon: Users },
        { label: 'Listings', to: `${baseUrl}/listings`, icon: Building },
        { label: 'Drivers & Vehicles', to: `${baseUrl}/drivers`, icon: Truck },
      ],
    },
    {
      title: 'Customers',
      items: [
        { label: 'Travellers', to: `${baseUrl}/travellers`, icon: MapPin },
        { label: 'Reviews', to: `${baseUrl}/reviews`, icon: Star },
      ],
    },
    {
      title: 'Experiences',
      items: [
        { label: 'Assigned Packages', to: `${baseUrl}/experiences`, icon: Map },
        { label: 'Package Bookings', to: `${baseUrl}/experiences/bookings`, icon: Map },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Hub Earnings', to: `${baseUrl}/earnings`, icon: Coins },
        { label: 'Listing Revenue', to: `${baseUrl}/listing-revenue`, icon: Wallet },
        { label: 'Payouts', to: `${baseUrl}/payouts`, icon: FileText },
      ],
    },
    {
      title: 'Platform',
      items: [
        { label: 'Reports', to: `${baseUrl}/reports`, icon: BarChart3 },
        { label: 'Coupons & Offers', to: `${baseUrl}/coupons`, icon: Tag },
        { label: 'Support', to: `${baseUrl}/support`, icon: LifeBuoy },
        { label: 'Profile', to: `${baseUrl}/profile`, icon: User },
        { label: 'Settings', to: `${baseUrl}/settings`, icon: Settings },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out of the hub panel.' });
    navigate('/auth');
  };

  const isActivePath = (path: string) => {
    if (path === baseUrl) return location.pathname === baseUrl;
    if (location.pathname === path) return true;

    const allPaths = sections.flatMap(s => s.items.map(i => i.to));
    if (allPaths.includes(location.pathname)) {
      return false;
    }

    return location.pathname.startsWith(path + '/');
  };

  const renderNavGroup = (section: NavSection) => (
    <div key={section.title} className="mb-1">
      <p className="px-4 mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {section.title}
      </p>
      <ul className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = isActivePath(item.to);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === baseUrl}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm transition-all duration-200 relative group',
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 font-semibold shadow-sm'
                    : 'text-muted-foreground bg-transparent hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                )}
              >
                <item.icon className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1 truncate text-[13px]">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-destructive text-destructive-foreground'
                  )}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + Hub Badge */}
      <div className="px-5 pt-5 pb-3 border-b border-border/50">
        <NavLink to="/" className="flex items-center gap-2.5">
          <DynamicLogo />
        </NavLink>
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Hub Partner</p>
            {(hubDetails?.display_name || hubDetails?.hub_name) && (
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate mt-0.5 leading-none">
                {hubDetails.display_name || hubDetails.hub_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar py-2 px-1">
        {sections.map((section) => renderNavGroup(section))}
      </nav>

      {/* User info + Sign Out */}
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
              {(hubDetails?.display_name)?.charAt(0)?.toUpperCase() || 'H'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-foreground">{hubDetails?.display_name || 'Hub Partner'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{hubDetails?.state || 'N/A'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-9"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] bg-card border-r border-border fixed left-0 top-0 h-screen z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <DynamicLogo lightHeightClass="h-7" darkHeightClass="h-[36px]" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-600 text-white text-sm font-bold">
              {(hubDetails?.display_name)?.charAt(0)?.toUpperCase() || 'H'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 h-full w-[240px] bg-card border-r border-border z-50 shadow-2xl"
            >
              <div className="absolute top-4 right-3">
                <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen pt-14 lg:pt-0 lg:ml-[240px]">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between h-14 px-6 bg-card border-b border-border sticky top-0 z-30">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookings, hosts, travellers..."
              className="pl-10 h-9 bg-muted/40 border-border rounded-xl text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hub Operational</span>
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <NotificationBell />
            <div className="flex items-center gap-2 pl-1">
              <Avatar className="h-8 w-8 border-2 border-border">
                <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                  {(hubDetails?.display_name)?.charAt(0)?.toUpperCase() || 'H'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:block">
                <p className="text-xs font-semibold text-foreground leading-tight">{hubDetails?.display_name || 'Hub Partner'}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{hubDetails?.state || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <DashboardPageTransition routeKey={location.pathname}>
            <Outlet />
          </DashboardPageTransition>
        </div>
      </main>
    </div>
  );
}
