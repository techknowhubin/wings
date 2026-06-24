import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://uhtwkajqpuazxpnbaojx.supabase.co', 'sb_publishable_kX4YhhekZFFrnYiSO0UEwg_u4CLPOJW');

async function audit() {
  const tables = [
    'bookings', 'cab_bookings', 'package_bookings', 
    'payments', 'wallet_transactions', 'wallets',
    'profiles', 'user_roles', 
    'stays', 'cars', 'bikes', 'experiences', 'tour_packages', 'cabs',
    'hub_drivers', 'hub_partner_drivers', 'hubs'
  ];

  console.log("Table Name | Total Records | Latest Record | Used In Which Module");
  console.log("---------------------------------------------------------------");

  for (const table of tables) {
    const { count, error: countErr } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (countErr) {
      console.log(`Table: ${table} | Error: ${countErr.message}`);
      continue;
    }
    
    let latest = 'No records';
    if (count > 0) {
      const { data, error: dataErr } = await supabase.from(table).select('created_at').order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        latest = data[0].created_at;
      }
    }
    
    console.log(`${table.padEnd(20)} | ${String(count).padEnd(13)} | ${latest}`);
  }
}

audit();
