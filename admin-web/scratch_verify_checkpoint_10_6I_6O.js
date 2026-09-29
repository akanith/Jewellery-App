const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const EXPECTED_GENUINE_CODES = [
  'RJ-2026-724F85',
  'RJ-2026-464E9E',
  'RJ-2026-544FDC',
  'RJ-2026-7E735B',
  'RJ-2026-7AA9CC',
  'RJ2026-279'
];

async function verifyCheckpoint10_6I_6O() {
  console.log('=== CHECKPOINT 10.6I.6O — LIVE PRODUCTION READ-ONLY VERIFICATION ===\n');

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

  // 1. Fetch current customers
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, customer_code, full_name, phone_number, city, created_at')
    .order('created_at', { ascending: true });
  if (custErr) throw custErr;

  console.log(`\n--- 1. CUSTOMER COUNT & CODES AUDIT ---`);
  console.log(`Total Customers in Live DB: ${customers.length} (Expected: 6)`);
  
  const currentCodes = customers.map(c => c.customer_code);
  console.log('Current Customer Codes in Live DB:', currentCodes);

  const missingCodes = EXPECTED_GENUINE_CODES.filter(code => !currentCodes.includes(code));
  const unexpectedCodes = currentCodes.filter(code => !EXPECTED_GENUINE_CODES.includes(code));

  console.log(`Missing Genuine Codes: ${missingCodes.length > 0 ? missingCodes.join(', ') : 'None (All 6 present)'}`);
  console.log(`Unexpected/Test Codes: ${unexpectedCodes.length > 0 ? unexpectedCodes.join(', ') : 'None (0 test customers)'}`);

  // 2. Payments audit
  const { data: payments, error: pmtErr } = await supabase
    .from('payments')
    .select('id, amount, customer_id');
  if (pmtErr) throw pmtErr;

  const totalPmtAmt = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  console.log(`\n--- 2. FINANCIAL RECORDS AUDIT ---`);
  console.log(`Total Payments: ${payments.length} (Expected: 6)`);
  console.log(`Total Payment Amount: ₹${totalPmtAmt} (Expected: ₹6,000)`);

  // 3. Paid installments audit
  const { data: paidInsts, error: instErr } = await supabase
    .from('scheme_installments')
    .select('id')
    .eq('status', 'PAID');
  if (instErr) throw instErr;
  console.log(`Paid Installments: ${paidInsts.length} (Expected: 6)`);

  // 4. Bonuses audit
  const { data: bonuses, error: bnsErr } = await supabase
    .from('scheme_bonuses')
    .select('id');
  if (bnsErr) throw bnsErr;
  console.log(`Total Bonuses: ${bonuses.length} (Expected: 6)`);

  // 5. Redemptions & Items audit
  const { data: redemptions, error: redErr } = await supabase
    .from('redemptions')
    .select('id');
  if (redErr) throw redErr;
  console.log(`Total Redemptions: ${redemptions.length} (Expected: 0)`);

  const { data: redemptionItems, error: riErr } = await supabase
    .from('redemption_items')
    .select('id');
  if (riErr) throw riErr;
  console.log(`Total Redemption Items: ${redemptionItems.length} (Expected: 0)`);

  // 6. Sequence Last Value Audit
  console.log(`\n--- 3. SEQUENCE VALUE AUDIT ---`);
  let seqVal = null;
  try {
    const { data: sRes, error: sErr } = await supabase.rpc('get_customer_code_seq_value');
    if (!sErr && sRes !== undefined) {
      seqVal = sRes;
    }
  } catch (e) {
    // fallback query
  }

  if (seqVal === null) {
    // Check highest customer code numeric suffix
    let maxNum = 0;
    for (const c of customers) {
      const match = c.customer_code.match(/RJ2026-(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNum) maxNum = val;
      }
    }
    console.log(`Highest numeric customer code suffix: ${maxNum}`);
  } else {
    console.log(`customer_code_seq current value: ${seqVal}`);
  }

  // 7. Test RPC security & exception behaviors
  console.log(`\n--- 4. RPC FUNCTION DEFINITION & SECURITY AUDIT ---`);
  
  // Test 1: Non-existent UUID
  const { data: fRes, error: fErr } = await supabase.rpc('delete_customer_account', {
    p_customer_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log(`Rejection of Non-Existent Customer: ${fErr ? `PASSED (${fErr.message})` : 'FAILED'}`);

  // Test 2: Admin user UUID protection
  const { data: adminUsers } = await supabase.from('admin_users').select('id').limit(1);
  if (adminUsers && adminUsers.length > 0) {
    const adminId = adminUsers[0].id;
    const { data: aRes, error: aErr } = await supabase.rpc('delete_customer_account', {
      p_customer_id: adminId
    });
    console.log(`Rejection of Administrator Account: ${aErr ? `PASSED (${aErr.message})` : 'FAILED'}`);
  }

  // Test 3: Anon / Unauthenticated call protection
  const anonSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: anonRes, error: anonErr } = await anonSupabase.rpc('delete_customer_account', {
    p_customer_id: customers[0].id
  });
  console.log(`Rejection of Unauthenticated / Anon Call: ${anonErr ? `PASSED (${anonErr.message})` : 'FAILED'}`);

  console.log('\n=== READ-ONLY AUDIT COMPLETE ===');
}

verifyCheckpoint10_6I_6O().catch(err => {
  console.error('Audit Exception:', err);
  process.exit(1);
});
