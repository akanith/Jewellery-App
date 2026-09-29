const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runForensicAudit() {
  console.log('=== FORENSIC INVESTIGATION OF DELETION EVENT ===\n');

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

  // 1. Audit log entry for Guest (2256961b-53ea-4198-99f9-a6c0396507c3)
  const { data: guestLog } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_id', '2256961b-53ea-4198-99f9-a6c0396507c3');

  console.log('1. AUDIT LOG FOR GUEST (RJ2026-279):');
  console.log(JSON.stringify(guestLog, null, 2));

  // 2. Identify actor/admin profile fada7105-e76b-4c46-9cd7-b52d94f624f1
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'fada7105-e76b-4c46-9cd7-b52d94f624f1');

  const { data: actorAdmin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', 'fada7105-e76b-4c46-9cd7-b52d94f624f1');

  console.log('\n2. ACTOR IDENTITY DETAILS (fada7105-e76b-4c46-9cd7-b52d94f624f1):');
  console.log('Profile:', JSON.stringify(actorProfile, null, 2));
  console.log('Admin User:', JSON.stringify(actorAdmin, null, 2));

  // 3. List all CUSTOMER_PERMANENTLY_DELETED audit logs
  const { data: allDeleteLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'CUSTOMER_PERMANENTLY_DELETED')
    .order('created_at', { ascending: true });

  console.log('\n3. ALL CUSTOMER_PERMANENTLY_DELETED AUDIT LOGS:');
  console.log(JSON.stringify(allDeleteLogs, null, 2));

  // 4. Current Customers in Live DB
  const { data: currentCustomers } = await supabase
    .from('customers')
    .select('id, customer_code, full_name, phone_number, created_at')
    .order('created_at', { ascending: true });

  console.log('\n4. CURRENT CUSTOMERS IN LIVE DB:');
  console.log(JSON.stringify(currentCustomers, null, 2));

  // 5. Sequence value check
  let seqVal = null;
  try {
    const { data: seqData } = await supabase.rpc('get_customer_code_seq_value');
    seqVal = seqData;
  } catch (e) {
    seqVal = 'N/A';
  }

  console.log(`\n5. SEQUENCE VALUE: ${seqVal}`);
}

runForensicAudit().catch(console.error);
