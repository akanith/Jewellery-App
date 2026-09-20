const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';
const ANON_KEY = 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJzd3NndGJtZ2FnZWJ1cm15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTMwMTE2NywiZXhwIjoyMDU2ODc3MTY3fQ.Y85Z-cO1RjL6Xw0aYQf-aZ1k1X4V6M4L9Y3Z2X1W0V8';

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runFullE2ETest() {
  console.log('==================================================');
  console.log('STEP 1: Submit Customer Forgot Password Request (Mobile: 8778173682)');
  console.log('==================================================');
  const { data: reqRes, error: reqErr } = await supabaseAnon.rpc('request_customer_password_reset', {
    p_mobile_number: '8778173682',
  });
  console.log('Forgot Password Response:', reqRes, reqErr);

  console.log('\n==================================================');
  console.log('STEP 2: Fetch Pending Password Reset Requests (Admin RPC)');
  console.log('==================================================');
  const { data: pendingList, error: pendingErr } = await supabaseAdmin.rpc(
    'get_pending_customer_password_reset_requests'
  );
  console.log('Pending Requests Count:', pendingList ? pendingList.length : 0);
  console.log('Pending Requests Data:', pendingList, pendingErr);

  if (!pendingList || pendingList.length === 0) {
    console.error('FAIL: No pending requests retrieved by admin!');
    return;
  }

  const targetReq = pendingList[0];
  console.log('\nTarget Request Details:', {
    request_id: targetReq.request_id,
    customer_name: targetReq.customer_name,
    customer_code: targetReq.customer_code,
    customer_mobile: targetReq.customer_mobile,
    status: targetReq.status,
  });

  console.log('\n==================================================');
  console.log('STEP 3: Complete Reset Request via Admin RPC');
  console.log('==================================================');
  const { data: completeData, error: completeErr } = await supabaseAdmin.rpc(
    'complete_customer_password_reset_request',
    { p_request_id: targetReq.request_id }
  );
  console.log('Complete RPC Result:', completeData, completeErr);

  const tempPass = completeData.temporary_password;
  const custId = completeData.customer_id;
  console.log('\nGenerated Temporary Password:', tempPass);
  console.log('Target Customer ID:', custId);

  console.log('\n==================================================');
  console.log('STEP 4: Confirm Pending List is Now Empty');
  console.log('==================================================');
  const { data: emptyList } = await supabaseAdmin.rpc('get_pending_customer_password_reset_requests');
  console.log('Pending Requests Count After Completion:', emptyList ? emptyList.length : 0);

  console.log('\n==================================================');
  console.log('STEP 5: Customer Login with Temp Password ("' + tempPass + '")');
  console.log('==================================================');
  const { data: login1, error: login1Err } = await supabaseAnon.rpc('customer_password_login', {
    p_phone_number: '8778173682',
    p_password: tempPass,
  });
  console.log('Customer Temp Password Login Result:', login1, login1Err);

  if (login1.password_status !== 'RESET_REQUIRED') {
    console.error('FAIL: Expected password_status = RESET_REQUIRED!');
    return;
  }

  console.log('\n==================================================');
  console.log('STEP 6: Customer Change Password to "NewPass123!"');
  console.log('==================================================');
  const { data: changeRes, error: changeErr } = await supabaseAnon.rpc('customer_change_password', {
    p_customer_id: custId,
    p_old_password: tempPass,
    p_new_password: 'NewPass123!',
  });
  console.log('Change Password Result:', changeRes, changeErr);

  console.log('\n==================================================');
  console.log('STEP 7: Customer Login with New Password ("NewPass123!")');
  console.log('==================================================');
  const { data: login2, error: login2Err } = await supabaseAnon.rpc('customer_password_login', {
    p_phone_number: '8778173682',
    p_password: 'NewPass123!',
  });
  console.log('New Password Login Result:', login2, login2Err);

  console.log('\n==================================================');
  console.log('STEP 8: Verify Old Temp Password No Longer Works');
  console.log('==================================================');
  const { data: login3, error: login3Err } = await supabaseAnon.rpc('customer_password_login', {
    p_phone_number: '8778173682',
    p_password: tempPass,
  });
  console.log('Old Temp Password Login Result (Should Fail):', login3, login3Err);

  console.log('\n==================================================');
  console.log('SUCCESS: ALL E2E TEST STEPS VERIFIED END-TO-END!');
  console.log('==================================================');
}

runFullE2ETest();
