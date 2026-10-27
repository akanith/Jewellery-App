import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const TEST_PHONE = '9777766661';

let createdCustAId = null;
let createdCustBId = null;

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
});

test.after(() => {
  // Guaranteed teardown of synthetic test data strictly by exact IDs or test phone
  const cleanupSql = `
DELETE FROM public.customer_profile_authorizations
WHERE grantor_customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}')
   OR grantee_customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');

DELETE FROM public.customer_sessions WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.customer_auth WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.notifications WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.scheme_installments WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE phone_number = '${TEST_PHONE}');
DELETE FROM public.customers WHERE phone_number = '${TEST_PHONE}';
DELETE FROM public.profiles WHERE phone_number = '${TEST_PHONE}';
`;
  runSql(cleanupSql);

  const postBaseline = getDatabaseBaseline();
  assert.deepEqual(postBaseline, initialBaseline, 'Database counts must return exactly to baseline');
});

test('1. Database RPC create_customer_with_scheme succeeds with 11 parameters without PGRST202', () => {
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

  -- Call with exact 11 core parameters as passed by admin-web
  v_res := public.create_customer_with_scheme(
    p_full_name := 'Synthetic Parent',
    p_phone_number := '${TEST_PHONE}',
    p_address := '123 Market Street',
    p_city := 'Dindigul',
    p_pincode := '624001',
    p_alternate_phone := NULL,
    p_nominee_name := 'Nominee Person',
    p_nominee_relationship := 'Child',
    p_notes := 'Synthetic test parent customer',
    p_enroll_scheme := TRUE,
    p_start_month := '2026-10-01'::DATE
  );

  RAISE NOTICE 'RESULT:%', v_res;
END;
$$;
`;
  const raw = runSql(sql);

  // Extract created customer id from database
  const query = JSON.parse(runSql(`
    SELECT json_build_object(
      'id', id,
      'code', customer_code,
      'name', full_name
    )::text
    FROM public.customers
    WHERE phone_number = '${TEST_PHONE}'
    LIMIT 1;
  `).trim());

  assert.ok(query.id, 'Customer ID must be generated');
  assert.equal(query.name, 'Synthetic Parent');
  createdCustAId = query.id;
});

test('2. Create second customer sharing phone number with 11 parameters', () => {
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

  -- Call with exact 11 core parameters for second customer sharing same phone
  v_res := public.create_customer_with_scheme(
    p_full_name := 'Synthetic Child',
    p_phone_number := '${TEST_PHONE}',
    p_address := '123 Market Street',
    p_city := 'Dindigul',
    p_pincode := '624001',
    p_alternate_phone := NULL,
    p_nominee_name := 'Nominee Person',
    p_nominee_relationship := 'Parent',
    p_notes := 'Synthetic test child customer',
    p_enroll_scheme := TRUE,
    p_start_month := '2026-10-01'::DATE
  );
END;
$$;
`;
  runSql(sql);

  const query = JSON.parse(runSql(`
    SELECT json_build_object(
      'id', id,
      'code', customer_code,
      'name', full_name
    )::text
    FROM public.customers
    WHERE phone_number = '${TEST_PHONE}' AND id != '${createdCustAId}'
    LIMIT 1;
  `).trim());

  assert.ok(query.id, 'Second customer ID must be generated');
  assert.equal(query.name, 'Synthetic Child');
  assert.notEqual(query.id, createdCustAId, 'Must have distinct immutable customer UUID');
  createdCustBId = query.id;

  const countRes = JSON.parse(runSql(`SELECT json_build_object('count', (SELECT count(*) FROM public.customers WHERE phone_number = '${TEST_PHONE}'))::text;`).trim());
  assert.equal(countRes.count, 2, 'Two distinct customers must exist on the shared mobile number');
});

test('3. link_customer_family_profiles RPC establishes bidirectional authorization', () => {
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
    p_customer_id_1 := '${createdCustAId}',
    p_customer_id_2 := '${createdCustBId}',
    p_relationship := 'FAMILY_MEMBER',
    p_notes := 'Linked during customer creation flow'
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'link_customer_family_profiles failed: %', v_res;
  END IF;
END;
$$;
`;
  runSql(sql);

  const authCount = JSON.parse(runSql(`
    SELECT json_build_object(
      'count', (SELECT count(*) FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${createdCustAId}', '${createdCustBId}') AND grantee_customer_id IN ('${createdCustAId}', '${createdCustBId}') AND is_active = TRUE)
    )::text;
  `).trim());

  assert.equal(authCount.count, 2, 'Must establish mutual (bidirectional) authorization links');
});

test('4. link_customer_family_profiles strictly enforces admin authorization and rejects unauthorized callers', async () => {
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // Attempt to call link_customer_family_profiles as anonymous / non-admin
  const { data, error } = await anonClient.rpc('link_customer_family_profiles', {
    p_customer_id_1: createdCustAId,
    p_customer_id_2: createdCustBId,
    p_relationship: 'FAMILY_MEMBER',
  });

  assert.ok(error !== null || (data && !data.success), 'Unauthorized call must be rejected');
  if (error) {
    assert.match(error.message, /unauthorized|permission denied/i);
  }
});
