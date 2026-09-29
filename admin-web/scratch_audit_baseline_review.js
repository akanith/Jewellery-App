const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runAuditBaselineReview() {
  console.log('=== CHECKPOINT 10.6I.6R — AUDIT LOG & PRODUCTION BASELINE REVIEW ===\n');

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

  // 1. Fetch total audit log count
  const { data: logsCount } = await supabase.from('audit_logs').select('id');
  console.log(`Total Audit Log Records in DB: ${(logsCount || []).length}\n`);

  // 2. Fetch distinct action types from audit_logs
  const actions = ['CREATE', 'PAYMENT_RECORDED', 'CUSTOMER_DELETED', 'CUSTOMER_PERMANENTLY_DELETED', 'E2E_TEST_DATA_PURGED', 'SIX_TEST_CUSTOMERS_PURGED'];

  for (const actionName of actions) {
    const { data: records } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', actionName)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`--- REPRESENTATIVE RECORD FOR ACTION: ${actionName} ---`);
    if (records && records.length > 0) {
      console.log(JSON.stringify(records[0], null, 2));
    } else {
      console.log('No records found for this action type.');
    }
    console.log('');
  }
}

runAuditBaselineReview().catch(console.error);
