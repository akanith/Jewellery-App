import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

/**
 * Stage 8 — Shared-Phone Database & Authorization Integration Tests
 *
 * Executes real PostgreSQL RPCs, RLS, and constraints against the local Supabase container.
 * Every test runs inside a STRICT TRANSACTION (BEGIN ... ROLLBACK) to guarantee zero data alteration.
 * Synthetic test fixtures use dedicated UUID range a0000000-0000-0000-0000-* and code prefix RJ2026-SYNTH-*.
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
  'payment_total', (SELECT coalesce(sum(amount), 0) FROM public.payments),
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

test('Pre-check: Verify local database connection and baseline record counts', () => {
  const baseline = initialBaseline;
  assert.ok(typeof baseline.customers === 'number', 'Database must return valid counts');
  assert.ok(baseline.customers >= 1, 'Baseline customer count must be at least 1');
});

test('Case 1: Two synthetic customer records can have distinct UUIDs and customer codes while sharing a phone number', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_phone TEXT := '9990001111';
    v_c1_code TEXT := 'RJ2026-SYNTH-001';
    v_c2_code TEXT := 'RJ2026-SYNTH-002';
    v_cnt INTEGER;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, v_c1_code, 'Synthetic Customer 1', v_phone),
        (v_c2_id, v_c2_code, 'Synthetic Customer 2', v_phone);

    SELECT count(*) INTO v_cnt FROM public.customers WHERE phone_number = v_phone;
    IF v_cnt <> 2 THEN
        RAISE EXCEPTION 'Case 1 Failed: Expected 2 customers with shared phone, got %', v_cnt;
    END IF;

    IF v_c1_id = v_c2_id OR v_c1_code = v_c2_code THEN
        RAISE EXCEPTION 'Case 1 Failed: UUIDs or customer codes collided';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 2: A customer authenticating under a shared mobile number receives authorization for all profiles under that mobile number, but NOT for a customer with a different mobile number', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_c_stranger UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;
    v_phone TEXT := '9990001111';
    v_stranger_phone TEXT := '9990002222';
    v_login_res JSONB;
    v_profiles_count INTEGER;
    v_auth_bool BOOLEAN;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone, TRUE),
        (v_c_stranger, 'Stranger Customer', 'CUSTOMER', v_stranger_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone),
        (v_c2_id, 'RJ2026-SYNTH-002', 'Synthetic Customer 2', v_phone),
        (v_c_stranger, 'RJ2026-SYNTH-003', 'Stranger Customer', v_stranger_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('PassB123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c_stranger, extensions.crypt('PassC123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- Log in as Customer 1
    v_login_res := public.customer_password_login(v_phone, 'PassA123');
    IF NOT (v_login_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Case 2 Failed: Login failed: %', v_login_res;
    END IF;

    IF (v_login_res->>'customer_id')::uuid <> v_c1_id THEN
        RAISE EXCEPTION 'Case 2 Failed: Authenticated customer_id mismatch: %', v_login_res;
    END IF;

    -- Under Rule A: Both C1 and C2 belong to shared phone group
    v_profiles_count := jsonb_array_length(v_login_res->'profiles');
    IF v_profiles_count <> 2 THEN
        RAISE EXCEPTION 'Case 2 Failed: Expected exactly 2 profiles in login result, got %: %', v_profiles_count, v_login_res->'profiles';
    END IF;

    -- Verify RPC authorization function evaluates to TRUE for shared phone profile
    v_auth_bool := public.is_customer_authorized_for_profile(v_c1_id, v_c2_id);
    IF NOT v_auth_bool THEN
        RAISE EXCEPTION 'Case 2 Failed: is_customer_authorized_for_profile returned false for shared-phone customer';
    END IF;

    -- Verify RPC authorization function evaluates to FALSE for stranger on different phone
    v_auth_bool := public.is_customer_authorized_for_profile(v_c1_id, v_c_stranger);
    IF v_auth_bool THEN
        RAISE EXCEPTION 'Case 2 Failed: is_customer_authorized_for_profile returned true for unlinked stranger on different phone';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 3: Profile switching to an unauthorized stranger UUID outside the mobile group is rejected with 42501', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c_stranger UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_phone TEXT := '9990001111';
    v_stranger_phone TEXT := '9990002222';
    v_token_hash VARCHAR(64) := '3333333333333333333333333333333333333333333333333333333333333333';
    v_caught_exception BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c_stranger, 'Stranger Customer', 'CUSTOMER', v_stranger_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone),
        (v_c_stranger, 'RJ2026-SYNTH-002', 'Stranger Customer', v_stranger_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c_stranger, extensions.crypt('PassB123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    -- Attempt profile switch to stranger customer
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c_stranger);
    EXCEPTION WHEN SQLSTATE '42501' THEN
        v_caught_exception := TRUE;
    END;

    IF NOT v_caught_exception THEN
        RAISE EXCEPTION 'Case 3 Failed: switch_customer_profile_session did NOT reject unauthorized switch with 42501';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 4: An explicit, valid authorization record permits cross-phone profile selection', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_c3_id UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;
    v_phone1 TEXT := '9990001111';
    v_phone2 TEXT := '9990002222';
    v_phone3 TEXT := '9990003333';
    v_token_hash VARCHAR(64) := '4444444444444444444444444444444444444444444444444444444444444444';
    v_switch_res JSONB;
    v_login_res JSONB;
    v_profiles_count INTEGER;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone1, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone2, TRUE),
        (v_c3_id, 'Synthetic Customer 3', 'CUSTOMER', v_phone3, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone1),
        (v_c2_id, 'RJ2026-SYNTH-002', 'Synthetic Customer 2', v_phone2),
        (v_c3_id, 'RJ2026-SYNTH-003', 'Synthetic Customer 3', v_phone3);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('PassB123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c3_id, extensions.crypt('PassC123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- Explicit authorization link between C1 and C2 (bidirectional across different phones)
    INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by) VALUES
        (v_c1_id, v_c2_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
        (v_c2_id, v_c1_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED');

    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    -- 1. Switch to authorized C2
    v_switch_res := public.switch_customer_profile_session(v_token_hash, v_c2_id);
    IF NOT (v_switch_res->>'success')::boolean OR (v_switch_res->>'customer_id')::uuid <> v_c2_id THEN
        RAISE EXCEPTION 'Case 4 Failed: Authorized switch to C2 failed: %', v_switch_res;
    END IF;

    -- 2. Verify login returns both C1 and C2, but NOT C3
    v_login_res := public.customer_password_login(v_phone1, 'PassA123');
    v_profiles_count := jsonb_array_length(v_login_res->'profiles');
    IF v_profiles_count <> 2 THEN
        RAISE EXCEPTION 'Case 4 Failed: Expected 2 profiles in login result, got %: %', v_profiles_count, v_login_res;
    END IF;

    -- 3. Verify attempt to switch to unauthorized C3 fails with 42501
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c3_id);
        RAISE EXCEPTION 'Case 4 Failed: Switch to unlinked C3 unexpectedly succeeded';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        -- Expected
    END;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 5: Revoking that authorization blocks subsequent profile switching', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_phone1 TEXT := '9990001111';
    v_phone2 TEXT := '9990002222';
    v_token_hash VARCHAR(64) := '5555555555555555555555555555555555555555555555555555555555555555';
    v_caught_exception BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone1, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone2, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone1),
        (v_c2_id, 'RJ2026-SYNTH-002', 'Synthetic Customer 2', v_phone2);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE'),
        (v_c2_id, extensions.crypt('PassB123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by) VALUES
        (v_c1_id, v_c2_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
        (v_c2_id, v_c1_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED');

    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    -- Revoke authorization
    UPDATE public.customer_profile_authorizations
    SET is_active = FALSE, updated_at = clock_timestamp()
    WHERE (grantor_customer_id = v_c1_id AND grantee_customer_id = v_c2_id)
       OR (grantor_customer_id = v_c2_id AND grantee_customer_id = v_c1_id);

    -- Subsequent profile switch must be rejected with 42501
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c2_id);
    EXCEPTION WHEN SQLSTATE '42501' THEN
        v_caught_exception := TRUE;
    END;

    IF NOT v_caught_exception THEN
        RAISE EXCEPTION 'Case 5 Failed: switch after authorization revocation was NOT rejected';
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 6: One customer with several schemes is treated as one customer profile, not as multiple family members', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_phone TEXT := '9990001111';
    v_login_res JSONB;
    v_profiles_count INTEGER;
    v_scheme_count INTEGER;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE');

    -- Enroll 3 schemes in slots 1, 2, 3
    INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, start_month, end_month) VALUES
        (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-SYNTH1', 1, 'ACTIVE', '2026-10-01', '2027-09-01'),
        (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-SYNTH2', 2, 'ACTIVE', '2026-10-01', '2027-09-01'),
        (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-SYNTH3', 3, 'ACTIVE', '2026-10-01', '2027-09-01');

    v_login_res := public.customer_password_login(v_phone, 'PassA123');
    v_profiles_count := jsonb_array_length(v_login_res->'profiles');
    IF v_profiles_count <> 1 THEN
        RAISE EXCEPTION 'Case 6 Failed: Expected 1 profile for customer with multiple schemes, got %', v_profiles_count;
    END IF;

    v_scheme_count := (v_login_res->'profiles'->0->>'scheme_count')::integer;
    IF v_scheme_count <> 3 THEN
        RAISE EXCEPTION 'Case 6 Failed: Expected scheme_count = 3, got %', v_scheme_count;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 7: Invalid credentials return the expected safe response and do not reveal password hashes', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_phone TEXT := '9990001111';
    v_res1 JSONB;
    v_res2 JSONB;
    v_res3 JSONB;
    v_attempts INTEGER;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone);

    INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts) VALUES
        (v_c1_id, extensions.crypt('PassA123', extensions.gen_salt('bf', 10)), 'ACTIVE', 0);

    -- 1. Wrong password
    v_res1 := public.customer_password_login(v_phone, 'WrongPassword');
    IF (v_res1->>'success')::boolean OR v_res1->>'error' <> 'INVALID_CREDENTIALS' THEN
        RAISE EXCEPTION 'Case 7 Failed: Unexpected response on wrong password: %', v_res1;
    END IF;

    IF v_res1 ? 'password_hash' OR v_res1 ? 'password' OR v_res1::text ILIKE '%crypt%' THEN
        RAISE EXCEPTION 'Case 7 Failed: Response exposed password hash: %', v_res1;
    END IF;

    -- Check failed attempt counter
    SELECT failed_login_attempts INTO v_attempts FROM public.customer_auth WHERE customer_id = v_c1_id;
    IF v_attempts <> 1 THEN
        RAISE EXCEPTION 'Case 7 Failed: Expected failed_login_attempts = 1, got %', v_attempts;
    END IF;

    -- 2. Non-existent phone
    v_res2 := public.customer_password_login('9998887777', 'AnyPassword');
    IF (v_res2->>'success')::boolean OR v_res2->>'error' <> 'INVALID_CREDENTIALS' THEN
        RAISE EXCEPTION 'Case 7 Failed: Unexpected response on non-existent phone: %', v_res2;
    END IF;

    -- 3. Empty input
    v_res3 := public.customer_password_login('', '');
    IF (v_res3->>'success')::boolean OR v_res3->>'error' <> 'INVALID_CREDENTIALS' THEN
        RAISE EXCEPTION 'Case 7 Failed: Unexpected response on empty input: %', v_res3;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 8: Existing uniqueness and foreign-key constraints remain effective', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_phone TEXT := '9990001111';
    v_caught BOOLEAN;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone);

    -- 1. Duplicate customer code must violate unique constraint
    v_caught := FALSE;
    BEGIN
        INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
            (v_c2_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 2', v_phone);
    EXCEPTION WHEN unique_violation THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN RAISE EXCEPTION 'Case 8 Failed: Duplicate customer_code was NOT rejected'; END IF;

    -- 2. Self authorization must violate check constraint
    v_caught := FALSE;
    BEGIN
        INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id) VALUES
            (v_c1_id, v_c1_id);
    EXCEPTION WHEN check_violation THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN RAISE EXCEPTION 'Case 8 Failed: Self authorization was NOT rejected'; END IF;

    -- 3. Scheme slot > 5 must violate check constraint
    v_caught := FALSE;
    BEGIN
        INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, start_month, end_month) VALUES
            (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-INV-SLOT', 6, 'ACTIVE', '2026-10-01', '2027-09-01');
    EXCEPTION WHEN check_violation THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN RAISE EXCEPTION 'Case 8 Failed: Scheme slot 6 was NOT rejected'; END IF;

    -- 4. Duplicate open scheme in slot 1 must violate partial unique index
    INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, start_month, end_month) VALUES
        (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-SLOT1-A', 1, 'ACTIVE', '2026-10-01', '2027-09-01');

    v_caught := FALSE;
    BEGIN
        INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, status, start_month, end_month) VALUES
            (gen_random_uuid(), v_c1_id, 'RJ-SCH-2026-SLOT1-B', 1, 'ACTIVE', '2026-10-01', '2027-09-01');
    EXCEPTION WHEN unique_violation THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN RAISE EXCEPTION 'Case 8 Failed: Duplicate open slot was NOT rejected'; END IF;

    -- 5. Foreign key to non-existent customer must violate foreign key constraint
    v_caught := FALSE;
    BEGIN
        INSERT INTO public.customer_auth (customer_id, password_hash) VALUES
            ('a0000000-0000-0000-0000-000000000099'::uuid, 'hash');
    EXCEPTION WHEN foreign_key_violation THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN RAISE EXCEPTION 'Case 8 Failed: customer_auth FK violation was NOT caught'; END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 9: Session verification preserves authenticated root identity and never widens profile access merely because the phone is shared', () => {
  const sql = `
DO $test$
DECLARE
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_c3_id UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;
    v_phone TEXT := '9990001111';
    v_stranger_phone TEXT := '9990002222';
    v_token_hash VARCHAR(64) := '9999999999999999999999999999999999999999999999999999999999999999';
    v_rec RECORD;
    v_switch_res JSONB;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone, TRUE),
        (v_c3_id, 'Synthetic Customer 3', 'CUSTOMER', v_stranger_phone, TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone),
        (v_c2_id, 'RJ2026-SYNTH-002', 'Synthetic Customer 2', v_phone),
        (v_c3_id, 'RJ2026-SYNTH-003', 'Synthetic Customer 3', v_stranger_phone);

    INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by) VALUES
        (v_c1_id, v_c2_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
        (v_c2_id, v_c1_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED');

    -- Create session anchored to root C1
    INSERT INTO public.customer_sessions (id, customer_id, authenticated_root_id, token_hash, expires_at) VALUES
        (gen_random_uuid(), v_c1_id, v_c1_id, v_token_hash, clock_timestamp() + interval '30 days');

    -- Switch session to C2
    v_switch_res := public.switch_customer_profile_session(v_token_hash, v_c2_id);

    -- Verify session via verify_customer_session
    SELECT * INTO v_rec FROM public.verify_customer_session(v_token_hash);
    IF v_rec.customer_id <> v_c2_id THEN
        RAISE EXCEPTION 'Case 9 Failed: Active customer_id expected C2, got %', v_rec.customer_id;
    END IF;

    IF v_rec.authenticated_root_id <> v_c1_id THEN
        RAISE EXCEPTION 'Case 9 Failed: authenticated_root_id expected C1, got %', v_rec.authenticated_root_id;
    END IF;

    -- Attempt to switch from C2 to C3 (stranger phone outside mobile group, unauthorized for root C1)
    BEGIN
        PERFORM public.switch_customer_profile_session(v_token_hash, v_c3_id);
        RAISE EXCEPTION 'Case 9 Failed: Switch to C3 unexpectedly succeeded from delegate session';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        -- Expected
    END;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Case 10: Family profile linking and unlinking RPCs enforce admin authorization and update mappings', () => {
  const sql = `
DO $test$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000099'::uuid;
    v_c1_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_c2_id UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    v_phone TEXT := '9990001111';
    v_res JSONB;
    v_cnt INTEGER;
    v_caught BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone_number, is_active) VALUES
        (v_c1_id, 'Synthetic Customer 1', 'CUSTOMER', v_phone, TRUE),
        (v_c2_id, 'Synthetic Customer 2', 'CUSTOMER', v_phone, TRUE),
        (v_admin_id, 'Synthetic Admin', 'ADMIN', '9990009999', TRUE);

    INSERT INTO public.customers (id, customer_code, full_name, phone_number) VALUES
        (v_c1_id, 'RJ2026-SYNTH-001', 'Synthetic Customer 1', v_phone),
        (v_c2_id, 'RJ2026-SYNTH-002', 'Synthetic Customer 2', v_phone);

    INSERT INTO public.admin_users (id, employee_code, role_title, permissions, is_super_admin) VALUES
        (v_admin_id, 'EMP-SYNTH-99', 'Admin', '{"all": true}'::jsonb, FALSE);

    -- 1. Attempt linking without admin session -> MUST FAIL
    BEGIN
        PERFORM public.link_customer_family_profiles(v_c1_id, v_c2_id, 'FAMILY_MEMBER', 'Unauthorized attempt');
    EXCEPTION WHEN OTHERS THEN
        v_caught := TRUE;
    END;
    IF NOT v_caught THEN
        RAISE EXCEPTION 'Case 10 Failed: link_customer_family_profiles without admin was NOT rejected';
    END IF;

    -- 2. Set admin session
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

    -- 3. Execute link with admin authorization
    v_res := public.link_customer_family_profiles(v_c1_id, v_c2_id, 'FAMILY_MEMBER', 'Authorized test link');
    IF NOT (v_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Case 10 Failed: link_customer_family_profiles failed under admin: %', v_res;
    END IF;

    SELECT count(*) INTO v_cnt FROM public.customer_profile_authorizations WHERE is_active = TRUE AND grantor_customer_id IN (v_c1_id, v_c2_id);
    IF v_cnt <> 2 THEN
        RAISE EXCEPTION 'Case 10 Failed: Expected 2 active bidirectional records, got %', v_cnt;
    END IF;

    -- 4. Execute unlink with admin authorization
    v_res := public.unlink_customer_family_profiles(v_c1_id, v_c2_id);
    IF NOT (v_res->>'success')::boolean THEN
        RAISE EXCEPTION 'Case 10 Failed: unlink_customer_family_profiles failed under admin: %', v_res;
    END IF;

    SELECT count(*) INTO v_cnt FROM public.customer_profile_authorizations WHERE is_active = TRUE AND grantor_customer_id IN (v_c1_id, v_c2_id);
    IF v_cnt <> 0 THEN
        RAISE EXCEPTION 'Case 10 Failed: Expected 0 active records after unlinking, got %', v_cnt;
    END IF;
END $test$;
`;
  runInRollbackTransaction(sql);
});

test('Post-check: Verify baseline row counts are 100% unchanged after all integration tests', () => {
  const finalState = getDatabaseBaseline();
  assert.deepEqual(finalState, initialBaseline, 'Final database state must match pre-check baseline 100%');
});
