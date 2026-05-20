import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, payment_status, booking_status, total_price, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching bookings:", error);
    return;
  }

  console.log("All Bookings found:");
  bookings.forEach(b => {
    console.log(`ID: ${b.id} | Status: ${b.booking_status} | Payment: ${b.payment_status} | Price: ${b.total_price} | Created: ${b.created_at}`);
  });
}

run();
