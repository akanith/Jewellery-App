import { createClient } from '@supabase/supabase-js';

const url = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const key = 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

const supabase = createClient(url, key);

async function main() {
  console.log('=== AUDITING AND SETTING UP TEST CUSTOMERS ===');

  // 1. Audit tables
  const tables = [
    'profiles',
    'customers',
    'scheme_plans',
    'customer_schemes',
    'installments',
    'payments',
    'redemptions',
    'notifications',
    'audit_logs',
    'shop_settings',
  ];

  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table '${table}': ${count} rows`);
      if (data && data.length > 0) {
        console.log(`  Records in ${table}:`, data.map(d => ({ id: d.id, name: d.full_name || d.name || d.title || d.shop_name })));
      }
    }
  }

  // 2. Clean up dummy customer business data if any
  console.log('\n--- CLEANING DUMMY TEST BUSINESS DATA ---');
  // Order preserving FK constraints: payments -> installments -> customer_schemes -> redemptions -> notifications -> customers
  const { error: errPay } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned payments:', errPay ? errPay.message : 'OK');

  const { error: errRed } = await supabase.from('redemptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned redemptions:', errRed ? errRed.message : 'OK');

  const { error: errInst } = await supabase.from('installments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned installments:', errInst ? errInst.message : 'OK');

  const { error: errSchemes } = await supabase.from('customer_schemes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned customer_schemes:', errSchemes ? errSchemes.message : 'OK');

  const { error: errNotif } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned notifications:', errNotif ? errNotif.message : 'OK');

  const { error: errCust } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned customers:', errCust ? errCust.message : 'OK');

  // 3. Create Customer A & Customer B via standard Customer record insertion matching CustomerService format
  console.log('\n--- CREATING CUSTOMER A & CUSTOMER B ---');
  
  const customerAData = {
    full_name: 'Test Customer One',
    mobile_number: '9876543210',
    email: 'customer1@ramyasjeweller.com',
    address: '100 Gold Street',
    city: 'Dindigul',
    pincode: '624001',
    status: 'ACTIVE'
  };

  const customerBData = {
    full_name: 'Test Customer Two',
    mobile_number: '9876543211',
    email: 'customer2@ramyasjeweller.com',
    address: '200 Silver Street',
    city: 'Dindigul',
    pincode: '624001',
    status: 'ACTIVE'
  };

  const { data: custA, error: errA } = await supabase.from('customers').insert(customerAData).select('*').single();
  if (errA) {
    console.error('Failed to create Customer A:', errA);
  } else {
    console.log('SUCCESS: Created Customer A:', custA);
  }

  const { data: custB, error: errB } = await supabase.from('customers').insert(customerBData).select('*').single();
  if (errB) {
    console.error('Failed to create Customer B:', errB);
  } else {
    console.log('SUCCESS: Created Customer B:', custB);
  }

  // Verify unique mobile constraint by attempting duplicate mobile insert
  console.log('\n--- VERIFYING MOBILE UNIQUE CONSTRAINT ---');
  const { error: errDup } = await supabase.from('customers').insert({
    full_name: 'Duplicate Test',
    mobile_number: '9876543210', // Duplicate mobile
  });
  if (errDup) {
    console.log('PASS: Unique mobile constraint properly rejected duplicate mobile number:', errDup.message);
  } else {
    console.error('FAIL: Unique mobile constraint failed to block duplicate mobile!');
  }
}

main();
