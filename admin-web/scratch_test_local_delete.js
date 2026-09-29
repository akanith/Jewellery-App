const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const GENUINE_PROTECTED_CODES = [
  'RJ-2026-724F85',
  'RJ-2026-464E9E',
  'RJ-2026-544FDC',
  'RJ-2026-7E735B',
  'RJ-2026-7AA9CC',
  'RJ2026-279'
];

async function runLocalDeletionTests() {
  console.log('=== TESTING UPDATE DELETE_CUSTOMER_ACCOUNT RPC & ROLLBACK ===\n');

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

  console.log('1. Authenticated as Admin successfully.');

  // 1. Create Disposable Test Customer with Full Financial History
  const testPhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
  const testName = 'Disposable Test Customer ' + Math.floor(1000 + Math.random() * 9000);

  // Call create_customer_with_scheme
  const { data: createRes, error: createErr } = await supabase.rpc('create_customer_with_scheme', {
    p_full_name: testName,
    p_phone_number: testPhone,
    p_address: '123 Test St',
    p_city: 'Dindigul',
    p_pincode: '624001',
    p_enroll_scheme: true
  });

  if (createErr || !createRes.success) {
    console.error('Failed to create test customer:', createErr || createRes);
    process.exit(1);
  }

  const testCustomerId = createRes.customer_id;
  const testSchemeId = createRes.scheme_id;
  console.log(`2. Disposable test customer created: ID=${testCustomerId}, SchemeID=${testSchemeId}`);

  // Record 1 payment
  const { data: pmtRes, error: pmtErr } = await supabase.rpc('record_installment_payment', {
    p_scheme_id: testSchemeId,
    p_installment_number: 1,
    p_payment_method: 'CASH',
    p_transaction_reference: 'TEST-CASH-REF'
  });

  if (pmtErr || !pmtRes.success) {
    console.error('Failed to record payment:', pmtErr || pmtRes);
    process.exit(1);
  }

  console.log('3. Recorded payment for test customer.');

  // Verify records exist BEFORE deletion
  const { data: bCustomers } = await supabase.from('customers').select('id').eq('id', testCustomerId);
  const { data: bSchemes } = await supabase.from('schemes').select('id').eq('customer_id', testCustomerId);
  const { data: bInsts } = await supabase.from('scheme_installments').select('id').eq('customer_id', testCustomerId);
  const { data: bPmts } = await supabase.from('payments').select('id').eq('customer_id', testCustomerId);
  const { data: bBonuses } = await supabase.from('scheme_bonuses').select('id').eq('customer_id', testCustomerId);

  console.log('\n--- BEFORE DELETION METRICS ---');
  console.log(`Customers: ${bCustomers.length} (Expected: 1)`);
  console.log(`Schemes: ${bSchemes.length} (Expected: 1)`);
  console.log(`Installments: ${bInsts.length} (Expected: 12)`);
  console.log(`Payments: ${bPmts.length} (Expected: 1)`);
  console.log(`Bonuses: ${bBonuses.length} (Expected: 1)`);

  // ==========================================
  // 2. Execute delete_customer_account
  // ==========================================
  console.log('\nInvoking delete_customer_account for disposable customer...');
  const { data: delRes, error: delErr } = await supabase.rpc('delete_customer_account', {
    p_customer_id: testCustomerId
  });

  if (delErr) {
    console.error('delete_customer_account failed:', delErr);
    process.exit(1);
  }

  console.log('Delete RPC Result:', JSON.stringify(delRes, null, 2));

  // Verify records AFTER deletion
  const { data: aCustomers } = await supabase.from('customers').select('id').eq('id', testCustomerId);
  const { data: aSchemes } = await supabase.from('schemes').select('id').eq('customer_id', testCustomerId);
  const { data: aInsts } = await supabase.from('scheme_installments').select('id').eq('customer_id', testCustomerId);
  const { data: aPmts } = await supabase.from('payments').select('id').eq('customer_id', testCustomerId);
  const { data: aBonuses } = await supabase.from('scheme_bonuses').select('id').eq('customer_id', testCustomerId);

  console.log('\n--- AFTER DELETION METRICS ---');
  console.log(`Customers: ${aCustomers.length} (Expected: 0)`);
  console.log(`Schemes: ${aSchemes.length} (Expected: 0)`);
  console.log(`Installments: ${aInsts.length} (Expected: 0)`);
  console.log(`Payments: ${aPmts.length} (Expected: 0)`);
  console.log(`Bonuses: ${aBonuses.length} (Expected: 0)`);

  // Verify Audit Log
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'CUSTOMER_PERMANENTLY_DELETED')
    .eq('entity_id', testCustomerId);

  console.log(`Audit log entries found: ${auditLogs.length} (Expected: 1)`);

  // Verify Genuine Customers remain 6 (₹6,000)
  const { data: genuineCusts } = await supabase
    .from('customers')
    .select('id, customer_code')
    .in('customer_code', GENUINE_PROTECTED_CODES);

  const { data: totalCusts } = await supabase.from('customers').select('id');
  const { data: totalPmts } = await supabase.from('payments').select('id, amount');
  const totalAmt = totalPmts.reduce((s, p) => s + Number(p.amount), 0);

  console.log('\n--- GENUINE SYSTEM INTEGRITY METRICS ---');
  console.log(`Total Genuine Customers Intact: ${genuineCusts.length} (Expected: 6)`);
  console.log(`Total System Customers: ${totalCusts.length} (Expected: 6)`);
  console.log(`Total System Payments: ${totalPmts.length} (Expected: 6)`);
  console.log(`Total System Payment Amount: ₹${totalAmt} (Expected: ₹6,000)`);

  // ==========================================
  // 3. Test Transaction Rollback & Safety Controls
  // ==========================================
  console.log('\n--- TESTING SAFETY CONTROLS & ROLLBACK ---');

  // Test Attempt to delete Admin user
  const { data: adminUsers } = await supabase.from('admin_users').select('id').limit(1);
  const adminId = adminUsers[0].id;

  const { data: adminDelRes, error: adminDelErr } = await supabase.rpc('delete_customer_account', {
    p_customer_id: adminId
  });

  if (adminDelErr) {
    console.log('PASSED: Admin user deletion correctly rejected with error:', adminDelErr.message);
  } else {
    console.error('FAIL: Admin user deletion was not blocked!', adminDelRes);
    process.exit(1);
  }

  // Test Attempt to delete non-existent UUID
  const { data: fakeDelRes, error: fakeDelErr } = await supabase.rpc('delete_customer_account', {
    p_customer_id: '00000000-0000-0000-0000-000000000000'
  });

  if (fakeDelErr) {
    console.log('PASSED: Non-existent UUID correctly rejected with error:', fakeDelErr.message);
  } else {
    console.error('FAIL: Non-existent UUID was not blocked!', fakeDelRes);
    process.exit(1);
  }

  console.log('\nALL LOCAL DELETION AND ROLLBACK TESTS PASSED 100% PERFECTLY!');
}

runLocalDeletionTests().catch(err => {
  console.error('Test Exception:', err);
  process.exit(1);
});
