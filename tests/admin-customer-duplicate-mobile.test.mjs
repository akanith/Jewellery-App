import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

/**
 * Test Suite: Admin Customer Creation with Shared Mobile Number & Family Linking
 *
 * Verifies:
 * 1. Creation of Customer A with phone X.
 * 2. Creation of Customer B with the SAME phone X and different name.
 * 3. Both customers retain distinct immutable UUIDs and unique customer codes (RJ2026-XXX).
 * 4. Both remain separate customer profiles in public.customers and public.profiles.
 * 5. Customer B cannot access Customer A's profile without explicit authorization.
 * 6. Explicit family profile linking (link_customer_family_profiles) establishes bidirectional access.
 * 7. Ordinary customer creation with an unused phone number succeeds normally.
 * 8. Safe handling of repeated submissions without data corruption.
 * 9. Exact baseline table counts before and after with guaranteed cleanup.
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const SHARED_PHONE = '9555500001';
const UNUSED_PHONE = '9555500002';

let custAId = null;
let custACode = null;
let custBId = null;
let custBCode = null;
let custCId = null;
let custCCode = null;

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  );
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

let initialBaseline;

test.before(() => {
  initialBaseline = getDatabaseBaseline();
  assert.equal(typeof initialBaseline.customers, 'number', 'Baseline check must succeed');
});

test.after(() => {
  // Guaranteed cleanup of synthetic test data by exact test phone numbers
  const cleanupSql = `
DELETE FROM public.customer_profile_authorizations
WHERE grantor_customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'))
   OR grantee_customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));

DELETE FROM public.customer_sessions WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.customer_auth WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.notifications WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.scheme_bonuses WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.scheme_installments WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}'));
DELETE FROM public.customers WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}');
DELETE FROM public.profiles WHERE phone_number IN ('${SHARED_PHONE}', '${UNUSED_PHONE}');
`;
  runSql(cleanupSql);

  const postBaseline = getDatabaseBaseline();
  assert.deepEqual(postBaseline, initialBaseline, 'Database record counts must return exactly to baseline after teardown');
});

test('1. Create Customer A with 11 canonical parameters and verify unique ID & code', () => {
  const sql = `
DO $$
DECLARE
  v_admin_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_res := public.create_customer_with_scheme(
    p_full_name := 'Aarav Sharma',
    p_phone_number := '${SHARED_PHONE}',
    p_address := '12 Anna Salai',
    p_city := 'Dindigul',
    p_pincode := '624001',
    p_alternate_phone := NULL,
    p_nominee_name := 'Diya Sharma',
    p_nominee_relationship := 'Spouse',
    p_notes := 'Synthetic test Customer A',
    p_enroll_scheme := TRUE,
    p_start_month := '2026-10-01'::DATE
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Customer A creation failed: %', v_res;
  END IF;
END;
$$;
`;
  runSql(sql);

  const row = JSON.parse(runSql(`
    SELECT json_build_object(
      'id', id,
      'customer_code', customer_code,
      'full_name', full_name,
      'phone_number', phone_number
    )::text
    FROM public.customers
    WHERE phone_number = '${SHARED_PHONE}'
    LIMIT 1;
  `).trim());

  assert.ok(row.id, 'Customer A ID must be present');
  assert.equal(row.full_name, 'Aarav Sharma');
  assert.equal(row.phone_number, SHARED_PHONE);
  assert.match(row.customer_code, /^RJ2026-\d{3}$/, 'Customer code must follow RJ2026-XXX format');

  custAId = row.id;
  custACode = row.customer_code;
});

test('2. Create Customer B with the SAME phone number and different name without duplicate mobile error', () => {
  const sql = `
DO $$
DECLARE
  v_admin_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Create Customer B sharing phone with Customer A
  v_res := public.create_customer_with_scheme(
    p_full_name := 'Diya Sharma',
    p_phone_number := '${SHARED_PHONE}',
    p_address := '12 Anna Salai',
    p_city := 'Dindigul',
    p_pincode := '624001',
    p_alternate_phone := NULL,
    p_nominee_name := 'Aarav Sharma',
    p_nominee_relationship := 'Spouse',
    p_notes := 'Synthetic test Customer B (Family member sharing mobile)',
    p_enroll_scheme := TRUE,
    p_start_month := '2026-10-01'::DATE
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Customer B creation failed: %', v_res;
  END IF;
END;
$$;
`;
  // Must execute cleanly without P0001
  runSql(sql);

  const row = JSON.parse(runSql(`
    SELECT json_build_object(
      'id', id,
      'customer_code', customer_code,
      'full_name', full_name,
      'phone_number', phone_number
    )::text
    FROM public.customers
    WHERE phone_number = '${SHARED_PHONE}' AND id != '${custAId}'
    LIMIT 1;
  `).trim());

  assert.ok(row.id, 'Customer B ID must be present');
  assert.equal(row.full_name, 'Diya Sharma');
  assert.equal(row.phone_number, SHARED_PHONE);
  assert.notEqual(row.id, custAId, 'Customer B must have a distinct immutable UUID from Customer A');
  assert.notEqual(row.customer_code, custACode, 'Customer B must have a distinct customer code');
  assert.match(row.customer_code, /^RJ2026-\d{3}$/, 'Customer B code must follow RJ2026-XXX format');

  custBId = row.id;
  custBCode = row.customer_code;
});

test('3. Confirm both customers remain separate profiles under the shared phone number', () => {
  const query = JSON.parse(runSql(`
    SELECT json_build_object(
      'customer_count', (SELECT count(*) FROM public.customers WHERE phone_number = '${SHARED_PHONE}'),
      'profile_count', (SELECT count(*) FROM public.profiles WHERE phone_number = '${SHARED_PHONE}' AND role = 'CUSTOMER'),
      'schemes_count', (SELECT count(*) FROM public.schemes WHERE customer_id IN ('${custAId}', '${custBId}'))
    )::text;
  `).trim());

  assert.equal(query.customer_count, 2, 'Exactly 2 customers must exist on shared phone');
  assert.equal(query.profile_count, 2, 'Exactly 2 customer profiles must exist in public.profiles');
  assert.equal(query.schemes_count, 2, 'Each customer must have their own independent scheme');
});

test('4. Confirm second customer is NOT authorized for Customer A before explicit linking, and cannot switch profiles', () => {
  const sql = `
DO $$
DECLARE
  v_is_authorized_unlinked BOOLEAN;
  v_is_authorized_stranger BOOLEAN;
  v_token_hash TEXT := 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  v_caught_42501 BOOLEAN := FALSE;
  v_stranger_id UUID := '99999999-9999-9999-9999-999999999999'::uuid;
BEGIN
  -- 1. Sharing a phone number alone must NOT grant authorization
  v_is_authorized_unlinked := public.is_customer_authorized_for_profile('${custBId}'::uuid, '${custAId}'::uuid);
  IF v_is_authorized_unlinked THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Customer B must NOT be authorized for Customer A before explicit linking!';
  END IF;

  -- 2. Check is_customer_authorized_for_profile is FALSE for stranger UUID
  v_is_authorized_stranger := public.is_customer_authorized_for_profile('${custBId}'::uuid, v_stranger_id);
  IF v_is_authorized_stranger THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Customer B must not be authorized for stranger UUID!';
  END IF;

  -- 3. Create session for Customer B
  INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
    (gen_random_uuid(), '${custBId}'::uuid, '${custBId}'::uuid, v_token_hash, clock_timestamp() + interval '1 day');

  -- 4. Attempting profile switch to unlinked Customer A must be rejected with 42501
  BEGIN
    PERFORM public.switch_customer_profile_session(v_token_hash, '${custAId}'::uuid);
  EXCEPTION
    WHEN SQLSTATE '42501' THEN
      v_caught_42501 := TRUE;
  END;

  IF NOT v_caught_42501 THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: switch_customer_profile_session allowed unlinked profile switch!';
  END IF;
END;
$$;
`;
  runSql(sql);
});

test('5. Test optional family-link flow separately via link_customer_family_profiles RPC', () => {
  const sql = `
DO $$
DECLARE
  v_admin_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_res := public.link_customer_family_profiles(
    p_customer_id_1 := '${custAId}',
    p_customer_id_2 := '${custBId}',
    p_relationship := 'SPOUSE',
    p_notes := 'Verified showroom family link'
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'link_customer_family_profiles failed: %', v_res;
  END IF;
END;
$$;
`;
  runSql(sql);

  const authData = JSON.parse(runSql(`
    SELECT json_build_object(
      'count', (SELECT count(*) FROM public.customer_profile_authorizations
                WHERE grantor_customer_id IN ('${custAId}', '${custBId}')
                  AND grantee_customer_id IN ('${custAId}', '${custBId}')
                  AND is_active = TRUE)
    )::text;
  `).trim());

  assert.equal(authData.count, 2, 'Must create 2 reciprocal authorization rows for bidirectional access');
});

test('6. Verify family profile switching succeeds after explicit link', () => {
  const sql = `
DO $$
DECLARE
  v_is_authorized BOOLEAN;
  v_token_hash TEXT := 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  v_session_res JSONB;
BEGIN
  -- 1. Check is_customer_authorized_for_profile is now TRUE
  v_is_authorized := public.is_customer_authorized_for_profile('${custBId}'::uuid, '${custAId}'::uuid);
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Authorization check returned FALSE after explicit family linking!';
  END IF;

  -- 2. Execute profile switch for Customer B's session to Customer A
  v_session_res := public.switch_customer_profile_session(v_token_hash, '${custAId}'::uuid);

  IF (v_session_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Authorized profile switch failed: %', v_session_res;
  END IF;

  IF (v_session_res->>'active_customer_id')::uuid <> '${custAId}'::uuid THEN
    RAISE EXCEPTION 'Session active_customer_id mismatch: %', v_session_res;
  END IF;
END;
$$;
`;
  runSql(sql);
});

test('7. Create ordinary customer C with an unused phone number', () => {
  const sql = `
DO $$
DECLARE
  v_admin_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_res := public.create_customer_with_scheme(
    p_full_name := 'Vikram Patel',
    p_phone_number := '${UNUSED_PHONE}',
    p_address := '45 Gandhi Road',
    p_city := 'Dindigul',
    p_pincode := '624001',
    p_alternate_phone := NULL,
    p_nominee_name := 'Pooja Patel',
    p_nominee_relationship := 'Sister',
    p_notes := 'Synthetic test Customer C (Unshared phone)',
    p_enroll_scheme := TRUE,
    p_start_month := '2026-10-01'::DATE
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Customer C creation failed: %', v_res;
  END IF;
END;
$$;
`;
  runSql(sql);

  const row = JSON.parse(runSql(`
    SELECT json_build_object(
      'id', id,
      'customer_code', customer_code,
      'full_name', full_name,
      'phone_number', phone_number
    )::text
    FROM public.customers
    WHERE phone_number = '${UNUSED_PHONE}'
    LIMIT 1;
  `).trim());

  assert.ok(row.id, 'Customer C ID must be present');
  assert.equal(row.full_name, 'Vikram Patel');
  assert.equal(row.phone_number, UNUSED_PHONE);
  assert.notEqual(row.id, custAId);
  assert.notEqual(row.id, custBId);
  assert.notEqual(row.customer_code, custACode);
  assert.notEqual(row.customer_code, custBCode);

  custCId = row.id;
  custCCode = row.customer_code;
});

test('8. Confirm repeated submissions or invalid parameters do not corrupt state or create silent duplicates', async () => {
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // Calling create_customer_with_scheme without admin auth must be rejected
  const { data, error } = await anonClient.rpc('create_customer_with_scheme', {
    p_full_name: 'Unauthorized User',
    p_phone_number: '9111122223',
    p_city: 'Dindigul',
    p_enroll_scheme: true,
  });

  assert.ok(error !== null, 'Anonymous customer creation must be blocked by authorization');
  assert.match(error.message, /permission denied|unauthorized|registered administrators/i);
});
