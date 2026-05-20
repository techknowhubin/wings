import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uhtwkajqpuazxpnbaojx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodHdrYWpxcHVhenhwbmJhb2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzY1NTcsImV4cCI6MjA3NzI1MjU1N30.RPdeJk13uqnFssQXUyA0acsf53xgceR-59VLzoB7Wfg";

async function run() {
  console.log("=== STARTING SANDBOX INTEGRATION TEST ===");
  const testPhone = `+91000${Math.floor(1000000 + Math.random() * 9000000)}`;
  console.log("Using test phone number:", testPhone);

  // 1. Request OTP
  console.log("\n1. Requesting OTP via send-whatsapp-otp Edge Function...");
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify({ action: 'send', phone: testPhone })
  });

  const sendData = await sendRes.json();
  console.log("Send OTP Response:", sendData);
  if (!sendRes.ok) {
    console.error("Failed to request OTP:", sendData);
    return;
  }

  // 2. Verify OTP
  console.log("\n2. Verifying OTP via send-whatsapp-otp Edge Function...");
  const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify({ action: 'verify', phone: testPhone, otp: '123456' })
  });

  const verifyData = await verifyRes.json();
  console.log("Verify OTP Response:", verifyData);
  if (!verifyRes.ok) {
    console.error("Failed to verify OTP:", verifyData);
    return;
  }

  const { hashed_token, token_type } = verifyData;
  console.log("Hashed Token:", hashed_token);
  console.log("Token Type:", token_type);

  // 3. Log in Traveler via Supabase Auth client using token_hash
  console.log("\n3. Authenticating session with Supabase...");
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false }
  });

  const { data: authData, error: authError } = await userSupabase.auth.verifyOtp({
    token_hash: hashed_token,
    type: token_type
  });

  if (authError || !authData.session) {
    console.error("Supabase Auth verification failed:", authError);
    return;
  }

  const user = authData.user;
  const session = authData.session;
  console.log("Authenticated successfully! User ID:", user.id);
  console.log("Session access token retrieved.");

  // Re-initialize Supabase client with the user's active session token
  const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  });

  // 4. Create pending booking
  console.log("\n4. Inserting pending booking as authenticated user (bypassing RLS restriction)...");
  const bookingData = {
    user_id: user.id,
    listing_id: 'd371abb0-3102-461c-822a-03fac35aada2', // Manali Nast Stay
    listing_type: "stay",
    host_id: 'eb4e7434-b227-40cc-be96-6602448568e2',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days later
    total_price: 3200.00,
    currency: "INR",
    payment_status: "pending",
    payment_method: "razorpay",
    booking_status: "pending",
    guests_count: 2
  };

  const { data: newBooking, error: bookingError } = await authenticatedClient
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (bookingError || !newBooking) {
    console.error("Failed to insert booking:", bookingError);
    return;
  }

  console.log("Successfully created pending booking! Booking ID:", newBooking.id);
  console.log("Initial payment_status:", newBooking.payment_status);
  console.log("Initial booking_status:", newBooking.booking_status);

  // 5. Call verify-razorpay-payment edge function with mock parameters
  console.log("\n5. Invoking verify-razorpay-payment with sandbox mock parameters...");
  const paymentVerificationRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      razorpay_payment_id: 'pay_mock_integration_test_' + Math.random().toString(36).substring(2, 9),
      razorpay_order_id: 'order_mock_integration_test_' + Math.random().toString(36).substring(2, 9),
      razorpay_signature: 'sig_mock_integration_test_' + Math.random().toString(36).substring(2, 9),
      booking_id: newBooking.id
    })
  });

  const verificationResult = await paymentVerificationRes.json();
  console.log("Payment Verification Response:", verificationResult);
  if (!paymentVerificationRes.ok) {
    console.error("Payment Verification Failed:", verificationResult);
    return;
  }

  // 6. Read updated booking status
  console.log("\n6. Retrieving final booking status from database...");
  const { data: updatedBooking, error: fetchError } = await authenticatedClient
    .from('bookings')
    .select('*')
    .eq('id', newBooking.id)
    .single();

  if (fetchError || !updatedBooking) {
    console.error("Failed to retrieve updated booking:", fetchError);
    return;
  }

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log("Booking ID:", updatedBooking.id);
  console.log("Expected Payment Status: 'completed' | Actual:", updatedBooking.payment_status);
  console.log("Expected Booking Status: 'completed' | Actual:", updatedBooking.booking_status);
  console.log("Transaction ID:", updatedBooking.transaction_id);

  if (updatedBooking.payment_status === 'completed' && updatedBooking.booking_status === 'completed') {
    console.log("\n🎉 SUCCESS: The integration test passed! Sandbox payment bypass worked perfectly, and statuses transitioned correctly.");
  } else {
    console.error("\n❌ FAILURE: Statuses did not update as expected.");
  }
}

run().catch(console.error);
