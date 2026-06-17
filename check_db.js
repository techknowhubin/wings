import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  console.log("Checking platform_settings...");
  const { data: ps, error: psErr } = await supabase
    .from('platform_settings')
    .select('same_day_restrictions_enabled, min_advance_hours, available_time_slots, blocked_time_slots')
    .limit(1)
    .maybeSingle();
  console.log("platform_settings query result:", ps, psErr);

  console.log("Checking cab_bookings...");
  const { data: cb, error: cbErr } = await supabase
    .from('cab_bookings')
    .select('return_date')
    .limit(1);
  console.log("cab_bookings query result:", cb, cbErr);
}

check();
