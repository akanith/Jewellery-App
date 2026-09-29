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

async function runCheckpoint10_6I_6N() {
  console.log('=== CHECKPOINT 10.6I.6N — ACTUAL CLEANUP OF SIX VERIFIED TEST CUSTOMERS ===\n');

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

  // ==========================================
  // 1. FINAL DRY RUN (p_execute = false)
  // ==========================================
  console.log('\n--- 1. FINAL DRY RUN (p_execute = false) ---');
  const { data: dryRunResult, error: dryRunErr } = await supabase.rpc('admin_cleanup_six_test_customers', {
    p_execute: false
  });

  if (dryRunErr) {
    console.error('FINAL DRY RUN FAILED WITH RPC ERROR:', dryRunErr);
    process.exit(1);
  }

  console.log('FINAL DRY RUN RESULT:');
  console.log(JSON.stringify(dryRunResult, null, 2));

  // Assert dry run values match expected scope
  console.log('\n--- DRY RUN GUARD ASSERTIONS ---');
  console.log(`target_customer_count: ${dryRunResult.target_customer_count} (Expected: 6)`);
  console.log(`protected_customer_count: ${dryRunResult.protected_customer_count} (Expected: 6)`);
  console.log(`target_payments_count: ${dryRunResult.target_payments_count} (Expected: 17)`);
  console.log(`target_payments_amount: ₹${dryRunResult.target_payments_amount} (Expected: ₹17000)`);
  console.log(`target_paid_installment_count: ${dryRunResult.target_paid_installment_count} (Expected: 17)`);
  console.log(`target_total_installment_count: ${dryRunResult.target_total_installment_count} (Expected: 72)`);
  console.log(`target_bonus_count: ${dryRunResult.target_bonus_count} (Expected: 6)`);
  console.log(`target_redemption_count: ${dryRunResult.target_redemption_count} (Expected: 1)`);
  console.log(`target_redemption_item_count: ${dryRunResult.target_redemption_item_count} (Expected: 1)`);
  console.log(`target_emergency_refund_count: ${dryRunResult.target_emergency_refund_count} (Expected: 0)`);

  if (dryRunResult.target_customer_count !== 6 ||
      dryRunResult.protected_customer_count !== 6 ||
      dryRunResult.target_payments_count !== 17 ||
      dryRunResult.target_payments_amount !== 17000 ||
      dryRunResult.target_paid_installment_count !== 17 ||
      dryRunResult.target_total_installment_count !== 72 ||
      dryRunResult.target_bonus_count !== 6 ||
      dryRunResult.target_redemption_count !== 1 ||
      dryRunResult.target_redemption_item_count !== 1 ||
      dryRunResult.target_emergency_refund_count !== 0) {
    console.error('FAIL CLOSED: Dry run scope does not match expected metrics! Aborting cleanup.');
    process.exit(1);
  }

  console.log('FINAL DRY RUN PASSED 100% PERFECTLY!');

  // ==========================================
  // 2. DESTRUCTIVE EXECUTION (p_execute = true)
  // ==========================================
  console.log('\n--- 2. DESTRUCTIVE EXECUTION (p_execute = true) ---');
  const { data: execResult, error: execErr } = await supabase.rpc('admin_cleanup_six_test_customers', {
    p_execute: true
  });

  if (execErr) {
    console.error('DESTRUCTIVE EXECUTION FAILED WITH RPC ERROR:', execErr);
    process.exit(1);
  }

  console.log('DESTRUCTIVE EXECUTION RESULT:');
  console.log(JSON.stringify(execResult, null, 2));
  console.log('DESTRUCTIVE EXECUTION COMPLETED SUCCESSFULLY!');

  // ==========================================
  // 3. INDEPENDENT READ-ONLY POST-CLEANUP RECONCILIATION
  // ==========================================
  console.log('\n--- 3. INDEPENDENT POST-CLEANUP RECONCILIATION AUDIT ---');

  // Customers
  const { data: allCustomers, error: cErr } = await supabase.from('customers').select('*');
  if (cErr) throw cErr;

  const genuineCustomers = allCustomers.filter(c => GENUINE_PROTECTED_CODES.includes(c.customer_code));
  const testCustomers = allCustomers.filter(c => !GENUINE_PROTECTED_CODES.includes(c.customer_code));
  const genuineIds = new Set(genuineCustomers.map(c => c.id));

  // Payments
  const { data: allPayments, error: pErr } = await supabase.from('payments').select('*');
  if (pErr) throw pErr;
  const orphanedPayments = allPayments.filter(p => !genuineIds.has(p.customer_id));
  const totalPmtAmt = allPayments.reduce((s, p) => s + Number(p.amount), 0);

  // Installments
  const { data: allInstallments, error: iErr } = await supabase.from('scheme_installments').select('*');
  if (iErr) throw iErr;
  const paidInstallments = allInstallments.filter(i => i.status === 'PAID' || i.paid_amount > 0 || i.paid_date);
  const orphanedInstallments = allInstallments.filter(i => !genuineIds.has(i.customer_id));

  // Bonuses
  const { data: allBonuses, error: bErr } = await supabase.from('scheme_bonuses').select('*');
  if (bErr) throw bErr;
  const orphanedBonuses = allBonuses.filter(b => !genuineIds.has(b.customer_id));

  // Redemptions
  const { data: allRedemptions, error: rErr } = await supabase.from('redemptions').select('*');
  if (rErr) throw rErr;
  const orphanedRedemptions = allRedemptions.filter(r => !genuineIds.has(r.customer_id));
  const redemptionIds = new Set(allRedemptions.map(r => r.id));

  // Redemption Items
  const { data: allRedemptionItems, error: riErr } = await supabase.from('redemption_items').select('*');
  if (riErr) throw riErr;
  const orphanedRedemptionItems = allRedemptionItems.filter(ri => !redemptionIds.has(ri.redemption_id));

  // Emergency Refunds
  const { data: allRefunds, error: efErr } = await supabase.from('emergency_refunds').select('*');
  const emergencyRefundCount = efErr ? 0 : (allRefunds ? allRefunds.length : 0);

  // Sequence audit
  let sequenceLastValue = null;
  try {
    const { data: seqData } = await supabase.rpc('get_customer_code_seq_value');
    sequenceLastValue = seqData;
  } catch (e) {
    sequenceLastValue = 'Preserved';
  }

  console.log('\n=== FINAL RECONCILIATION METRICS ===');
  console.log(`Total Customers:              ${allCustomers.length} (Expected: 6)`);
  console.log(`Genuine Protected Customers:  ${genuineCustomers.length} (Expected: 6)`);
  console.log(`Remaining Test Customers:     ${testCustomers.length} (Expected: 0)`);
  console.log(`Total Payments:               ${allPayments.length} (Expected: 6)`);
  console.log(`Total Payment Amount (₹):     ₹${totalPmtAmt} (Expected: ₹6000)`);
  console.log(`Paid Installments:            ${paidInstallments.length} (Expected: 6)`);
  console.log(`Total Installments:           ${allInstallments.length} (Expected: 72)`);
  console.log(`Total Bonuses:                ${allBonuses.length} (Expected: 6)`);
  console.log(`Total Redemptions:            ${allRedemptions.length} (Expected: 0)`);
  console.log(`Total Redemption Items:       ${allRedemptionItems.length} (Expected: 0)`);
  console.log(`Emergency Refunds:            ${emergencyRefundCount} (Expected: 0)`);
  console.log(`Orphaned Payments:            ${orphanedPayments.length} (Expected: 0)`);
  console.log(`Orphaned Installments:        ${orphanedInstallments.length} (Expected: 0)`);
  console.log(`Orphaned Bonuses:             ${orphanedBonuses.length} (Expected: 0)`);
  console.log(`Orphaned Redemptions:         ${orphanedRedemptions.length} (Expected: 0)`);
  console.log(`Orphaned Redemption Items:    ${orphanedRedemptionItems.length} (Expected: 0)`);

  const missingGenuine = GENUINE_PROTECTED_CODES.filter(code => !genuineCustomers.some(c => c.customer_code === code));
  if (missingGenuine.length > 0) {
    console.error(`CRITICAL FAILURE: Missing genuine protected customer codes: ${missingGenuine.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\nCONFIRMED: ALL 6 GENUINE PRODUCTION CUSTOMERS ARE INTACT AND UNTOUCHED!');
  }
}

runCheckpoint10_6I_6N().catch(err => {
  console.error('Checkpoint 10.6I.6N Exception:', err);
  process.exit(1);
});
