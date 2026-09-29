const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testDryRun() {
  // Authenticate as Admin
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin1@gmail.com',
    password: 'admin1'
  });
  if (authError) throw authError;

  console.log('Testing RPC dry-run (p_execute=false) on live production DB...');
  const { data, error } = await supabase.rpc('admin_cleanup_e2e_test_data', { p_execute: false });
  if (error) {
    console.log('Live RPC Dry-Run Result (Expected Abort prior to new migration deployment):');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
  } else {
    console.log('Live RPC Dry-Run Data:', JSON.stringify(data, null, 2));
  }
}

testDryRun().catch(console.error);
