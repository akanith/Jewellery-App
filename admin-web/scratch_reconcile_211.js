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

const NEW_9_CODES = [
  'RJ2026-760',
  'RJ2026-747',
  'RJ2026-745',
  'RJ2026-744',
  'RJ2026-731',
  'RJ2026-729',
  'RJ2026-728',
  'RJ2026-715',
  'RJ2026-713'
];

async function reconcile() {
  console.log('=== STARTING RECONCILIATION AUDIT ===');

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

  // 1. Fetch all customers
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

  console.log(`Total customers: ${allCustomers.length}`);

  const protectedCustomers = allCustomers.filter(c => PROTECTED_CODES.includes(c.customer_code));
  const candidateCustomers = allCustomers.filter(c => !PROTECTED_CODES.includes(c.customer_code));

  console.log(`Protected customers count: ${protectedCustomers.length}`);
  console.log(`Candidate customers count: ${candidateCustomers.length}`);

  const protectedIds = new Set(protectedCustomers.map(c => c.id));
  const candidateIds = new Set(candidateCustomers.map(c => c.id));

  // Verify protected codes match exactly
  const foundProtectedCodes = protectedCustomers.map(c => c.customer_code);
  const missingProtected = PROTECTED_CODES.filter(c => !foundProtectedCodes.includes(c));
  console.log(`Missing protected codes: ${missingProtected.length > 0 ? missingProtected.join(', ') : 'None'}`);

  // 2. Fetch all payments
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
  const candidatePayments = allPayments.filter(p => candidateIds.has(p.customer_id));
  const orphanedPayments = allPayments.filter(p => !protectedIds.has(p.customer_id) && !candidateIds.has(p.customer_id));

  const protectedPaymentSum = protectedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const candidatePaymentSum = candidatePayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaymentSum = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // 3. Fetch all installments
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

  const protectedInstallments = allInstallments.filter(i => protectedIds.has(i.customer_id));
  const candidateInstallments = allInstallments.filter(i => candidateIds.has(i.customer_id));
  const orphanedInstallments = allInstallments.filter(i => !protectedIds.has(i.customer_id) && !candidateIds.has(i.customer_id));

  const protectedPaidInst = protectedInstallments.filter(i => i.status === 'PAID');
  const candidatePaidInst = candidateInstallments.filter(i => i.status === 'PAID');

  // 4. Fetch all bonuses
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

  const protectedBonuses = allBonuses.filter(b => protectedIds.has(b.customer_id));
  const candidateBonuses = allBonuses.filter(b => candidateIds.has(b.customer_id));
  const orphanedBonuses = allBonuses.filter(b => !protectedIds.has(b.customer_id) && !candidateIds.has(b.customer_id));

  // 5. Fetch all redemptions
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

  const protectedRedemptions = allRedemptions.filter(r => protectedIds.has(r.customer_id));
  const candidateRedemptions = allRedemptions.filter(r => candidateIds.has(r.customer_id));
  const orphanedRedemptions = allRedemptions.filter(r => !protectedIds.has(r.customer_id) && !candidateIds.has(r.customer_id));

  // Map redemption_id to customer_id
  const redemptionToCustomer = new Map();
  for (const r of allRedemptions) {
    redemptionToCustomer.set(r.id, r.customer_id);
  }

  // 6. Fetch all redemption items
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

  const protectedRedemptionItems = allRedemptionItems.filter(ri => protectedIds.has(redemptionToCustomer.get(ri.redemption_id)));
  const candidateRedemptionItems = allRedemptionItems.filter(ri => candidateIds.has(redemptionToCustomer.get(ri.redemption_id)));
  const orphanedRedemptionItems = allRedemptionItems.filter(ri => !redemptionToCustomer.has(ri.redemption_id));

  // 7. Check Emergency Refunds
  const { data: emergencyRefunds, error: refundErr } = await supabase
    .from('emergency_refunds')
    .select('id');
  const emergencyRefundCount = refundErr ? 0 : (emergencyRefunds ? emergencyRefunds.length : 0);

  // 8. Inspect the 9 new customers specifically
  console.log('\n--- NEW 9 CUSTOMERS BREAKDOWN ---');
  const new9Customers = allCustomers.filter(c => NEW_9_CODES.includes(c.customer_code));
  for (const code of NEW_9_CODES) {
    const cust = new9Customers.find(c => c.customer_code === code);
    if (cust) {
      const pmts = allPayments.filter(p => p.customer_id === cust.id);
      const insts = allInstallments.filter(i => i.customer_id === cust.id);
      const paidInsts = insts.filter(i => i.status === 'PAID');
      const bns = allBonuses.filter(b => b.customer_id === cust.id);
      const red = allRedemptions.filter(r => r.customer_id === cust.id);
      const redItems = allRedemptionItems.filter(ri => {
        const cId = redemptionToCustomer.get(ri.redemption_id);
        return cId === cust.id;
      });
      console.log(`Customer ${code} (${cust.full_name}): payments=${pmts.length}, insts=${insts.length}, paid_insts=${paidInsts.length}, bonuses=${bns.length}, redemptions=${red.length}, red_items=${redItems.length}`);
    } else {
      console.log(`Customer ${code}: NOT FOUND`);
    }
  }

  // 9. Inspect Protected Redemption Fixture RJ-2026-C6B5E8
  console.log('\n--- PROTECTED FIXTURE RJ-2026-C6B5E8 BREAKDOWN ---');
  const c6Fixture = protectedCustomers.find(c => c.customer_code === 'RJ-2026-C6B5E8');
  if (c6Fixture) {
    const pmts = allPayments.filter(p => p.customer_id === c6Fixture.id);
    const pmtSum = pmts.reduce((s, p) => s + Number(p.amount), 0);
    const insts = allInstallments.filter(i => i.customer_id === c6Fixture.id);
    const paidInsts = insts.filter(i => i.status === 'PAID');
    const bns = allBonuses.filter(b => b.customer_id === c6Fixture.id);
    const red = allRedemptions.filter(r => r.customer_id === c6Fixture.id);
    const redItems = allRedemptionItems.filter(ri => redemptionToCustomer.get(ri.redemption_id) === c6Fixture.id);
    console.log(`RJ-2026-C6B5E8 (${c6Fixture.full_name}): payments=${pmts.length}, pmtSum=₹${pmtSum}, insts=${insts.length}, paid_insts=${paidInsts.length}, bonuses=${bns.length}, redemptions=${red.length}, red_items=${redItems.length}`);
  }

  // 10. Sequence & Max suffix audit
  console.log('\n--- SEQUENCE SUFFIX AUDIT ---');
  let maxSuffix = 0;
  for (const c of allCustomers) {
    const match = c.customer_code.match(/RJ-?2026-?(\d+)/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > maxSuffix) maxSuffix = val;
    }
  }
  console.log(`Max customer code numeric suffix found: ${maxSuffix}`);

  console.log('\n=== SUMMARY MATRIX ===');
  console.log(`METRIC                  | TOTAL     | CANDIDATE | PROTECTED`);
  console.log(`------------------------+-----------+-----------+----------`);
  console.log(`Customers               | ${String(allCustomers.length).padEnd(9)} | ${String(candidateCustomers.length).padEnd(9)} | ${protectedCustomers.length}`);
  console.log(`Payments                | ${String(allPayments.length).padEnd(9)} | ${String(candidatePayments.length).padEnd(9)} | ${protectedPayments.length}`);
  console.log(`Payment Amount (₹)      | ${String(totalPaymentSum).padEnd(9)} | ${String(candidatePaymentSum).padEnd(9)} | ${protectedPaymentSum}`);
  console.log(`Paid Installments       | ${String(allInstallments.filter(i=>i.status==='PAID').length).padEnd(9)} | ${String(candidatePaidInst.length).padEnd(9)} | ${protectedPaidInst.length}`);
  console.log(`Total Installments      | ${String(allInstallments.length).padEnd(9)} | ${String(candidateInstallments.length).padEnd(9)} | ${protectedInstallments.length}`);
  console.log(`Bonuses                 | ${String(allBonuses.length).padEnd(9)} | ${String(candidateBonuses.length).padEnd(9)} | ${protectedBonuses.length}`);
  console.log(`Redemptions             | ${String(allRedemptions.length).padEnd(9)} | ${String(candidateRedemptions.length).padEnd(9)} | ${protectedRedemptions.length}`);
  console.log(`Redemption Items        | ${String(allRedemptionItems.length).padEnd(9)} | ${String(candidateRedemptionItems.length).padEnd(9)} | ${protectedRedemptionItems.length}`);
  console.log(`Emergency Refunds       | ${String(emergencyRefundCount).padEnd(9)} | 0         | 0`);
  console.log(`Orphaned Payments       | ${String(orphanedPayments.length).padEnd(9)} | 0         | 0`);
  console.log(`Orphaned Installments   | ${String(orphanedInstallments.length).padEnd(9)} | 0         | 0`);
  console.log(`Orphaned Bonuses        | ${String(orphanedBonuses.length).padEnd(9)} | 0         | 0`);
  console.log(`Orphaned Redemptions    | ${String(orphanedRedemptions.length).padEnd(9)} | 0         | 0`);
  console.log(`Orphaned Red. Items     | ${String(orphanedRedemptionItems.length).padEnd(9)} | 0         | 0`);
}

reconcile().catch(err => {
  console.error('Audit Error:', err);
});
