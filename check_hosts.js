import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: hostProfiles, error: hpError } = await supabase
    .from('host_profiles')
    .select('id, business_name, onboarding_status');
  console.log("Host Profiles:", hostProfiles, hpError || "");

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, kyc_status');
  console.log("Profiles:", profiles, pError || "");
}

run();
