import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

/**
 * Family-Link Authorization Hardening & Multi-Customer Isolation Test Suite
 *
 * Covers:
 * 1. Customer registration alone NEVER creates family authorization records,
 *    even if p_link_family_customer_id is supplied and mobile numbers match.
 * 2. Shared phone numbers without authorization do NOT permit profile switching (42501).
 * 3. link_customer_family_profiles rejects when consent is omitted.
 * 4. link_customer_family_profiles rejects when consent is explicitly NULL.
 * 5. link_customer_family_profiles rejects when consent is FALSE.
 * 6. link_customer_family_profiles rejects cross-phone linking.
 * 7. link_customer_family_profiles rejects inactive profiles or non-customer profiles.
 * 8. link_customer_family_profiles succeeds when consent is TRUE with valid active customer profiles and matching normalized phone numbers.
 * 9. Authorization revocation immediately blocks subsequent profile switching (42501).
 * 10. Independent customer credentials, failed login attempts, and account lockouts remain strictly isolated.
 * 11. Standard 11-parameter registration succeeds without touching family authorization.
 * 12. Rollback transactions guarantee database baseline remains 100% untouched.
 */

function runInRollbackTransaction(sqlBlock) {
  const fullSql = `
\\set ON_ERROR_STOP on
BEGIN;
${sqlBlock}
ROLLBACK;
`;

  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: fullSql,
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
  'customer_auth', (SELECT count(*) FROM public.customer_auth),
  'customer_sessions', (SELECT count(*) FROM public.customer_sessions),
  'customer_profile_authorizations', (SELECT count(*) FROM public.customer_profile_authorizations)
)::text;
`;
  const raw = execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: sql,
      encoding: 'utf-8',
    }
  );
  return JSON.parse(raw.trim());
}

const initialBaseline = getDatabaseBaseline();

test('Baseline check: Record initial database counts', () => {
  assert.ok(initialBaseline.customers >= 1, 'Database must have baseline customers');
});

test('Test 1: Customer registration alone NEVER creates family authorization, even if p_link_family_customer_id is supplied', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_parent_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500001';
    v_create_res JSONB;
    v_child_id UUID;
    v_auth_count INTEGER;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 1. Create initial customer (parent)
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_parent_id, 'Existing Parent', 'CUSTOMER', v_phone, TRUE);
    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_parent_id, 'RJ2026-REG-01', 'Existing Parent', v_phone);

    -- 2. Register child customer passing p_link_family_customer_id
    v_create_res := public.create_customer_with_scheme(
        p_full_name := 'Newly Registered Child',
        p_phone_number := v_phone,
        p_address := '123 Street',
        p_city := 'Dindigul',
        p_pincode := '624001',
        p_alternate_phone := NULL,
        p_nominee_name := 'Nominee',
        p_nominee_relationship := 'Parent',
        p_notes := 'Testing that registration alone never links',
        p_enroll_scheme := TRUE,
        p_start_month := '2026-10-01'::DATE,
        p_link_family_customer_id := v_parent_id
    );

    IF NOT (v_create_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 1 Failed: Customer registration failed: %', v_create_res;
    END IF;

    v_child_id := (v_create_res->>'customer_id')::uuid;

    -- 3. PROVE that registration did NOT create any authorization records
    SELECT count(*) INTO v_auth_count
    FROM public.customer_profile_authorizations
    WHERE grantor_customer_id IN (v_parent_id, v_child_id)
       OR grantee_customer_id IN (v_parent_id, v_child_id);

    IF v_auth_count <> 0 THEN
        RAISE EXCEPTION 'Test 1 Failed: Registration alone created % authorization records! Registration must NEVER auto-link.', v_auth_count;
    END IF;

    -- Verify helper function returns FALSE
    IF public.is_customer_authorized_for_profile(v_parent_id, v_child_id) THEN
        RAISE EXCEPTION 'Test 1 Failed: is_customer_authorized_for_profile returned true for unlinked profiles after registration';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 2: Shared phone numbers without authorization do NOT permit profile switching (42501)', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500002';
    v_token_hash VARCHAR(64) := '2222222222222222222222222222222222222222222222222222222222222222';
    v_login_res JSONB;
    v_profiles_count INTEGER;
    v_caught_unauthorized BOOLEAN := FALSE;
BEGIN
    -- Two customers on the SAME phone number without explicit link
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Shared Phone Person 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Shared Phone Person 2', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-UNL-01', 'Shared Phone Person 1', v_phone),
        (v_c2_id, 'RJ2026-UNL-02', 'Shared Phone Person 2', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('PassB123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- 1. Login as Person 1 must return ONLY Person 1
    v_login_res := public.customer_password_login(v_phone, 'PassA123');
    IF NOT (v_login_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 2 Failed: Login failed: %', v_login_res;
    END IF;

    v_profiles_count := jsonb_array_length(v_login_res->'profiles');
    IF v_profiles_count <> 1 THEN
        RAISE EXCEPTION 'Test 2 Failed: Expected 1 profile in login, got %: %', v_profiles_count, v_login_res;
    END IF;

    -- 2. Session created for Person 1
    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    -- 3. Attempt to switch session to Person 2 must fail with 42501
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c2_id);
    EXCEPTION WHEN SQLSTATE '42501' THEN
        v_caught_unauthorized := TRUE;
    END;

    IF NOT v_caught_unauthorized THEN
        RAISE EXCEPTION 'Test 2 Failed: switch_customer_profile_session did not throw 42501 for unlinked profile';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 3: link_customer_family_profiles rejects when consent is omitted', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500003';
    v_caught_omitted BOOLEAN := FALSE;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Customer A', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Customer B', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-OMT-01', 'Customer A', v_phone),
        (v_c2_id, 'RJ2026-OMT-02', 'Customer B', v_phone);

    -- Attempt to call link_customer_family_profiles without p_consent_confirmed
    -- Because p_consent_confirmed is mandatory with no default, calling without it must raise an exception
    BEGIN
        EXECUTE 'SELECT public.link_customer_family_profiles($1, $2)' USING v_c1_id, v_c2_id;
    EXCEPTION WHEN undefined_function THEN
        v_caught_omitted := TRUE;
    END;

    IF NOT v_caught_omitted THEN
        RAISE EXCEPTION 'Test 3 Failed: Calling link_customer_family_profiles with consent omitted did NOT fail with undefined_function!';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 4: link_customer_family_profiles rejects when consent is explicitly NULL', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500004';
    v_caught_null BOOLEAN := FALSE;
    v_err_msg TEXT;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Customer A', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Customer B', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-NUL-01', 'Customer A', v_phone),
        (v_c2_id, 'RJ2026-NUL-02', 'Customer B', v_phone);

    BEGIN
        PERFORM public.link_customer_family_profiles(
            p_customer_id_1 := v_c1_id,
            p_customer_id_2 := v_c2_id,
            p_consent_confirmed := NULL,
            p_relationship := 'FAMILY_MEMBER'
        );
    EXCEPTION WHEN OTHERS THEN
        v_caught_null := TRUE;
        v_err_msg := SQLERRM;
    END;

    IF NOT v_caught_null OR v_err_msg NOT LIKE '%explicit confirmation%' THEN
        RAISE EXCEPTION 'Test 4 Failed: Calling with consent NULL was not rejected. Error: %', v_err_msg;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 5: link_customer_family_profiles rejects when consent is FALSE', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500005';
    v_caught_false BOOLEAN := FALSE;
    v_err_msg TEXT;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Customer A', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Customer B', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-FLS-01', 'Customer A', v_phone),
        (v_c2_id, 'RJ2026-FLS-02', 'Customer B', v_phone);

    BEGIN
        PERFORM public.link_customer_family_profiles(
            p_customer_id_1 := v_c1_id,
            p_customer_id_2 := v_c2_id,
            p_consent_confirmed := FALSE,
            p_relationship := 'FAMILY_MEMBER'
        );
    EXCEPTION WHEN OTHERS THEN
        v_caught_false := TRUE;
        v_err_msg := SQLERRM;
    END;

    IF NOT v_caught_false OR v_err_msg NOT LIKE '%explicit confirmation%' THEN
        RAISE EXCEPTION 'Test 5 Failed: Calling with consent FALSE was not rejected. Error: %', v_err_msg;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 6: link_customer_family_profiles rejects cross-phone linking', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone1 TEXT := '9876500006';
    v_phone2 TEXT := '9876500007';
    v_caught_xphone BOOLEAN := FALSE;
    v_err_msg TEXT;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Customer 1', 'CUSTOMER', v_phone1, TRUE),
        (v_c2_id, 'Customer 2', 'CUSTOMER', v_phone2, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-XP1-01', 'Customer 1', v_phone1),
        (v_c2_id, 'RJ2026-XP2-02', 'Customer 2', v_phone2);

    BEGIN
        PERFORM public.link_customer_family_profiles(
            p_customer_id_1 := v_c1_id,
            p_customer_id_2 := v_c2_id,
            p_consent_confirmed := TRUE,
            p_relationship := 'FAMILY_MEMBER',
            p_notes := 'Should fail due to different phone numbers'
        );
    EXCEPTION WHEN OTHERS THEN
        v_caught_xphone := TRUE;
        v_err_msg := SQLERRM;
    END;

    IF NOT v_caught_xphone OR v_err_msg NOT LIKE '%must share the verified mobile number%' THEN
        RAISE EXCEPTION 'Test 6 Failed: Cross-phone linking was not properly rejected. Error: %', v_err_msg;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 7: link_customer_family_profiles rejects inactive profiles or non-customer profiles', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c_active UUID := gen_random_uuid();
    v_c_inactive UUID := gen_random_uuid();
    v_phone TEXT := '9876500008';
    v_caught_inactive BOOLEAN := FALSE;
    v_caught_admin BOOLEAN := FALSE;
    v_err_msg TEXT;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c_active, 'Active Customer', 'CUSTOMER', v_phone, TRUE),
        (v_c_inactive, 'Inactive Customer', 'CUSTOMER', v_phone, FALSE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c_active, 'RJ2026-ACT-02', 'Active Customer', v_phone),
        (v_c_inactive, 'RJ2026-INA-02', 'Inactive Customer', v_phone);

    -- 1. Inactive profile rejection
    BEGIN
        PERFORM public.link_customer_family_profiles(
            p_customer_id_1 := v_c_active,
            p_customer_id_2 := v_c_inactive,
            p_consent_confirmed := TRUE,
            p_relationship := 'FAMILY_MEMBER'
        );
    EXCEPTION WHEN OTHERS THEN
        v_caught_inactive := TRUE;
        v_err_msg := SQLERRM;
    END;

    IF NOT v_caught_inactive OR v_err_msg NOT LIKE '%must be active%' THEN
        RAISE EXCEPTION 'Test 7.1 Failed: Inactive profile link not rejected properly. Error: %', v_err_msg;
    END IF;

    -- 2. Non-customer profile rejection (e.g. attempting to link admin user)
    BEGIN
        PERFORM public.link_customer_family_profiles(
            p_customer_id_1 := v_c_active,
            p_customer_id_2 := v_admin_id,
            p_consent_confirmed := TRUE,
            p_relationship := 'FAMILY_MEMBER'
        );
    EXCEPTION WHEN OTHERS THEN
        v_caught_admin := TRUE;
        v_err_msg := SQLERRM;
    END;

    IF NOT v_caught_admin THEN
        RAISE EXCEPTION 'Test 7.2 Failed: Non-customer link was not rejected.';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 8: link_customer_family_profiles succeeds when consent is TRUE with valid active customer profiles and matching normalized phone numbers', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500009';
    v_token_hash VARCHAR(64) := '8888888888888888888888888888888888888888888888888888888888888888';
    v_link_res JSONB;
    v_login_res JSONB;
    v_switch_res JSONB;
    v_auth_record RECORD;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Family Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Family Customer 2', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-FAM-03', 'Family Customer 1', v_phone),
        (v_c2_id, 'RJ2026-FAM-04', 'Family Customer 2', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('Pass1234', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('Pass5678', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- 1. Execute explicit admin-authorized workflow with consent TRUE
    v_link_res := public.link_customer_family_profiles(
        p_customer_id_1 := v_c1_id,
        p_customer_id_2 := v_c2_id,
        p_consent_confirmed := TRUE,
        p_relationship := 'SPOUSE',
        p_notes := 'In-person showroom consent confirmed at front desk'
    );

    IF NOT (v_link_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 8 Failed: link_customer_family_profiles failed: %', v_link_res;
    END IF;

    -- 2. Verify authorization record metadata in database
    SELECT * INTO v_auth_record
    FROM public.customer_profile_authorizations
    WHERE grantor_customer_id = v_c1_id AND grantee_customer_id = v_c2_id;

    IF v_auth_record.authorized_by <> 'SHOWROOM_VERIFIED' OR v_auth_record.is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Test 8 Failed: Authorization record has invalid metadata: %', v_auth_record;
    END IF;

    -- 3. Verify customer login returns both linked profiles
    v_login_res := public.customer_password_login(v_phone, 'Pass1234');
    IF jsonb_array_length(v_login_res->'profiles') <> 2 THEN
        RAISE EXCEPTION 'Test 8 Failed: Expected 2 profiles in login after linking, got %: %', jsonb_array_length(v_login_res->'profiles'), v_login_res;
    END IF;

    -- 4. Verify session switching succeeds to linked family profile
    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    v_switch_res := public.switch_customer_profile_session(v_token_hash, v_c2_id);
    IF NOT (v_switch_res->>'success')::boolean OR (v_switch_res->>'customer_id')::uuid <> v_c2_id THEN
        RAISE EXCEPTION 'Test 8 Failed: Profile switch to authorized family profile failed: %', v_switch_res;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 9: Authorization revocation immediately blocks subsequent profile switching (42501)', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500010';
    v_token_hash VARCHAR(64) := '9999999999999999999999999999999999999999999999999999999999999999';
    v_switch_res JSONB;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Revoke Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Revoke Customer 2', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-RVK-01', 'Revoke Customer 1', v_phone),
        (v_c2_id, 'RJ2026-RVK-02', 'Revoke Customer 2', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('Pass1234', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('Pass5678', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- Link profiles
    PERFORM public.link_customer_family_profiles(
        p_customer_id_1 := v_c1_id,
        p_customer_id_2 := v_c2_id,
        p_consent_confirmed := TRUE,
        p_relationship := 'FAMILY_MEMBER'
    );

    -- Create session and verify switch succeeds
    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    v_switch_res := public.switch_customer_profile_session(v_token_hash, v_c2_id);
    IF NOT (v_switch_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 9 Failed: Profile switch should succeed while linked';
    END IF;

    -- Unlink profiles
    PERFORM public.unlink_customer_family_profiles(v_c1_id, v_c2_id);

    -- Subsequent switch MUST fail with 42501
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c2_id);
        RAISE EXCEPTION 'Test 9 Failed: Profile switch after unlinking unexpectedly succeeded';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        -- Expected
    END;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 10: Independent customer credentials, failed login attempts, and account lockouts remain strictly isolated', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := gen_random_uuid();
    v_c2_id UUID := gen_random_uuid();
    v_phone TEXT := '9876500011';
    v_login_res JSONB;
    v_c1_lock TIMESTAMPTZ;
    v_c2_lock TIMESTAMPTZ;
    v_i INTEGER;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Isolated Customer A', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Isolated Customer B', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-LCK-02', 'Isolated Customer A', v_phone),
        (v_c2_id, 'RJ2026-LCK-03', 'Isolated Customer B', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts) VALUES
        (v_c1_id, extensions.crypt('PassAAA', extensions.gen_salt('bf', 10)), 'ACTIVE', 0),
        (v_c2_id, extensions.crypt('PassBBB', extensions.gen_salt('bf', 10)), 'ACTIVE', 0);

    -- Fail login specifically targeting Customer A 5 times using customer_identifier
    FOR v_i IN 1..5 LOOP
        v_login_res := public.customer_password_login(v_phone, 'WrongPassword', 'RJ2026-LCK-02');
    END LOOP;

    -- Verify Customer A is locked, but Customer B is NOT locked
    SELECT locked_until INTO v_c1_lock FROM public.customer_auth WHERE customer_id = v_c1_id;
    SELECT locked_until INTO v_c2_lock FROM public.customer_auth WHERE customer_id = v_c2_id;

    IF v_c1_lock IS NULL OR v_c1_lock <= clock_timestamp() THEN
        RAISE EXCEPTION 'Test 10 Failed: Customer A was not locked after 5 failed attempts';
    END IF;

    IF v_c2_lock IS NOT NULL THEN
        RAISE EXCEPTION 'Test 10 Failed: Customer B was locked due to Customer A failed attempts (isolation breach)';
    END IF;

    -- Customer B must still be able to log in successfully
    v_login_res := public.customer_password_login(v_phone, 'PassBBB', 'RJ2026-LCK-03');
    IF NOT (v_login_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 10 Failed: Customer B could not log in while Customer A is locked: %', v_login_res;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Test 11: Standard 11-parameter registration succeeds and creates an independent profile without touching family authorization', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID;
    v_phone TEXT := '9876500012';
    v_res JSONB;
    v_cust_id UUID;
    v_auth_count INTEGER;
BEGIN
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1;
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_res := public.create_customer_with_scheme(
        p_full_name := 'Clean Standard Customer',
        p_phone_number := v_phone,
        p_address := '456 Main St',
        p_city := 'Dindigul',
        p_pincode := '624001',
        p_alternate_phone := NULL,
        p_nominee_name := 'Nominee Name',
        p_nominee_relationship := 'Spouse',
        p_notes := 'Testing clean 11-param registration',
        p_enroll_scheme := TRUE,
        p_start_month := '2026-11-01'::DATE
    );

    IF NOT (v_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Test 11 Failed: 11-param customer creation failed: %', v_res;
    END IF;

    v_cust_id := (v_res->>'customer_id')::uuid;

    -- Confirm no authorization records exist for this customer
    SELECT count(*) INTO v_auth_count
    FROM public.customer_profile_authorizations
    WHERE grantor_customer_id = v_cust_id OR grantee_customer_id = v_cust_id;

    IF v_auth_count <> 0 THEN
        RAISE EXCEPTION 'Test 11 Failed: Unexpected authorization records created for standard customer';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Post-check: Verify baseline database record counts remain 100% unchanged', () => {
  const postBaseline = getDatabaseBaseline();
  assert.deepEqual(postBaseline, initialBaseline, 'Database counts must return exactly to baseline');
});
