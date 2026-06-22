const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.*?)"/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1].trim();
const supabase = createClient(url, key);
supabase.from('gst_settings').select('*').then(res => console.log(JSON.stringify(res.data, null, 2))).catch(console.error);
