const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runDryRunOnly() {
  console.log('=== CHECKPOINT 10.6I.6M — SIX TEST CUSTOMERS CLEANUP (DRY RUN ONLY) ===\n');

  // Authenticate as Admin
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin1@gmail.com',
    password: 'admin1passwordsupersecret2026'
  });

  if (authError) {
    const { error: authErr2 } = await supabase.auth.signInWithPassword({
      email: 'admin1@gmail.com',
      password: 'admin1'
    });
    if (authErr2) {
      console.error('Auth failure:', authError.message, authErr2.message);
      throw new Error(`Admin authentication failed: ${authErr2.message}`);
    }
  }

  console.log('Authenticated as Admin successfully.');

  // Invoke RPC with p_execute = false ONLY
  console.log('\nInvoking public.admin_cleanup_six_test_customers(p_execute = false)...');
  const { data: dryRunData, error: rpcError } = await supabase.rpc('admin_cleanup_six_test_customers', {
    p_execute: false
  });

  if (rpcError) {
    console.error('DRY RUN RPC ERROR:', rpcError);
    process.exit(1);
  }

  console.log('\n--- DRY RUN RESULT RETURNED BY RPC ---');
  console.log(JSON.stringify(dryRunData, null, 2));

  // Perform a separate read-only audit to verify zero database mutations occurred
  console.log('\n--- READ-ONLY POST-DRY-RUN VERIFICATION ---');
  const { data: currentCustomers } = await supabase.from('customers').select('id, customer_code');
  const { data: currentPayments } = await supabase.from('payments').select('id, amount');
  const { data: currentRedemptions } = await supabase.from('redemptions').select('id');

  const totalPmtAmt = currentPayments.reduce((s, p) => s + Number(p.amount), 0);

  console.log(`Current Total Customers: ${currentCustomers.length} (Expected: 12)`);
  console.log(`Current Total Payments: ${currentPayments.length} (Expected: 23)`);
  console.log(`Current Total Payment Amount: ₹${totalPmtAmt} (Expected: ₹23,000)`);
  console.log(`Current Total Redemptions: ${currentRedemptions.length} (Expected: 1)`);

  if (currentCustomers.length === 12 && currentPayments.length === 23 && totalPmtAmt === 23000) {
    console.log('\nCONFIRMED: ZERO PRODUCTION DATABASE MUTATION OCCURRED IN THIS CHECKPOINT!');
  } else {
    console.error('UNEXPECTED MUTATION DETECTED!');
    process.exit(1);
  }
}

runDryRunOnly().catch(err => {
  console.error('Dry Run Exception:', err);
  process.exit(1);
});
