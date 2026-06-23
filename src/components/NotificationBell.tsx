import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Ask for native notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to new cab bookings (can extend to other tables)
    const channel = supabase.channel('realtime_bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cab_bookings' }, payload => {
        handleNewBooking(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, payload => {
        handleNewBooking(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleNewBooking = (booking: any) => {
    setUnreadCount(prev => prev + 1);
    
    // Play sound if possible
    try {
      const audio = new Audio('/notification.mp3'); // Optional: sound effect
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch(e) {}

    // Show native notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const amount = booking.fare_amount || booking.total_price || 0;
      const type = booking.listing_type || 'Cab/Transfer';
      const notification = new Notification('New Booking Received', {
        body: `Booking Type: ${type}\nAmount: ₹${amount.toLocaleString('en-IN')}`,
        icon: '/icon-192x192.png'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        setUnreadCount(0);
      };
    }
  };

  return (
    <Button variant="ghost" size="icon" className="relative rounded-xl" onClick={() => setUnreadCount(0)}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
      )}
    </Button>
  );
}
