import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardPageTransition } from './DashboardTransitions';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Home,
  Building,
  Palmtree,
  Car,
  Bike,
  Compass,
  Calendar,
  DollarSign,
  Link2,
  TicketPercent,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  HelpCircle,
  Mail,
  ChevronDown,
  Package,
  Lock,
  Plus,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { useProfile, useUnreadNotificationCount } from '@/hooks/useListings';
import { cn } from '@/lib/utils';
import { DynamicLogo } from '../DynamicLogo';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const mainMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/host/dashboard' },
  { icon: Bell, label: 'Notifications', path: '/host/notifications', badge: true },
  { icon: Calendar, label: 'Bookings', path: '/host/bookings' },
];

// All possible listing types with their sidebar config
const ALL_LISTING_TYPES = [
  { key: 'stays',       icon: Home,    label: 'Home Stays',             path: '/host/stays' },
  { key: 'hotels',      icon: Building, label: 'Hotels',                path: '/host/hotels' },
  { key: 'resorts',     icon: Palmtree, label: 'Resorts',               path: '/host/resorts' },
  { key: 'cars',        icon: Car,     label: 'Car Rentals',            path: '/host/cars' },
  { key: 'bikes',       icon: Bike,    label: 'Bike Rentals',           path: '/host/bikes' },
  { key: 'experiences', icon: Compass, label: 'Packages/Experiences',   path: '/host/experiences' },
] as const;

type ListingTypeKey = typeof ALL_LISTING_TYPES[number]['key'];

const generalMenuItems = [
  { icon: DollarSign, label: 'Financials', path: '/host/earnings' },
  { icon: Link2, label: 'Link-in-Bio', path: '/host/link' },
  { icon: TicketPercent, label: 'Coupon Codes', path: '/host/coupons' },
  { icon: Settings, label: 'Settings', path: '/host/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

function useHostApprovedTypes(userId?: string) {
  return useQuery({
    queryKey: ['host', 'approved-types', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await (supabase as any)
        .from('host_profiles')
        .select('approved_listing_types, primary_listing_type')
        .eq('id', userId)
        .maybeSingle();
      return data as { approved_listing_types: string[] | null; primary_listing_type: string | null } | null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function useMyListingTypeRequests(userId?: string) {
  return useQuery({
    queryKey: ['host', 'listing-requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await (supabase as any)
        .from('listing_type_requests')
        .select('requested_type, status')
        .eq('host_id', userId);
      return (data ?? []) as Array<{ requested_type: string; status: string }>;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

function useRequestListingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hostId, type, note }: { hostId: string; type: string; note: string }) => {
      const { error } = await (supabase as any).from('listing_type_requests').insert({
        host_id: hostId,
        requested_type: type,
        host_note: note || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['host', 'listing-requests', variables.hostId] });
      toast.success('Request submitted! Admin will review it shortly.');
    },
    onError: (err: any) => {
      if (err?.code === '23505') {
        toast.info('You already have a pending request for this listing type.');
      } else {
        toast.error(err?.message || 'Failed to submit request');
      }
    },
  });
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isListingRoute = ALL_LISTING_TYPES.some(t => location.pathname.startsWith(t.path));
  const [listingsOpen, setListingsOpen] = useState(isListingRoute);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { data: profile } = useProfile(user?.id);
  const { data: unreadCount } = useUnreadNotificationCount(user?.id);
  const { data: hostData } = useHostApprovedTypes(user?.id);
  const { data: typeRequests = [] } = useMyListingTypeRequests(user?.id);
  const requestMut = useRequestListingType();

  const [requestDialog, setRequestDialog] = useState<{ open: boolean; type: ListingTypeKey | null }>({ open: false, type: null });
  const [requestNote, setRequestNote] = useState('');

  // If approved_listing_types is empty/null → show all (legacy hosts)
  const approvedTypes: string[] = hostData?.approved_listing_types?.length
    ? hostData.approved_listing_types
    : [];
  const hasRestriction = approvedTypes.length > 0;

  const approvedItems = hasRestriction
    ? ALL_LISTING_TYPES.filter(t => approvedTypes.includes(t.key))
    : ALL_LISTING_TYPES;

  const lockedItems = hasRestriction
    ? ALL_LISTING_TYPES.filter(t => !approvedTypes.includes(t.key))
    : [];

  const getRequestStatus = (key: string) =>
    typeRequests.find(r => r.requested_type === key)?.status ?? null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActivePath = (path: string) => {
    if (path === '/host/dashboard') return location.pathname === '/host' || location.pathname === '/host/dashboard';
    return location.pathname.startsWith(path);
  };

  const renderNavGroup = (items: typeof mainMenuItems, label: string) => (
    <div className="mb-2">
      <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = isActivePath(item.path);
          return (
            <li key={item.label}>
              <Link
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] shrink-0")} />
                <span>{item.label}</span>
                {item.badge && unreadCount && unreadCount > 0 && (
                  <span className={cn(
                    "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-destructive text-destructive-foreground"
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link to="/" className="flex items-center gap-2.5">
          <DynamicLogo />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {renderNavGroup(mainMenuItems, 'Menu')}

        {/* Listings Accordion */}
        <div className="mb-2">
          <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Listings</p>
          <Collapsible open={listingsOpen} onOpenChange={setListingsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm transition-all duration-200 w-[calc(100%-16px)] relative",
                  isListingRoute
                    ? "text-primary-text font-medium bg-primary/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Package className="h-[18px] w-[18px] shrink-0" />
                <span>Listings</span>
                <ChevronDown className={cn(
                  "h-4 w-4 ml-auto shrink-0 transition-transform duration-200",
                  listingsOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <ul className="space-y-0.5 mt-0.5 ml-3">
                {/* Approved listing types */}
                {approvedItems.map((item) => {
                  const isActive = isActivePath(item.path);
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 mx-2 rounded-xl text-sm transition-all duration-200 relative",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-md"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="h-[16px] w-[16px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}

                {/* Locked listing types with request option */}
                {lockedItems.map((item) => {
                  const reqStatus = getRequestStatus(item.key);
                  return (
                    <li key={item.key}>
                      <div className="flex items-center gap-2 px-4 py-2 mx-2 rounded-xl text-sm text-muted-foreground/50">
                        <item.icon className="h-[16px] w-[16px] shrink-0" />
                        <span className="flex-1 line-through">{item.label}</span>
                        {reqStatus === 'pending' && (
                          <span title="Request pending review">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                        {reqStatus === 'approved' && (
                          <span title="Approved">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          </span>
                        )}
                        {!reqStatus && (
                          <button
                            title="Request access"
                            onClick={() => { setRequestDialog({ open: true, type: item.key as ListingTypeKey }); setRequestNote(''); }}
                            className="p-0.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {reqStatus === 'rejected' && (
                          <button
                            title="Re-request access"
                            onClick={() => { setRequestDialog({ open: true, type: item.key as ListingTypeKey }); setRequestNote(''); }}
                            className="p-0.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}

                {/* Request new type button (only when restrictions are active) */}
                {hasRestriction && lockedItems.length > 0 && (
                  <li>
                    <p className="px-6 py-1.5 text-[10px] text-muted-foreground/50 italic flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Click + to request access
                    </p>
                  </li>
                )}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {renderNavGroup(generalMenuItems, 'General')}
      </nav>

      {/* Sign Out */}
      <div className="p-3 mx-2 mb-3">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm h-11"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px] mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  const requestedTypeLabel = requestDialog.type
    ? ALL_LISTING_TYPES.find(t => t.key === requestDialog.type)?.label ?? ''
    : '';

  return (
    <>
      <div className="min-h-screen bg-muted/30 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-[230px] bg-card border-r border-border fixed left-0 top-0 h-screen z-40">
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
              {unreadCount && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.profile_image || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {profile?.full_name?.charAt(0) || 'H'}
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
                className="lg:hidden fixed left-0 top-0 h-full w-[230px] bg-card border-r border-border z-50 shadow-2xl"
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
        <main className="flex-1 min-h-screen pt-14 lg:pt-0 lg:ml-[230px]">
          {/* Desktop Top Bar */}
          <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-card border-b border-border sticky top-0 z-30">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 h-10 bg-muted/40 border-border rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl relative h-10 w-10">
                <Mail className="h-[18px] w-[18px] text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl relative h-10 w-10">
                <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
              <div className="w-px h-8 bg-border mx-1" />
              <div className="flex items-center gap-3 pl-1">
                <Avatar className="h-9 w-9 border-2 border-border">
                  <AvatarImage src={profile?.profile_image || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {profile?.full_name?.charAt(0) || 'H'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block">
                  <p className="text-sm font-semibold text-foreground leading-tight">{profile?.full_name || 'Host'}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-8">
            <DashboardPageTransition routeKey={location.pathname}>
              {children}
            </DashboardPageTransition>
          </div>
        </main>
      </div>

      {/* Request Listing Type Dialog */}
      <Dialog open={requestDialog.open} onOpenChange={(open) => setRequestDialog({ open, type: open ? requestDialog.type : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Request Access — {requestedTypeLabel}
            </DialogTitle>
            <DialogDescription>
              Your request will be reviewed by the admin. Once approved, <strong>{requestedTypeLabel}</strong> will appear in your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Why do you want to add this listing type? <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                placeholder="e.g. I have a fleet of cars I'd like to list alongside my homestay..."
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setRequestDialog({ open: false, type: null })}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={requestMut.isPending}
                onClick={() => {
                  if (!user || !requestDialog.type) return;
                  requestMut.mutate(
                    { hostId: user.id, type: requestDialog.type, note: requestNote },
                    { onSuccess: () => setRequestDialog({ open: false, type: null }) }
                  );
                }}
              >
                {requestMut.isPending ? 'Sending…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
