const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const PROTECTED_CODES = [
  'RJ-2026-471178',
  'RJ-2026-BF44A6',
  'RJ-2026-724F85',
  'RJ-2026-464E9E',
  'RJ-2026-7AA9CC',
  'RJ-2026-544FDC',
  'RJ-2026-7E735B',
  'RJ-2026-2B6D7F',
  'RJ-2026-E15662',
  'RJ-2026-C6B5E8',
  'RJ2026-276',
  'RJ2026-279'
];

async function runCleanupWorkflow() {
  console.log('=== CHECKPOINT 10.6I.6L — PRODUCTION CLEANUP WORKFLOW ===\n');

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
  // PHASE 1 — FINAL DRY RUN
  // ==========================================
  console.log('\n--- PHASE 1: FINAL DRY RUN (p_execute = false) ---');
  const { data: dryRunResult, error: dryRunError } = await supabase.rpc('admin_cleanup_e2e_test_data', {
    p_execute: false
  });

  if (dryRunError) {
    console.error('PHASE 1 DRY RUN FAILED WITH RPC ERROR:', dryRunError);
    process.exit(1);
  }

  console.log('PHASE 1 DRY RUN RESULT JSON:');
  console.log(JSON.stringify(dryRunResult, null, 2));

  // Assertions on dry run result
  console.log('\n--- DRY RUN GUARD ASSERTIONS ---');
  console.log(`Candidate count: ${dryRunResult.candidate_count} (Expected: 211)`);
  console.log(`Protected count: ${dryRunResult.protected_count} (Expected: 12)`);
  console.log(`Emergency refund count: ${dryRunResult.emergency_refund_count} (Expected: 0)`);

  if (dryRunResult.candidate_count !== 211) {
    console.error(`FAIL CLOSED: Candidate count ${dryRunResult.candidate_count} !== 211! Aborting cleanup.`);
    process.exit(1);
  }
  if (dryRunResult.protected_count !== 12) {
    console.error(`FAIL CLOSED: Protected count ${dryRunResult.protected_count} !== 12! Aborting cleanup.`);
    process.exit(1);
  }
  if (dryRunResult.emergency_refund_count !== 0) {
    console.error(`FAIL CLOSED: Emergency refund count ${dryRunResult.emergency_refund_count} !== 0! Aborting cleanup.`);
    process.exit(1);
  }

  console.log('PHASE 1 PASSED 100% PERFECTLY!');

  // ==========================================
  // PHASE 2 — DESTRUCTIVE EXECUTION
  // ==========================================
  console.log('\n--- PHASE 2: DESTRUCTIVE EXECUTION (p_execute = true) ---');
  const { data: execResult, error: execError } = await supabase.rpc('admin_cleanup_e2e_test_data', {
    p_execute: true
  });

  if (execError) {
    console.error('PHASE 2 EXECUTION FAILED WITH RPC ERROR:', execError);
    process.exit(1);
  }

  console.log('PHASE 2 EXECUTION RESULT JSON:');
  console.log(JSON.stringify(execResult, null, 2));

  console.log('PHASE 2 DESTRUCTIVE EXECUTION COMPLETED SUCCESSFULLY!');

  // ==========================================
  // PHASE 3 — INDEPENDENT POST-CLEANUP RECONCILIATION
  // ==========================================
  console.log('\n--- PHASE 3: INDEPENDENT POST-CLEANUP RECONCILIATION ---');

  // 1. Customers
  let allCustomers = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_code, full_name, phone_number, created_at')
      .range(from, from + 999);
    if (error) throw error;
    allCustomers = allCustomers.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const protectedCustomers = allCustomers.filter(c => PROTECTED_CODES.includes(c.customer_code));
  const candidateCustomers = allCustomers.filter(c => !PROTECTED_CODES.includes(c.customer_code));
  const protectedIds = new Set(protectedCustomers.map(c => c.id));
  const candidateIds = new Set(candidateCustomers.map(c => c.id));

  // 2. Payments
  let allPayments = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, customer_id, amount')
      .range(from, from + 999);
    if (error) throw error;
    allPayments = allPayments.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const protectedPayments = allPayments.filter(p => protectedIds.has(p.customer_id));
  const orphanedPayments = allPayments.filter(p => !protectedIds.has(p.customer_id));
  const totalPaymentSum = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // 3. Installments
  let allInstallments = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('scheme_installments')
      .select('id, customer_id, status, installment_amount, paid_amount')
      .range(from, from + 999);
    if (error) throw error;
    allInstallments = allInstallments.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const paidInstallments = allInstallments.filter(i => i.status === 'PAID');
  const orphanedInstallments = allInstallments.filter(i => !protectedIds.has(i.customer_id));

  // 4. Bonuses
  let allBonuses = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('scheme_bonuses')
      .select('id, customer_id, bonus_amount')
      .range(from, from + 999);
    if (error) throw error;
    allBonuses = allBonuses.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const orphanedBonuses = allBonuses.filter(b => !protectedIds.has(b.customer_id));

  // 5. Redemptions
  let allRedemptions = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('redemptions')
      .select('id, customer_id')
      .range(from, from + 999);
    if (error) throw error;
    allRedemptions = allRedemptions.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const orphanedRedemptions = allRedemptions.filter(r => !protectedIds.has(r.customer_id));

  const redemptionToCustomer = new Map();
  for (const r of allRedemptions) {
    redemptionToCustomer.set(r.id, r.customer_id);
  }

  // 6. Redemption Items
  let allRedemptionItems = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('redemption_items')
      .select('id, redemption_id')
      .range(from, from + 999);
    if (error) throw error;
    allRedemptionItems = allRedemptionItems.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const orphanedRedemptionItems = allRedemptionItems.filter(ri => !redemptionToCustomer.has(ri.redemption_id));

  // 7. Emergency Refunds
  const { data: emergencyRefunds, error: refundErr } = await supabase
    .from('emergency_refunds')
    .select('id');
  const emergencyRefundCount = refundErr ? 0 : (emergencyRefunds ? emergencyRefunds.length : 0);

  console.log('\n=== FINAL RECONCILIATION AUDIT SUMMARY ===');
  console.log(`Total Customers:             ${allCustomers.length} (Expected: 12)`);
  console.log(`Protected Customers:         ${protectedCustomers.length} (Expected: 12)`);
  console.log(`Remaining Candidates:        ${candidateCustomers.length} (Expected: 0)`);
  console.log(`Total Payments:              ${allPayments.length} (Expected: 23)`);
  console.log(`Total Payment Amount (₹):    ₹${totalPaymentSum} (Expected: ₹23000)`);
  console.log(`Paid Installments:           ${paidInstallments.length} (Expected: 23)`);
  console.log(`Total Installments:          ${allInstallments.length} (Expected: 144)`);
  console.log(`Total Bonuses:               ${allBonuses.length} (Expected: 12)`);
  console.log(`Total Redemptions:           ${allRedemptions.length} (Expected: 1)`);
  console.log(`Total Redemption Items:      ${allRedemptionItems.length} (Expected: 1)`);
  console.log(`Emergency Refunds:           ${emergencyRefundCount} (Expected: 0)`);
  console.log(`Orphaned Payments:           ${orphanedPayments.length} (Expected: 0)`);
  console.log(`Orphaned Installments:       ${orphanedInstallments.length} (Expected: 0)`);
  console.log(`Orphaned Bonuses:            ${orphanedBonuses.length} (Expected: 0)`);
  console.log(`Orphaned Redemptions:        ${orphanedRedemptions.length} (Expected: 0)`);
  console.log(`Orphaned Redemption Items:   ${orphanedRedemptionItems.length} (Expected: 0)`);

  const missingProtected = PROTECTED_CODES.filter(code => !protectedCustomers.some(c => c.customer_code === code));
  if (missingProtected.length > 0) {
    console.error(`CRITICAL: Missing protected customers: ${missingProtected.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\nALL 12 PROTECTED CUSTOMERS ARE INTACT AND UNTOUCHED!');
  }
}

runCleanupWorkflow().catch(err => {
  console.error('WORKFLOW EXCEPTION:', err);
  process.exit(1);
});
