const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=\"?(.*?)\"?$/m)[1];
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"?(.*?)\"?$/m) || env.match(/VITE_SUPABASE_ANON_KEY=\"?(.*?)\"?$/m);
const key = keyMatch[1];
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const { data: bookings, error: err1 } = await supabase.from('bookings').select('id, listing_type, created_at, total_price');
  if (bookings) {
     const types = {};
     for (const b of bookings) {
        types[b.listing_type] = (types[b.listing_type] || 0) + 1;
     }
     console.log('Listing types in bookings:', types);
     
     // Also find outstation cab records and see their listing type
     const { data: cabs } = await supabase.from('cab_bookings').select('booking_id');
     if (cabs?.length) {
       console.log('cab_bookings count:', cabs.length);
       const cabIds = cabs.map(c => c.booking_id);
       const { data: cabBookings } = await supabase.from('bookings').select('id, listing_type').in('id', cabIds);
       console.log('Listing types for cab bookings:', cabBookings);
     }
  }
}
check();
