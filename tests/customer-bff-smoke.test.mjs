import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

/**
 * Stage 9 — Customer BFF & Mobile Client Integration Smoke Test
 *
 * Tests the real local Customer BFF HTTP endpoints against the local Supabase Edge Runtime.
 * All fixtures are synthetic, isolated, and strictly cleaned up in test.after() using exact UUIDs.
 */

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';

// Synthetic customer UUIDs
const S1_ID = 'd0000000-0000-0000-0000-000000000001';
const S2_ID = 'd0000000-0000-0000-0000-000000000002';
const S3_ID = 'd0000000-0000-0000-0000-000000000003';
const S1_SCHEME_ID = 'e0000000-0000-0000-0000-000000000001';

const SHARED_MOBILE = '9888877771';
const SOLO_MOBILE = '9888877772';
const TEST_PASSWORD = 'Password123!';

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  );
}

function cleanupSyntheticFixtures() {
  const cleanupSql = `
BEGIN;
DELETE FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}') OR grantee_customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.customer_sessions WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}') OR authenticated_root_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.customer_auth WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.notifications WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.scheme_installments WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.schemes WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.customers WHERE id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
DELETE FROM public.profiles WHERE id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
COMMIT;
`;
  runSql(cleanupSql);
}

function getSyntheticFixtureCount() {
  const sql = `
SELECT (
  (SELECT count(*) FROM public.customers WHERE id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}')) +
  (SELECT count(*) FROM public.profiles WHERE id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}')) +
  (SELECT count(*) FROM public.schemes WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}')) +
  (SELECT count(*) FROM public.customer_auth WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}')) +
  (SELECT count(*) FROM public.customer_sessions WHERE customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}') OR authenticated_root_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}')) +
  (SELECT count(*) FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}') OR grantee_customer_id IN ('${S1_ID}', '${S2_ID}', '${S3_ID}'))
) AS total;
`;
  const raw = runSql(sql);
  return parseInt(raw.trim(), 10);
}

function getPreExistingCustomerIds() {
  const sql = `
SELECT coalesce(json_agg(id ORDER BY id), '[]'::json)::text
FROM public.customers
WHERE id NOT IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
`;
  return JSON.parse(runSql(sql).trim());
}

function getPreExistingProfileIds() {
  const sql = `
SELECT coalesce(json_agg(id ORDER BY id), '[]'::json)::text
FROM public.profiles
WHERE id NOT IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
`;
  return JSON.parse(runSql(sql).trim());
}

function getPreExistingSchemeIds() {
  const sql = `
SELECT coalesce(json_agg(id ORDER BY id), '[]'::json)::text
FROM public.schemes
WHERE customer_id NOT IN ('${S1_ID}', '${S2_ID}', '${S3_ID}');
`;
  return JSON.parse(runSql(sql).trim());
}

function getDatabaseBaseline() {
  const sql = `
SELECT json_build_object(
  'customers', (SELECT count(*) FROM public.customers),
  'profiles', (SELECT count(*) FROM public.profiles),
  'schemes', (SELECT count(*) FROM public.schemes),
  'payments', (SELECT count(*) FROM public.payments),
  'payment_total', (SELECT coalesce(sum(amount), 0) FROM public.payments),
  'customer_auth', (SELECT count(*) FROM public.customer_auth),
  'customer_sessions', (SELECT count(*) FROM public.customer_sessions),
  'customer_profile_authorizations', (SELECT count(*) FROM public.customer_profile_authorizations)
)::text;
`;
  const raw = runSql(sql);
  return JSON.parse(raw.trim());
}

// Ensure process termination cleans up synthetic fixtures
process.on('exit', () => {
  try {
    cleanupSyntheticFixtures();
  } catch {
    // Process exit context; ignore errors
  }
});

let initialBaseline;
let initialPreExistingCustomerIds = [];
let initialPreExistingProfileIds = [];
let initialPreExistingSchemeIds = [];
let s1Token = null;
let s3Token = null;

test.before(() => {
  // 1. Ensure clean slate before taking baseline or inserting fixtures
  cleanupSyntheticFixtures();

  // 2. Snapshot baseline state and all pre-existing IDs
  initialBaseline = getDatabaseBaseline();
  initialPreExistingCustomerIds = getPreExistingCustomerIds();
  initialPreExistingProfileIds = getPreExistingProfileIds();
  initialPreExistingSchemeIds = getPreExistingSchemeIds();

  // 3. Create isolated synthetic test fixtures
  const setupSql = `
DO $$
DECLARE
  v_hash TEXT := extensions.crypt('${TEST_PASSWORD}', extensions.gen_salt('bf', 10));
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Insert S1 Profile & Customer (Created first chronologically)
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at)
  VALUES ('${S1_ID}', 'CUSTOMER', '${SHARED_MOBILE}', 'Synthetic Alice', TRUE, v_now - INTERVAL '10 seconds', v_now - INTERVAL '10 seconds');

  INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_at, updated_at)
  VALUES ('${S1_ID}', 'RJ2026-SYNTH-001', '${SHARED_MOBILE}', 'Synthetic Alice', 'Dindigul', v_now - INTERVAL '10 seconds', v_now - INTERVAL '10 seconds');

  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at)
  VALUES ('${S1_ID}', v_hash, 'ACTIVE', 0, v_now - INTERVAL '10 seconds', v_now - INTERVAL '10 seconds');

  -- Insert S1 Scheme (slot 1)
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${S1_SCHEME_ID}', '${S1_ID}', 'RJ-SCH-2026-SYNTH1', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-30', 'ACTIVE', v_now - INTERVAL '10 seconds', v_now - INTERVAL '10 seconds');

  -- Insert S2 Profile & Customer (SHARES phone with S1, but NO authorization link initially)
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at)
  VALUES ('${S2_ID}', 'CUSTOMER', '${SHARED_MOBILE}', 'Synthetic Bob', TRUE, v_now, v_now);

  INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_at, updated_at)
  VALUES ('${S2_ID}', 'RJ2026-SYNTH-002', '${SHARED_MOBILE}', 'Synthetic Bob', 'Dindigul', v_now, v_now);

  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at)
  VALUES ('${S2_ID}', v_hash, 'ACTIVE', 0, v_now, v_now);

  -- Insert S3 Profile & Customer (Solo mobile)
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at)
  VALUES ('${S3_ID}', 'CUSTOMER', '${SOLO_MOBILE}', 'Synthetic Charlie', TRUE, v_now, v_now);

  INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_at, updated_at)
  VALUES ('${S3_ID}', 'RJ2026-SYNTH-003', '${SOLO_MOBILE}', 'Synthetic Charlie', 'Dindigul', v_now, v_now);

  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at)
  VALUES ('${S3_ID}', v_hash, 'ACTIVE', 0, v_now, v_now);
END;
$$;
`;
  try {
    runSql(setupSql);
  } catch (err) {
    cleanupSyntheticFixtures();
    throw err;
  }
});

test.after(() => {
  try {
    // Guaranteed cleanup of synthetic test data strictly by exact synthetic UUIDs
    cleanupSyntheticFixtures();
  } finally {
    // 1. Verify all synthetic test fixtures are completely removed (0 remaining)
    const remainingSynthetic = getSyntheticFixtureCount();
    assert.equal(remainingSynthetic, 0, 'All synthetic test fixtures must be completely removed');

    // 2. Verify all pre-existing customers, profiles, and schemes are strictly preserved
    const postCustomerIds = getPreExistingCustomerIds();
    assert.deepEqual(postCustomerIds, initialPreExistingCustomerIds, 'Pre-existing customer records must be strictly preserved');

    const postProfileIds = getPreExistingProfileIds();
    assert.deepEqual(postProfileIds, initialPreExistingProfileIds, 'Pre-existing profile records must be strictly preserved');

    const postSchemeIds = getPreExistingSchemeIds();
    assert.deepEqual(postSchemeIds, initialPreExistingSchemeIds, 'Pre-existing scheme records must be strictly preserved');

    // 3. Verify total database counts match initial baseline
    const postBaseline = getDatabaseBaseline();
    assert.deepEqual(postBaseline, initialBaseline, 'Post-teardown database counts must match initial baseline exactly');
  }
});

test('1. Invalid credentials return safe 401 error without disclosing account existence or hashes', async () => {
  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: SHARED_MOBILE,
      password: 'WrongPassword999!',
    }),
  });

  assert.equal(res.status, 401, 'Invalid credentials must return 401 Unauthorized');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /invalid mobile number or password/i);
  assert.equal(body.token, undefined);
  assert.equal(body.password_hash, undefined);
});

test('2. Successful login for single-profile account returns direct navigation payload without chooser', async () => {
  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: SOLO_MOBILE,
      password: TEST_PASSWORD,
    }),
  });

  assert.equal(res.status, 200, 'Login must succeed with 200');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(typeof body.token === 'string' && body.token.length >= 32, 'Must return session token');
  assert.equal(body.requiresSelection, false, 'Single profile must not require selection');
  assert.equal(body.customer.customerId, S3_ID);
  assert.equal(body.customer.fullName, 'Synthetic Charlie');
  assert.equal(body.profiles.length, 1);
  assert.equal(body.profiles[0].customerId, S3_ID);

  s3Token = body.token;
});

test('3. Two accounts sharing phone belong to authenticated mobile-number group and are offered for selection', async () => {
  // S1 and S2 share phone SHARED_MOBILE
  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: SHARED_MOBILE,
      password: TEST_PASSWORD,
    }),
  });

  assert.equal(res.status, 200, 'Login must succeed');
  const body = await res.json();
  assert.equal(body.success, true);
  s1Token = body.token;

  // Under Rule A: Both customer registrations registered under this mobile number are returned
  const profileIds = body.profiles.map((p) => p.customerId);
  assert.ok(profileIds.includes(S1_ID), 'Authenticated customer S1 must be included');
  assert.ok(profileIds.includes(S2_ID), 'Customer S2 sharing the phone number must be included in mobile group');
  assert.equal(body.requiresSelection, true, 'Multiple accessible profiles must trigger selection screen');
  assert.equal(body.profiles.length, 2);
});

test('4. Explicitly authorized family member returns multiple safe profiles for selection screen', async () => {
  // Establish explicit showroom family authorization between S1 and S2
  runSql(`
    INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by)
    VALUES
      ('${S1_ID}', '${S2_ID}', 'SPOUSE', TRUE, 'SHOWROOM_VERIFIED'),
      ('${S2_ID}', '${S1_ID}', 'SPOUSE', TRUE, 'SHOWROOM_VERIFIED')
    ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE SET is_active = TRUE;
  `);

  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: SHARED_MOBILE,
      password: TEST_PASSWORD,
    }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.requiresSelection, true, 'Multiple authorized profiles must require selection');
  assert.equal(body.profiles.length, 2, 'Both authorized family profiles must be returned');

  const s1Prof = body.profiles.find((p) => p.customerId === S1_ID);
  const s2Prof = body.profiles.find((p) => p.customerId === S2_ID);
  assert.ok(s1Prof, 'S1 profile must be present');
  assert.ok(s2Prof, 'S2 profile must be present');
  assert.equal(s1Prof.schemeCount, 1, 'S1 must reflect 1 active scheme');
  assert.equal(s2Prof.schemeCount, 0, 'S2 must reflect 0 active schemes');

  // Verify safe profile attributes (no password hash, no secret keys)
  for (const prof of body.profiles) {
    assert.equal(prof.password_hash, undefined);
    assert.equal(prof.passwordHash, undefined);
    assert.ok(prof.customerCode, 'Customer code must be present');
    assert.ok(prof.fullName, 'Full name must be present');
  }

  s1Token = body.token;
});

test('5. Authorized family member profile selection switches session profile successfully', async () => {
  const res = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s1Token}`,
    },
    body: JSON.stringify({
      customerId: S2_ID,
    }),
  });

  assert.equal(res.status, 200, 'Profile switch to authorized customer must succeed');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.customer.customerId, S2_ID, 'Active customer ID must now be S2');
  assert.equal(body.customer.fullName, 'Synthetic Bob');
});

test('6. Switching to unauthorized customer UUID is strictly rejected with 403 Forbidden', async () => {
  // S1 tries to switch to S3 (who is NOT authorized for S1)
  const res = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s1Token}`,
    },
    body: JSON.stringify({
      customerId: S3_ID,
    }),
  });

  assert.equal(res.status, 403, 'Unauthorized profile switch must be rejected with 403');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /unauthorized profile selection/i);
});

test('7. Session verification preserves authenticated root identity after profile switching', () => {
  // Inspect the customer_sessions record for s1Token in the database
  const sessionCheckSql = `
    SELECT json_build_object(
      'customer_id', customer_id,
      'authenticated_root_id', authenticated_root_id,
      'is_root_preserved', (authenticated_root_id = '${S1_ID}' AND customer_id = '${S2_ID}')
    )::text
    FROM public.customer_sessions
    WHERE authenticated_root_id = '${S1_ID}'
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  const raw = runSql(sessionCheckSql);
  const sessionRow = JSON.parse(raw.trim());

  assert.equal(sessionRow.authenticated_root_id, S1_ID, 'Root identity must be preserved as S1');
  assert.equal(sessionRow.customer_id, S2_ID, 'Active profile must be S2');
  assert.equal(sessionRow.is_root_preserved, true, 'Authenticated root ID must not change when switching profiles');
});

test('8. Missing, malformed, invalid, and expired session credentials are handled safely', async () => {
  // A. Missing Authorization header
  const resNoAuth = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: S2_ID }),
  });
  assert.equal(resNoAuth.status, 401, 'Missing Authorization header must return 401');

  // B. Malformed Authorization header
  const resMalformed = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic invalid-creds',
    },
    body: JSON.stringify({ customerId: S2_ID }),
  });
  assert.equal(resMalformed.status, 401, 'Malformed Authorization header must return 401');

  // C. Invalid token (random 64-char hex)
  const resInvalid = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    body: JSON.stringify({ customerId: S2_ID }),
  });
  assert.equal(resInvalid.status, 401, 'Invalid session token must return 401');

  // D. Expired token (set created_at 2 hours ago, expires_at 1 hour ago)
  runSql(`
    UPDATE public.customer_sessions
    SET created_at = clock_timestamp() - INTERVAL '2 hours',
        expires_at = clock_timestamp() - INTERVAL '1 hour'
    WHERE authenticated_root_id = '${S3_ID}';
  `);
  const resExpired = await fetch(`${BFF_URL}/auth/select-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s3Token}`,
    },
    body: JSON.stringify({ customerId: S3_ID }),
  });
  assert.equal(resExpired.status, 401, 'Expired session token must return 401');
});

test('9. Responses do not contain password hashes, service-role keys, or session internal secrets', async () => {
  const loginRes = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: SOLO_MOBILE,
      password: TEST_PASSWORD,
    }),
  });

  const rawText = await loginRes.text();
  assert.ok(!rawText.includes('password_hash'), 'Response must not contain password_hash');
  assert.ok(!rawText.includes('$2a$'), 'Response must not contain blowfish hashes');
  assert.ok(!rawText.includes('service_role'), 'Response must not contain service_role');
  assert.ok(!rawText.includes('token_hash'), 'Response must not leak token_hash');
  assert.ok(!rawText.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Response must not leak secret keys');
});

test('10. Regression: Teardown procedure preserves pre-test baseline and cannot delete unrelated records', () => {
  // 1. Verify pre-existing customer and profile records exist
  const currentPreExistingCusts = getPreExistingCustomerIds();
  const currentPreExistingProfs = getPreExistingProfileIds();
  const currentPreExistingSchemes = getPreExistingSchemeIds();

  assert.ok(currentPreExistingCusts.length > 0, 'Pre-existing customer baseline must not be empty');
  assert.ok(currentPreExistingProfs.length > 0, 'Pre-existing profile baseline must not be empty');
  assert.deepEqual(currentPreExistingCusts, initialPreExistingCustomerIds, 'Pre-existing customers must match initial pre-test baseline');
  assert.deepEqual(currentPreExistingProfs, initialPreExistingProfileIds, 'Pre-existing profiles must match initial pre-test baseline');
  assert.deepEqual(currentPreExistingSchemes, initialPreExistingSchemeIds, 'Pre-existing schemes must match initial pre-test baseline');

  // 2. Execute teardown cleanup function
  cleanupSyntheticFixtures();

  // 3. Confirm all synthetic fixtures (S1, S2, S3, S1_SCHEME) are strictly 0
  const synthCount = getSyntheticFixtureCount();
  assert.equal(synthCount, 0, 'All synthetic fixtures must be completely cleaned up');

  // 4. Confirm no pre-existing or unrelated records were altered or deleted
  const postCusts = getPreExistingCustomerIds();
  const postProfs = getPreExistingProfileIds();
  const postSchemes = getPreExistingSchemeIds();

  assert.deepEqual(postCusts, initialPreExistingCustomerIds, 'Teardown must not delete or modify any pre-existing customer records');
  assert.deepEqual(postProfs, initialPreExistingProfileIds, 'Teardown must not delete or modify any pre-existing profile records');
  assert.deepEqual(postSchemes, initialPreExistingSchemeIds, 'Teardown must not delete or modify any pre-existing scheme records');

  // 5. Test idempotence: executing teardown repeatedly must be safe and never touch unrelated records
  cleanupSyntheticFixtures();
  cleanupSyntheticFixtures();

  assert.deepEqual(getPreExistingCustomerIds(), initialPreExistingCustomerIds, 'Repeated teardown must preserve all pre-existing customers');
  assert.deepEqual(getPreExistingProfileIds(), initialPreExistingProfileIds, 'Repeated teardown must preserve all pre-existing profiles');
  assert.deepEqual(getPreExistingSchemeIds(), initialPreExistingSchemeIds, 'Repeated teardown must preserve all pre-existing schemes');
  assert.equal(getSyntheticFixtureCount(), 0, 'Synthetic fixture count must remain strictly 0');
});
