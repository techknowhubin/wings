import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const bookingData = {
    listing_id: 'd371abb0-3102-461c-822a-03fac35aada2', // Manali Nast Stay
    listing_type: "stay",
    host_id: 'eb4e7434-b227-40cc-be96-6602448568e2',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days later
    total_price: 250.00,
    currency: "INR",
    payment_status: "pending",
    payment_method: "razorpay",
    booking_status: "pending",
    guests_count: 2
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select();

  console.log("Insert Response:", data || "", error || "");
}

run();
