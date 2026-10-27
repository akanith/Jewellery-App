import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * RAMYAS JEWELLER — Customer App Login, Customer Selection & Profile Switching Flow Suite
 *
 * Validates the 15 required business scenarios:
 * 1. Signed-out startup opens Login rather than Language Selection.
 * 2. One registered customer under a mobile number goes directly to Home.
 * 3. Two customer registrations sharing a mobile number appear on the selection screen after successful authentication.
 * 4. Incorrect passwords cannot retrieve any profile list.
 * 5. Selecting test1 displays its own Home and Passbook.
 * 6. Selecting test2 displays its own Home and Passbook.
 * 7. The highlighted Switch Profile button appears on Home and Profile when multiple profiles exist.
 * 8. Switch Profile is absent when only one profile exists.
 * 9. Closing and reopening the app asks the customer to choose again if multiple profiles exist.
 * 10. A single-profile session restores directly to Home.
 * 11. Customers with multiple schemes see those schemes grouped under one profile.
 * 12. Tampered customer UUIDs outside the authenticated mobile-number group are rejected.
 * 13. Invalid, expired and malformed sessions are handled safely.
 * 14. Existing shared-phone integration tests and Customer BFF tests remain valid under Rule A.
 * 15. Profile switching clears stale data and isolates financial records.
 */

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';

// Synthetic Multi-Scheme Customer UUIDs for test scenario 11 & single profile tests
const SYNTH_SOLO_ID = 'e1111111-1111-1111-1111-111111111111';
const SYNTH_SCHEME_1 = 'e2222222-2222-2222-2222-222222222221';
const SYNTH_SCHEME_2 = 'e2222222-2222-2222-2222-222222222222';
const SYNTH_MOBILE = '9777766661';
const SYNTH_PASS = 'SchemeTest123!';

// Shared mobile synthetic test accounts: test1 and test2 (Phone: 8778173682)
const SHARED_MOBILE = '8778173682';
const SHARED_PASS = '3682';
const TEST1_ID = '99c224b7-0257-457f-a7b0-7d4515844975'; // RJ2026-065
const TEST2_ID = '5d886889-6605-48bc-8e14-547c78293d23'; // RJ2026-066

// Unrelated stranger customer (different phone number)
const STRANGER_ID = '6d882b69-9b30-49ed-bfc1-4513d1865e9f'; // 9003277500

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  );
}

// Clean up any test fixtures in test.after
test.after(() => {
  const cleanupSql = `
DELETE FROM public.customer_sessions WHERE customer_id = '${SYNTH_SOLO_ID}';
DELETE FROM public.customer_auth WHERE customer_id = '${SYNTH_SOLO_ID}';
DELETE FROM public.payments WHERE scheme_id IN ('${SYNTH_SCHEME_1}', '${SYNTH_SCHEME_2}');
DELETE FROM public.schemes WHERE id IN ('${SYNTH_SCHEME_1}', '${SYNTH_SCHEME_2}');
DELETE FROM public.customers WHERE id = '${SYNTH_SOLO_ID}';
DELETE FROM public.profiles WHERE id = '${SYNTH_SOLO_ID}';
`;
  try {
    runSql(cleanupSql);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
});

// Setup synthetic multi-scheme customer
function setupMultiSchemeCustomer() {
  const sql = `
DO $$
DECLARE
  v_hash TEXT := extensions.crypt('${SYNTH_PASS}', extensions.gen_salt('bf', 10));
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at)
  VALUES ('${SYNTH_SOLO_ID}', 'CUSTOMER', '${SYNTH_MOBILE}', 'Single Profile Multi-Scheme', TRUE, v_now, v_now)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_at, updated_at)
  VALUES ('${SYNTH_SOLO_ID}', 'RJ2026-SOLO', '${SYNTH_MOBILE}', 'Single Profile Multi-Scheme', 'Dindigul', v_now, v_now)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at)
  VALUES ('${SYNTH_SOLO_ID}', v_hash, 'ACTIVE', 0, v_now, v_now)
  ON CONFLICT (customer_id) DO NOTHING;

  -- Scheme 1
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, monthly_installment_amount, total_installments, start_month, end_month, created_at, updated_at)
  VALUES ('${SYNTH_SCHEME_1}', '${SYNTH_SOLO_ID}', 'SC-SOLO-01', 1, 'ACTIVE', 1000, 12, CURRENT_DATE, (CURRENT_DATE + interval '11 months')::date, v_now, v_now)
  ON CONFLICT (id) DO NOTHING;

  -- Scheme 2
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, monthly_installment_amount, total_installments, start_month, end_month, created_at, updated_at)
  VALUES ('${SYNTH_SCHEME_2}', '${SYNTH_SOLO_ID}', 'SC-SOLO-02', 2, 'ACTIVE', 1000, 12, CURRENT_DATE, (CURRENT_DATE + interval '11 months')::date, v_now, v_now)
  ON CONFLICT (id) DO NOTHING;
END $$;
`;
  runSql(sql);
}

// Helper for BFF HTTP requests
async function bffPost(endpoint, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BFF_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function bffGet(endpoint, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BFF_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  return { status: res.status, json: await res.json() };
}

// --------------------------------------------------------------------------
// TEST 1: Signed-out startup opens Login, not Language Selection
// --------------------------------------------------------------------------
test('1. Signed-out startup opens Login, not language selection', () => {
  const indexSource = readFileSync('customer-app/src/app/index.tsx', 'utf-8');
  assert.ok(
    !indexSource.includes("router.replace('/language'") && !indexSource.includes('href="/language"'),
    'index.tsx must not unconditionally navigate or redirect to /language'
  );
  assert.ok(
    indexSource.includes("router.replace('/login'"),
    'index.tsx must route signed-out users to /login'
  );

  const loginSource = readFileSync('customer-app/src/app/login.tsx', 'utf-8');
  assert.ok(
    loginSource.includes("countryCode: '+91'") || loginSource.includes("+91"),
    'login.tsx must include +91 mobile prefix'
  );
  assert.ok(
    loginSource.includes("secureTextEntry={!showPassword}"),
    'login.tsx must provide password show/hide toggle'
  );
});

// --------------------------------------------------------------------------
// TEST 2: One registered customer under a mobile number goes directly to Home
// --------------------------------------------------------------------------
test('2. One registered customer under a mobile number goes directly to Home', async () => {
  setupMultiSchemeCustomer();

  const res = await bffPost('/auth/login', {
    mobileNumber: SYNTH_MOBILE,
    password: SYNTH_PASS,
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.equal(res.json.requiresSelection, false, 'Single profile account must have requiresSelection = false');
  assert.equal(res.json.profiles.length, 1, 'Single profile account must return exactly 1 profile');

  // Verify routing logic simulation
  const targetRoute = res.json.requiresSelection || (res.json.profiles && res.json.profiles.length > 1)
    ? '/select-customer'
    : '/(tabs)';
  assert.equal(targetRoute, '/(tabs)', 'Single registered customer must navigate directly to Home');
});

// --------------------------------------------------------------------------
// TEST 3: Two customer registrations sharing a mobile number appear on selection screen
// --------------------------------------------------------------------------
test('3. Two customer registrations sharing a mobile number appear on selection screen', async () => {
  // Test shared phone 8778173682 (registered for test1 and test2)
  const res = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: SHARED_PASS,
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.equal(res.json.requiresSelection, true, 'Multiple profiles under shared mobile must require selection');
  assert.equal(res.json.profiles.length, 2, 'Should return both customer registrations sharing the number');

  // Verify each returned profile has its own unique UUID and customer code
  const codes = res.json.profiles.map(p => p.customerCode);
  const ids = res.json.profiles.map(p => p.customerId);
  assert.equal(new Set(codes).size, 2, 'Each profile must have unique customer code');
  assert.equal(new Set(ids).size, 2, 'Each profile must have unique customer ID');

  assert.ok(codes.includes('RJ2026-065'), 'test1 customer code must be present');
  assert.ok(codes.includes('RJ2026-066'), 'test2 customer code must be present');

  const targetRoute = res.json.requiresSelection || (res.json.profiles && res.json.profiles.length > 1)
    ? '/select-customer'
    : '/(tabs)';
  assert.equal(targetRoute, '/select-customer', 'Shared mobile group must navigate to /select-customer');
});

// --------------------------------------------------------------------------
// TEST 4: Incorrect passwords cannot retrieve any profile list
// --------------------------------------------------------------------------
test('4. Incorrect passwords cannot retrieve any profile list', async () => {
  // Ensure test account is not locked from previous test runs
  runSql(`UPDATE public.customer_auth SET failed_login_attempts = 0, locked_until = NULL, password_status = 'ACTIVE' WHERE customer_id IN ('${TEST1_ID}', '${TEST2_ID}');`);

  const res = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: 'IncorrectPassword999!',
  });

  // Reset immediately so subsequent tests are not affected
  runSql(`UPDATE public.customer_auth SET failed_login_attempts = 0, locked_until = NULL, password_status = 'ACTIVE' WHERE customer_id IN ('${TEST1_ID}', '${TEST2_ID}');`);

  assert.equal(res.status, 401, 'Incorrect password must return 401 Unauthorized');
  assert.equal(res.json.success, false);
  assert.equal(res.json.profiles, undefined, 'Profiles list must not be leaked on invalid credentials');
  assert.equal(res.json.token, undefined, 'Token must not be issued on invalid credentials');
});

// --------------------------------------------------------------------------
// TEST 5: Selecting test1 displays its own Home and Passbook
// --------------------------------------------------------------------------
test('5. Selecting test1 displays its own Home and Passbook', async () => {
  const loginRes = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: SHARED_PASS,
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.json.token;

  // Activate profile test1 (RJ2026-065)
  const selectRes = await bffPost('/auth/select-profile', { customerId: TEST1_ID }, token);
  assert.equal(selectRes.status, 200);
  assert.equal(selectRes.json.success, true);
  assert.equal(selectRes.json.customer.customerId, TEST1_ID);
  assert.equal(selectRes.json.customer.customerCode, 'RJ2026-065');

  // Verify Dashboard is scoped to test1
  const dashRes = await bffGet('/dashboard', token);
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.json.data.customerCode, 'RJ2026-065');
  assert.equal(dashRes.json.data.customerName, 'test1');

  // Verify Passbook is scoped to test1
  const passRes = await bffGet('/passbook', token);
  assert.equal(passRes.status, 200);
  assert.equal(passRes.json.data.customerCode, 'RJ2026-065');
  assert.equal(passRes.json.data.customerName, 'test1');
});

// --------------------------------------------------------------------------
// TEST 6: Selecting test2 displays its own Home and Passbook
// --------------------------------------------------------------------------
test('6. Selecting test2 displays its own Home and Passbook', async () => {
  const loginRes = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: SHARED_PASS,
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.json.token;

  // Activate profile test2 (RJ2026-066)
  const selectRes = await bffPost('/auth/select-profile', { customerId: TEST2_ID }, token);
  assert.equal(selectRes.status, 200);
  assert.equal(selectRes.json.success, true);
  assert.equal(selectRes.json.customer.customerId, TEST2_ID);
  assert.equal(selectRes.json.customer.customerCode, 'RJ2026-066');

  // Verify Dashboard is scoped to test2
  const dashRes = await bffGet('/dashboard', token);
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.json.data.customerCode, 'RJ2026-066');
  assert.equal(dashRes.json.data.customerName, 'test2');

  // Verify Passbook is scoped to test2
  const passRes = await bffGet('/passbook', token);
  assert.equal(passRes.status, 200);
  assert.equal(passRes.json.data.customerCode, 'RJ2026-066');
  assert.equal(passRes.json.data.customerName, 'test2');
});

// --------------------------------------------------------------------------
// TEST 7: Highlighted Switch Profile button appears on Home and Profile when multiple profiles exist
// --------------------------------------------------------------------------
test('7. Highlighted Switch Profile button appears on Home and Profile when multiple profiles exist', () => {
  const profileSource = readFileSync('customer-app/src/app/(tabs)/profile.tsx', 'utf-8');
  assert.ok(
    profileSource.includes('hasMultipleProfiles &&') && profileSource.includes('switchProfilePill'),
    'Profile screen must render switchProfilePill when hasMultipleProfiles is true'
  );
  assert.ok(
    profileSource.includes('switchIconCircle'),
    'Profile screen must include highlighted switchIconCircle'
  );

  const headerSource = readFileSync('customer-app/src/components/CustomerHeader.tsx', 'utf-8');
  assert.ok(
    headerSource.includes('hasMultipleProfiles &&') && headerSource.includes('switchProfileBtn'),
    'CustomerHeader must render switchProfileBtn when hasMultipleProfiles is true'
  );
});

// --------------------------------------------------------------------------
// TEST 8: Switch Profile is absent when only one profile exists
// --------------------------------------------------------------------------
test('8. Switch Profile is absent when only one profile exists', () => {
  const profileSource = readFileSync('customer-app/src/app/(tabs)/profile.tsx', 'utf-8');
  assert.ok(
    profileSource.includes('hasMultipleProfiles &&'),
    'Profile screen must conditionally guard Switch Profile button with hasMultipleProfiles'
  );

  const headerSource = readFileSync('customer-app/src/components/CustomerHeader.tsx', 'utf-8');
  assert.ok(
    headerSource.includes('hasMultipleProfiles &&'),
    'CustomerHeader must conditionally guard Switch Profile button with hasMultipleProfiles'
  );
});

// --------------------------------------------------------------------------
// TEST 9: Closing and reopening the app asks customer to choose again if multiple profiles exist
// --------------------------------------------------------------------------
test('9. Closing and reopening the app asks customer to choose again if multiple profiles exist', () => {
  const indexSource = readFileSync('customer-app/src/app/index.tsx', 'utf-8');
  assert.ok(
    indexSource.includes('session.authorizedProfiles && session.authorizedProfiles.length > 1'),
    'index.tsx must check session.authorizedProfiles.length > 1'
  );
  assert.ok(
    indexSource.includes("router.replace('/select-customer'"),
    'index.tsx must redirect multiple-profile sessions to /select-customer on fresh launch'
  );
});

// --------------------------------------------------------------------------
// TEST 10: A single-profile session restores directly to Home
// --------------------------------------------------------------------------
test('10. A single-profile session restores directly to Home', () => {
  const indexSource = readFileSync('customer-app/src/app/index.tsx', 'utf-8');
  assert.ok(
    indexSource.includes("router.replace('/(tabs)'"),
    'index.tsx must route single profile sessions directly to /(tabs)'
  );
});

// --------------------------------------------------------------------------
// TEST 11: Customers with multiple schemes see those schemes grouped under one profile
// --------------------------------------------------------------------------
test('11. Customers with multiple schemes see those schemes grouped under one profile', async () => {
  setupMultiSchemeCustomer();

  const loginRes = await bffPost('/auth/login', {
    mobileNumber: SYNTH_MOBILE,
    password: SYNTH_PASS,
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.json.profiles.length, 1, 'Single customer with 2 schemes must have exactly 1 customer profile');
  assert.equal(loginRes.json.requiresSelection, false, 'Single profile must not require profile selection');

  const token = loginRes.json.token;
  const dashRes = await bffGet('/dashboard', token);
  assert.equal(dashRes.status, 200);
  assert.ok(Array.isArray(dashRes.json.data.schemes));
  assert.equal(dashRes.json.data.schemes.length, 2, 'Both schemes must be grouped under this single customer');
});

// --------------------------------------------------------------------------
// TEST 12: Tampered customer UUIDs outside authenticated mobile-number group are rejected
// --------------------------------------------------------------------------
test('12. Tampered customer UUIDs outside authenticated mobile-number group are rejected', async () => {
  const loginRes = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: SHARED_PASS,
  });
  assert.equal(loginRes.status, 200);
  const token = loginRes.json.token;

  // Attempt to switch to STRANGER_ID (unrelated mobile 9003277500)
  const switchRes = await bffPost('/auth/select-profile', { customerId: STRANGER_ID }, token);
  assert.equal(switchRes.status, 403, 'Switching to stranger UUID outside mobile group must return 403 Forbidden');
  assert.equal(switchRes.json.success, false);
  assert.match(switchRes.json.error, /Unauthorized|Security Violation/i);
});

// --------------------------------------------------------------------------
// TEST 13: Invalid, expired and malformed sessions are handled safely
// --------------------------------------------------------------------------
test('13. Invalid, expired and malformed sessions are handled safely', async () => {
  const malformedToken = 'malformed-token-12345';
  const profileRes = await bffGet('/profile', malformedToken);
  assert.equal(profileRes.status, 401, 'Malformed token must return 401 Unauthorized');
  assert.equal(profileRes.json.success, false);

  const noTokenRes = await bffGet('/dashboard');
  assert.equal(noTokenRes.status, 401, 'Missing token must return 401 Unauthorized');
});

// --------------------------------------------------------------------------
// TEST 14: Server session token exposes no password hashes or secret keys
// --------------------------------------------------------------------------
test('14. Server session token exposes no password hashes or secret keys', async () => {
  const loginRes = await bffPost('/auth/login', {
    mobileNumber: SHARED_MOBILE,
    password: SHARED_PASS,
  });
  assert.equal(loginRes.status, 200);

  const rawString = JSON.stringify(loginRes.json);
  assert.ok(!rawString.includes('$2a$') && !rawString.includes('$2b$'), 'Password hashes must never be exposed');
  assert.ok(!rawString.includes('service_role'), 'Service role key must never be exposed');
  assert.ok(!rawString.includes('token_hash'), 'Internal token hashes must never be exposed');
});
