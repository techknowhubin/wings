import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  CalendarCheck,
  DollarSign,
  ShieldCheck,
  Info,
  ChevronRight,
  Inbox,
  Trash2,
  Settings,
  X,
  Search,
  Filter,
  Calendar,
  Home,
  CreditCard,
  Loader2,
  ArrowRight,
  MapPin,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useListings';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Define categories mapping for filter
type NotificationCategory = 'all' | 'bookings' | 'listings' | 'payments' | 'system' | 'security';

interface NotificationConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  gradient: string;
  label: string;
}

const categoryConfigs: Record<string, NotificationConfig> = {
  bookings: {
    icon: CalendarCheck,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    label: 'Bookings',
  },
  listings: {
    icon: Home,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    gradient: 'from-indigo-500/10 to-purple-500/10',
    label: 'Listings',
  },
  payments: {
    icon: CreditCard,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    label: 'Payments',
  },
  system: {
    icon: Info,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    gradient: 'from-amber-500/10 to-orange-500/10',
    label: 'System',
  },
  security: {
    icon: ShieldCheck,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    gradient: 'from-rose-500/10 to-pink-500/10',
    label: 'Security',
  },
  default: {
    icon: Bell,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    gradient: 'from-muted/5 to-muted/10',
    label: 'Alert',
  },
};

export default function HostNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotif = useDeleteNotification();

  // State
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refDetails, setRefDetails] = useState<any | null>(null);

  // Real-time Postgres changes subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`host-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          const n = payload.new as any;
          if (n?.title) {
            toast.info(n.title, { description: n.message });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Handlers
  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markAsRead.mutateAsync(id);
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllAsRead.mutateAsync(user.id);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotif.mutateAsync(id);
      toast.success('Notification deleted');
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  // Polymorphic fetcher to load notification reference details
  const fetchReferenceDetails = async (refType: string, refId: string) => {
    if (refType === 'booking') {
      const { data: bData, error: bErr } = await supabase.from('bookings').select('*').eq('id', refId).maybeSingle();
      if (bErr || !bData) return null;

      let lTable = '';
      if (bData.listing_type === 'stay') lTable = 'stays';
      else if (bData.listing_type === 'car') lTable = 'cars';
      else if (bData.listing_type === 'bike') lTable = 'bikes';
      else if (bData.listing_type === 'experience') lTable = 'experiences';
      else if (bData.listing_type === 'hotel') lTable = 'hotels';
      else if (bData.listing_type === 'resort') lTable = 'resorts';

      let title = 'Deleted Listing';
      let image = null;
      let location = 'N/A';
      if (lTable) {
        const { data: lData } = await (supabase as any).from(lTable).select('title, images, location').eq('id', bData.listing_id).maybeSingle();
        if (lData) {
          title = lData.title;
          image = lData.images?.[0] || null;
          location = lData.location || 'N/A';
        }
      }
      return { ...bData, listing_title: title, listing_image: image, listing_location: location };
    }

    if (refType === 'listing') {
      const tables = ['stays', 'hotels', 'resorts', 'cars', 'bikes', 'experiences'];
      for (const table of tables) {
        const { data, error } = await (supabase as any).from(table).select('*').eq('id', refId).maybeSingle();
        if (data) {
          return { ...data, _table: table };
        }
      }
    }
    return null;
  };

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification);
    setRefDetails(null);

    // Read status update if unread
    if (!notification.is_read) {
      try {
        await markAsRead.mutateAsync(notification.id);
      } catch { /* silent */ }
    }

    // Try parsing reference params from query params if db columns are not present
    let refId = notification.reference_id;
    let refType = notification.reference_type;

    if (!refId && notification.link) {
      try {
        const urlObj = new URL(notification.link, window.location.origin);
        refId = urlObj.searchParams.get('ref_id') || urlObj.searchParams.get('id');
        refType = urlObj.searchParams.get('ref_type');
      } catch { /* ignore */ }
    }

    if (refId && refType) {
      setDetailLoading(true);
      try {
        const details = await fetchReferenceDetails(refType, refId);
        setRefDetails(details);
      } catch (e) {
        console.error('Failed to load reference details:', e);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  // Derived filters & metrics
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const categoryCounts = {
    all: notifications.length,
    bookings: notifications.filter((n) => n.type === 'bookings' || n.type === 'booking').length,
    listings: notifications.filter((n) => n.type === 'listings' || n.type === 'listing').length,
    payments: notifications.filter((n) => n.type === 'payments' || n.type === 'payment').length,
    system: notifications.filter((n) => n.type === 'system').length,
    security: notifications.filter((n) => n.type === 'security').length,
  };

  const filteredNotifications = notifications.filter((n) => {
    // 1. Search Query filter
    const matchesSearch =
      searchQuery === '' ||
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Category tab filter
    const normalizedType = n.type === 'booking' ? 'bookings' : n.type === 'listing' ? 'listings' : n.type === 'payment' ? 'payments' : n.type;
    const matchesCategory = selectedCategory === 'all' || normalizedType === selectedCategory;

    if (!matchesCategory) return false;

    // 3. Read status filter
    if (readFilter === 'unread') return !n.is_read;
    if (readFilter === 'read') return n.is_read;
    return true;
  });

  const getCleanStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400',
      confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
      cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
      rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
      suspended: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
      active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
    };
    return (
      <Badge variant="outline" className={`capitalize text-[10px] ${colorMap[status] || 'bg-muted'}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-background to-background p-6 rounded-3xl border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Notifications</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Stay updated with bookings, property approvals, payouts, and account security.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="rounded-2xl h-10 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-200"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Control Panel: Search & Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications by title or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-2xl border-border/80 focus-visible:ring-primary bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Read/Unread Filters */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl border border-border/60">
          {(['all', 'unread', 'read'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setReadFilter(mode)}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-xl transition-all capitalize ${
                readFilter === mode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border">
        {([
          { id: 'all', label: 'All', icon: Inbox },
          { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
          { id: 'listings', label: 'Listings', icon: Home },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'system', label: 'System', icon: Info },
          { id: 'security', label: 'Security', icon: ShieldCheck },
        ] as const).map((cat) => {
          const count = categoryCounts[cat.id];
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Cards Container */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/60 rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredNotifications.length === 0 ? (
          <Card className="border border-dashed border-border/80 py-20 text-center rounded-3xl bg-card/40">
            <CardContent className="flex flex-col items-center">
              <div className="h-16 w-16 bg-muted/60 rounded-3xl flex items-center justify-center mb-4 text-muted-foreground">
                <Inbox className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">No notifications found</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {searchQuery || readFilter !== 'all' || selectedCategory !== 'all'
                  ? "Try resetting filters or changing your search keywords."
                  : "We will notify you when events occur in your account."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            {filteredNotifications.map((n) => {
              const rawType = n.type || 'default';
              const normType = rawType === 'booking' ? 'bookings' : rawType === 'listing' ? 'listings' : rawType === 'payment' ? 'payments' : rawType;
              const config = categoryConfigs[normType] || categoryConfigs.default;
              const Icon = config.icon;
              const relativeTime = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    onClick={() => handleNotificationClick(n)}
                    className={`group border border-border/60 hover:border-primary/30 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 rounded-3xl overflow-hidden cursor-pointer ${
                      n.is_read
                        ? 'bg-card hover:bg-muted/10'
                        : 'bg-primary/5 dark:bg-primary/5 hover:bg-primary/8 border-l-4 border-l-primary'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                      {/* Icon with gradient circle */}
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${config.gradient} ${config.bg} ${config.color} border border-border/10`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-bold truncate ${
                                n.is_read ? 'text-foreground' : 'text-primary'
                              }`}
                            >
                              {n.title}
                            </h4>
                            {!n.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            <span>{relativeTime}</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>

                      {/* Side Actions (Hidden by default, shown on hover/focus) */}
                      <div className="flex items-center gap-1 shrink-0 self-center md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => handleMarkAsRead(e, n.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl hover:bg-rose-500/10 hover:text-rose-600"
                          onClick={(e) => handleDelete(e, n.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-all ml-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Premium Reference Details Modal Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden">
          {selectedNotification && (
            <>
              <DialogHeader className="pb-3 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      categoryConfigs[
                        selectedNotification.type === 'booking'
                          ? 'bookings'
                          : selectedNotification.type === 'listing'
                          ? 'listings'
                          : selectedNotification.type === 'payment'
                          ? 'payments'
                          : selectedNotification.type || 'default'
                      ]?.bg || 'bg-muted'
                    }`}
                  >
                    {(() => {
                      const CatIcon =
                        categoryConfigs[
                          selectedNotification.type === 'booking'
                            ? 'bookings'
                            : selectedNotification.type === 'listing'
                            ? 'listings'
                            : selectedNotification.type === 'payment'
                            ? 'payments'
                            : selectedNotification.type || 'default'
                        ]?.icon || Bell;
                      return <CatIcon className="h-4.5 w-4.5 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      {selectedNotification.title}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      ID: {selectedNotification.id} · {format(new Date(selectedNotification.created_at), 'PPP p')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Message */}
              <div className="space-y-4 pt-3">
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Reference Details Section */}
                {detailLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground font-semibold">Loading associated details...</p>
                  </div>
                ) : (
                  refDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <Separator />
                      
                      {/* 1. BOOKINGS REF TYPE */}
                      {selectedNotification.reference_type === 'booking' && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking Details</p>
                          <div className="flex gap-3 items-center">
                            {refDetails.listing_image ? (
                              <img
                                src={refDetails.listing_image}
                                alt={refDetails.listing_title}
                                className="w-16 h-16 rounded-xl object-cover border border-border"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                                <Calendar className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-foreground line-clamp-1">{refDetails.listing_title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {refDetails.listing_location}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40 text-xs">
                            <div>
                              <p className="text-muted-foreground">Check-in</p>
                              <p className="font-bold text-foreground mt-0.5">
                                {format(new Date(refDetails.start_date), 'EEE, MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Check-out</p>
                              <p className="font-bold text-foreground mt-0.5">
                                {format(new Date(refDetails.end_date), 'EEE, MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mt-2">Booking Status</p>
                              <div className="mt-0.5">{getCleanStatusBadge(refDetails.booking_status)}</div>
                            </div>
                            <div>
                              <p className="text-muted-foreground mt-2">Payment Status</p>
                              <div className="mt-0.5">{getCleanStatusBadge(refDetails.payment_status || 'pending')}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-primary/5 p-3 rounded-2xl border border-primary/10">
                            <span className="text-xs font-semibold text-foreground">Total Price (Commission Paid)</span>
                            <span className="text-sm font-black text-primary">₹{refDetails.total_price?.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}

                      {/* 2. LISTINGS REF TYPE */}
                      {selectedNotification.reference_type === 'listing' && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Listing Info</p>
                          <div className="flex gap-3 items-center">
                            {refDetails.images?.[0] ? (
                              <img
                                src={refDetails.images[0]}
                                alt={refDetails.title}
                                className="w-16 h-16 rounded-xl object-cover border border-border"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                                <Home className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-foreground line-clamp-1">{refDetails.title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {refDetails.location || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40 text-xs">
                            <div>
                              <p className="text-muted-foreground">Base Price</p>
                              <p className="font-bold text-foreground mt-0.5">₹{refDetails.price?.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Marketplace Visible</p>
                              <Badge variant="outline" className={`mt-0.5 text-[10px] ${refDetails.marketplace_visible ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                                {refDetails.marketplace_visible ? 'Visible' : 'Hidden'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground mt-2">Approval Status</p>
                              <div className="mt-0.5">{getCleanStatusBadge(refDetails.approval_status || 'pending')}</div>
                            </div>
                            <div>
                              <p className="text-muted-foreground mt-2">Verified Host</p>
                              <Badge variant="outline" className={`mt-0.5 text-[10px] ${refDetails.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {refDetails.is_verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-9"
                  onClick={() => setSelectedNotification(null)}
                >
                  Dismiss
                </Button>

                {selectedNotification.link && (
                  <Button
                    size="sm"
                    className="rounded-xl text-xs h-9 bg-primary text-primary-foreground gap-1.5"
                    onClick={() => {
                      setSelectedNotification(null);
                      navigate(selectedNotification.link);
                    }}
                  >
                    View Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
