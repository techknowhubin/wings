const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=\"?(.*?)\"?$/m)[1];
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"?(.*?)\"?$/m) || env.match(/VITE_SUPABASE_ANON_KEY=\"?(.*?)\"?$/m);
const key = keyMatch[1];
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function fix() {
  console.log("Fetching cab bookings...");
  const { data: cabs, error: err1 } = await supabase.from('cab_bookings').select('booking_id, booking_source');
  if (err1 || !cabs) return console.error('Error fetching cab_bookings', err1);
  
  let count = 0;
  for (const cab of cabs) {
    if (cab.booking_id) {
      const type = cab.booking_source === 'outstation_cab' ? 'outstation' : 'cab';
      const { error } = await supabase.from('bookings').update({ listing_type: type }).eq('id', cab.booking_id);
      if (!error) count++;
      else console.error(error);
    }
  }
  console.log('Fixed', count, 'bookings out of', cabs.length, 'cab bookings.');
}
fix();
