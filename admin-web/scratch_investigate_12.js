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

async function print12Details() {
  // Authenticate as Admin
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin1@gmail.com',
    password: 'admin1passwordsupersecret2026'
  });

  if (authError) {
    await supabase.auth.signInWithPassword({
      email: 'admin1@gmail.com',
      password: 'admin1'
    });
  }

  const { data: customers } = await supabase.from('customers').select('*');
  const { data: schemes } = await supabase.from('schemes').select('*');
  const { data: installments } = await supabase.from('scheme_installments').select('*');
  const { data: payments } = await supabase.from('payments').select('*');
  const { data: bonuses } = await supabase.from('scheme_bonuses').select('*');
  const { data: redemptions } = await supabase.from('redemptions').select('*');
  const { data: redemptionItems } = await supabase.from('redemption_items').select('*');

  console.log('=== DETAILED 12 CUSTOMERS BREAKDOWN ===\n');

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const cSchemes = schemes.filter(s => s.customer_id === c.id);
    const cInsts = installments.filter(inst => inst.customer_id === c.id);
    const cPaidInsts = cInsts.filter(inst => inst.status === 'PAID' || inst.paid_amount > 0 || inst.paid_date);
    const cPmts = payments.filter(p => p.customer_id === c.id);
    const cPmtSum = cPmts.reduce((sum, p) => sum + Number(p.amount), 0);
    const cBonuses = bonuses.filter(b => b.customer_id === c.id);
    const cReds = redemptions.filter(r => r.customer_id === c.id);
    const cRedIds = new Set(cReds.map(r => r.id));
    const cRedItems = redemptionItems.filter(ri => cRedIds.has(ri.redemption_id));

    console.log(`[${i+1}] ${c.customer_code} | Name: "${c.full_name}" | Phone: "${c.phone_number}" | Location: "${c.city}" | Created: ${c.created_at}`);
    console.log(`    ID: ${c.id}`);
    console.log(`    Schemes: ${cSchemes.map(s => `${s.scheme_code} (${s.status})`).join(', ') || 'None'}`);
    console.log(`    Installments: Total=${cInsts.length}, Paid=${cPaidInsts.length}`);
    console.log(`    Payments: Count=${cPmts.length}, Total=₹${cPmtSum}`);
    console.log(`    Bonuses: ${cBonuses.map(b => `${b.status} (₹${b.bonus_amount})`).join(', ') || 'None'}`);
    console.log(`    Redemptions: Count=${cReds.length}, Items=${cRedItems.length}`);
    if (cPmts.length > 0) {
      console.log(`    Payment Modes: ${cPmts.map(p => `${p.payment_method} (₹${p.amount} on ${p.payment_date.split('T')[0]})`).join(', ')}`);
    }
    console.log('');
  }
}

print12Details().catch(console.error);
