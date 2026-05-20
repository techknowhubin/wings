import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const email = `test_${Math.floor(Math.random() * 1000000)}@example.com`;
  const password = "Password123!";
  
  console.log("Trying to sign up email:", email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Test Developer",
        role: "user"
      }
    }
  });

  if (error) {
    console.error("Signup failed:", error);
    return;
  }

  console.log("Signup success! User ID:", data.user?.id);
  console.log("Session:", data.session ? "Active (No email verification required)" : "None (Email verification required)");
}

run();
