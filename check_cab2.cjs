const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=\"?(.*?)\"?$/m)[1];
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"?(.*?)\"?$/m) || env.match(/VITE_SUPABASE_ANON_KEY=\"?(.*?)\"?$/m);
const key = keyMatch[1];
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('cab_bookings').select('*').limit(1);
  if (data && data.length) console.log(Object.keys(data[0]));
  console.log(JSON.stringify(data, null, 2));
}
check();
