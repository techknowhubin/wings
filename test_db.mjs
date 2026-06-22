import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.split('\n').find(l=>l.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim().replace(/"/g, '');
const key = env.split('\n').find(l=>l.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY')).split('=')[1].trim().replace(/"/g, '');

async function check() {
  const res = await fetch(`${url}/rest/v1/cab_bookings?select=booking_id,created_at,travel_date,assigned_hub_uuid,hub_partner_id,traveller_id,pickup_location,drop_location,booking_source,fare_amount,payment_status,booking_status,pickup_latitude,pickup_longitude&order=created_at.desc&limit=2`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
