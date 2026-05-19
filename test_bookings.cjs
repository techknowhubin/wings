const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  try {
    // Create a unique test user
    const email = `test-user-${Date.now()}@xplorwing.com`;
    const password = "TestPassword123!";
    
    console.log("Signing up test user:", email);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: "Test Traveler"
        }
      }
    });

    if (signUpError) {
      console.error("SignUp Error:", signUpError);
      return;
    }

    const userId = signUpData.user?.id;
    console.log("Signed up successfully! User ID:", userId);

    // Sign in to make sure we are authenticated
    console.log("Signing in...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error("SignIn Error:", signInError);
      return;
    }

    console.log("Signed in successfully! Session user ID:", signInData.user?.id);

    // Get a valid stay ID from the database
    const { data: stays } = await supabase.from('stays').select('id, host_id').limit(1);
    if (!stays || stays.length === 0) {
      console.error("No stays found in db");
      return;
    }
    const stayId = stays[0].id;
    const hostId = stays[0].host_id || userId; // if null, fallback to ourselves

    // Now, let's try to insert a booking!
    const bookingData = {
      user_id: userId,
      listing_id: stayId,
      listing_type: "stay",
      host_id: hostId,
      start_date: "2026-06-01",
      end_date: "2026-06-05",
      total_price: 150.75,
      currency: "INR",
      payment_status: "completed",
      payment_method: "razorpay",
      booking_status: "confirmed",
      transaction_id: "pay_test123",
      guests_count: 2
    };

    console.log("Inserting booking data:", bookingData);
    const { data: insertData, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select();

    console.log("Insert response:", insertData);
    console.log("Insert error:", insertError);

  } catch (err) {
    console.error("Exception:", err);
  }
}

run();
