import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardPageTransition } from '@/components/dashboard/DashboardTransitions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAdminMetrics } from '@/hooks/useAdmin';
import { useProfile } from '@/hooks/useListings';
import { DynamicLogo } from '@/components/DynamicLogo';
import {
  LayoutDashboard, ShieldCheck, CheckSquare, Store, Users,
  CalendarCheck, Building2, Wallet, BarChart3, Settings,
  LogOut, FileText, Menu, X, Bell, Search, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: metrics } = useAdminMetrics();
  const { data: profile } = useProfile(user?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out of the admin panel.' });
    navigate('/auth');
  };

  const isActivePath = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Platform Overview', to: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Approvals',
      items: [
        { label: 'KYC Review', to: '/admin/kyc', icon: ShieldCheck, badge: metrics?.pendingKyc },
        { label: 'Listing Approvals', to: '/admin/listings', icon: CheckSquare, badge: metrics?.pendingListings },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Providers', to: '/admin/providers', icon: Store },
        { label: 'Travelers', to: '/admin/users', icon: Users },
        { label: 'All Bookings', to: '/admin/bookings', icon: CalendarCheck },
        { label: 'Hub Partners', to: '/admin/hubs', icon: Building2 },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Payouts', to: '/admin/payouts', icon: Wallet },
        { label: 'Revenue Analytics', to: '/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Platform',
      items: [
        { label: 'Blog Posts', to: '/admin/blog-posts', icon: FileText },
        { label: 'Settings', to: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const renderNavGroup = (section: NavSection) => (
    <div key={section.title} className="mb-2">
      <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {section.title}
      </p>
      <ul className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = isActivePath(item.to);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/admin'}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-destructive text-destructive-foreground'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
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
      {/* Logo + Admin Badge */}
      <div className="px-5 pt-6 pb-4">
        <NavLink to="/" className="flex items-center gap-2.5">
          <DynamicLogo />
        </NavLink>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => renderNavGroup(section))}
      </nav>

      {/* Sign Out */}
      <div className="p-3 mx-2 mb-3">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm h-11"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px] mr-3" />
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
          <Button variant="ghost" size="icon" className="relative rounded-xl">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.profile_image || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {profile?.full_name?.charAt(0) || user?.email?.[0]?.toUpperCase() || 'A'}
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
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
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
        <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-card border-b border-border sticky top-0 z-30">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search…"
              className="pl-10 h-10 bg-muted/40 border-border rounded-xl text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl relative h-10 w-10">
              <Mail className="h-[18px] w-[18px] text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl relative h-10 w-10">
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>System operational</span>
            </div>
            <div className="w-px h-8 bg-border mx-1" />
            <div className="flex items-center gap-3 pl-1">
              <Avatar className="h-9 w-9 border-2 border-border">
                <AvatarImage src={profile?.profile_image || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {profile?.full_name?.charAt(0) || user?.email?.[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:block">
                <p className="text-sm font-semibold text-foreground leading-tight">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground leading-tight">Super Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          <DashboardPageTransition routeKey={location.pathname}>
            <Outlet />
          </DashboardPageTransition>
        </div>
      </main>
    </div>
  );
}
