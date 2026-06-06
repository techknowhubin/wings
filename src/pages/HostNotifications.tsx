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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useListings';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type NotificationType = 'booking' | 'payment' | 'kyc' | 'system' | string;

const notificationConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  booking: { icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  payment: { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  kyc: { icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  system: { icon: Info, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  admin: { icon: Settings, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
};

export default function HostNotifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotif = useDeleteNotification();

  // ── Real-time subscription ────────────────────────────────────────────────

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
          // Show a toast for the new notification
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markAsRead.mutateAsync(id);
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
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await markAsRead.mutateAsync(notification.id);
      } catch { /* silent */ }
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time updates for bookings, payments, and admin actions.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="rounded-xl h-10 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary shrink-0"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {(['all', 'unread'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`pb-3 px-4 text-sm font-medium transition-all relative capitalize ${
              filter === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {tab === 'all' && notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                {notifications.length}
              </Badge>
            )}
            {tab === 'unread' && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 rounded-full text-xs">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/60">
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
          <Card className="border-0 shadow-sm bg-card/60 py-16 text-center rounded-2xl">
            <CardContent className="flex flex-col items-center">
              <div className="h-16 w-16 bg-muted/60 rounded-2xl flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                {filter === 'unread'
                  ? "No unread notifications right now."
                  : 'Your notification inbox is empty.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            {filteredNotifications.map((n) => {
              const type = n.type || 'system';
              const config = notificationConfig[type] || notificationConfig.system;
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
                    className={`group border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden cursor-pointer ${
                      n.is_read
                        ? 'bg-card hover:bg-muted/10'
                        : 'bg-primary/5 hover:bg-primary/8 border-l-4 border-l-primary'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                      {/* Icon */}
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <h4 className={`text-sm font-semibold truncate ${n.is_read ? 'text-foreground' : 'text-primary'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                          {n.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => handleMarkAsRead(e, n.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => handleDelete(e, n.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {n.is_read && n.link && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground transition-all ml-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
