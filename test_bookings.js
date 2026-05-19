const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  try {
    const { data: bookings, error: bookingsError } = await supabase.from('bookings').select('*');
    console.log("Bookings:", bookings);
    if (bookingsError) console.log("Bookings Error:", bookingsError);

    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, kyc_status');
    console.log("Profiles list:", profiles);
    if (profilesError) console.log("Profiles Error:", profilesError);

    const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('*');
    console.log("User Roles count:", userRoles?.length);
    console.log("Hosts count:", userRoles?.filter(r => r.role === 'host').length);

  } catch (err) {
    console.error("Exception:", err);
  }
}

run();
