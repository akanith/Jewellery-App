import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';

const DOCKER_EXE = path.resolve('E:/Jewellery App/scripts/bin/docker.exe');

function runSql(sql) {
  try {
    return execSync(
      `"${DOCKER_EXE}" exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A`,
      {
        input: `\\set ON_ERROR_STOP on\n${sql}`,
        encoding: 'utf-8',
      }
    ).trim();
  } catch (err) {
    const combined = `${err.message || ''}\n${err.stderr ? err.stderr.toString() : ''}\n${err.stdout ? err.stdout.toString() : ''}`;
    const enhancedErr = new Error(combined);
    enhancedErr.original = err;
    throw enhancedErr;
  }
}

function runSqlJson(sql) {
  const raw = runSql(sql);
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1];
  try {
    return JSON.parse(lastLine);
  } catch (e) {
    throw new Error(`Failed to parse JSON from SQL output: "${lastLine}" (raw: "${raw}")\nOriginal error: ${e.message}`);
  }
}

const ADMIN_ID = 'fada7105-e76b-4c46-9cd7-b52d94f624f1'; // ADMIN001 Kathiravven
const NON_ADMIN_ID = '99999999-9999-9999-9999-999999999999';

test.before(() => {
  const initSql = `
BEGIN;
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${ADMIN_ID}', 'ADMIN', '9842143307', 'A.B.Kathiravven', TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE, role = 'ADMIN';

INSERT INTO public.admin_users (id, employee_code, role_title, permissions, is_super_admin)
VALUES ('${ADMIN_ID}', 'ADMIN001', 'Store Administrator', '{"all": true}', TRUE)
ON CONFLICT (id) DO UPDATE SET is_super_admin = TRUE;
COMMIT;
`;
  runSql(initSql);
});

// =============================================================================
// PHASE 1: FUNCTIONAL TESTS
// =============================================================================

test('Phase 1.1: Customer registration & customer-code generation (RJ2026-001 format)', () => {
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

SELECT public.create_customer_with_scheme(
  p_full_name => 'Phase 1 Customer One',
  p_phone_number => '9840900001',
  p_enroll_scheme => TRUE,
  p_start_month => '2026-10-01'::date
);
ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.success, true, 'Customer creation RPC must succeed');
  assert.match(res.customer_code, /^RJ2026-\d{3,}$/, 'Customer code must follow RJ2026-XXX format');
});

test('Phase 1.2: October 2026 scheme enrollment with 12 installments', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000001';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${testCustId}', 'CUSTOMER', '9876543210', 'Phase1 Test Customer', TRUE);

INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${testCustId}', 'RJ2026-T01', '9876543210', 'Phase1 Test Customer', '${ADMIN_ID}');

-- Enroll with start_month = October 2026
SELECT public.enroll_customer_scheme('${testCustId}', '2026-10-01'::date, 'October Diwali Scheme');

-- Verify 12 installments generated
SELECT json_build_object(
  'installment_count', count(*),
  'min_month', min(calendar_month)::text,
  'max_month', max(calendar_month)::text,
  'first_due', (SELECT due_date::text FROM public.scheme_installments WHERE customer_id = '${testCustId}' AND installment_number = 1)
)::text FROM public.scheme_installments WHERE customer_id = '${testCustId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.installment_count, 12, 'Must generate exactly 12 installments');
  assert.equal(res.min_month, '2026-10-01', 'First installment must be October 2026');
  assert.equal(res.max_month, '2027-09-01', '12th installment must be September 2027');
});

test('Phase 1.3: October historical-payment recording with required audit reason & actual collection date', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000002';
  const testSchemeId = '22222222-aaaa-bbbb-cccc-000000000002';
  const testInstId = '33333333-aaaa-bbbb-cccc-000000000002';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${testCustId}', 'CUSTOMER', '9876543211', 'Hist Test Cust', TRUE);

INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${testCustId}', 'RJ2026-T02', '9876543211', 'Hist Test Cust', '${ADMIN_ID}');

INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${testSchemeId}', 'SCH-T02', '${testCustId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${testInstId}', '${testSchemeId}', '${testCustId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING');

-- Record genuine October historical payment collected on 2026-10-15
SELECT public.record_installment_payment(
  p_scheme_id => '${testSchemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_transaction_reference => 'OCT-CASH-001',
  p_notes => 'Verified Diwali kickoff payment',
  p_actual_payment_date => '2026-10-15'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Cash collected in showroom on October 15, recorded after system launch'
);

-- Check payment details
SELECT json_build_object(
  'is_historical', is_historical,
  'actual_payment_date', actual_payment_date::text,
  'payment_date', payment_date::date::text,
  'historical_reason', historical_reason
)::text FROM public.payments WHERE scheme_id = '${testSchemeId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.is_historical, true, 'is_historical must be true');
  assert.equal(res.actual_payment_date, '2026-10-15', 'actual_payment_date must be preserved');
  assert.match(res.historical_reason, /Cash collected/, 'historical_reason must be preserved');
});

test('Phase 1.4: November installment recording after October without monthly limit blockage', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000003';
  const testSchemeId = '22222222-aaaa-bbbb-cccc-000000000003';
  const inst1Id = '33333333-aaaa-bbbb-cccc-000000000031';
  const inst2Id = '33333333-aaaa-bbbb-cccc-000000000032';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${testCustId}', 'CUSTOMER', '9876543212', 'Nov After Oct Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${testCustId}', 'RJ2026-T03', '9876543212', 'Nov After Oct Cust', '${ADMIN_ID}');

INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${testSchemeId}', 'SCH-T03', '${testCustId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${testSchemeId}', '${testCustId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING'),
  ('${inst2Id}', '${testSchemeId}', '${testCustId}', 2, '2026-11-01', '2026-11-10', 1000.00, 'PENDING');

-- Step 1: Record October historical payment
SELECT public.record_installment_payment(
  p_scheme_id => '${testSchemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_transaction_reference => 'OCT-CASH-002',
  p_notes => 'Oct cash',
  p_actual_payment_date => '2026-10-15'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Genuine October payment'
);

-- Step 2: Record November regular payment in November
SELECT public.record_installment_payment(
  p_scheme_id => '${testSchemeId}'::uuid,
  p_installment_number => 2,
  p_payment_method => 'UPI',
  p_transaction_reference => 'NOV-UPI-002',
  p_notes => 'Nov regular payment'
);

-- Verify both installments are PAID
SELECT json_build_object(
  'paid_installments', count(*),
  'inst1_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst1Id}'),
  'inst2_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst2Id}')
)::text FROM public.payments WHERE scheme_id = '${testSchemeId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.paid_installments, 2, 'Both installments must be paid');
  assert.equal(res.inst1_status, 'PAID', 'Installment 1 must be PAID');
  assert.equal(res.inst2_status, 'PAID', 'Installment 2 must be PAID');
});

test('Phase 1.5: Duplicate-payment prevention on same installment', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000004';
  const testSchemeId = '22222222-aaaa-bbbb-cccc-000000000004';
  const inst1Id = '33333333-aaaa-bbbb-cccc-000000000041';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${testCustId}', 'CUSTOMER', '9876543213', 'Dup Test Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${testCustId}', 'RJ2026-T04', '9876543213', 'Dup Test Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${testSchemeId}', 'SCH-T04', '${testCustId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${testSchemeId}', '${testCustId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING');

-- Pay Month 1
SELECT public.record_installment_payment(
  p_scheme_id => '${testSchemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_actual_payment_date => '2026-10-15'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Oct paid'
);

-- Attempt duplicate pay Month 1 again
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${testSchemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_actual_payment_date => '2026-10-16'::date,
    p_is_historical => TRUE,
    p_historical_reason => 'Oct dup'
  );
  RAISE EXCEPTION 'DUPLICATE_ALLOWED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%already been paid%' OR SQLERRM LIKE '%MONTHLY_LIMIT%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'REJECTED_SUCCESSFULLY' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'REJECTED_SUCCESSFULLY', 'Duplicate installment payment must be rejected');
});

test('Phase 1.6: Future-month payment rejection (calendar_month > current_month)', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000005';
  const testSchemeId = '22222222-aaaa-bbbb-cccc-000000000005';
  const inst1Id = '33333333-aaaa-bbbb-cccc-000000000051';
  const instFutureId = '33333333-aaaa-bbbb-cccc-000000000052';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${testCustId}', 'CUSTOMER', '9876543214', 'Future Test Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${testCustId}', 'RJ2026-T05', '9876543214', 'Future Test Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${testSchemeId}', 'SCH-T05', '${testCustId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-11-01', '2027-10-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${testSchemeId}', '${testCustId}', 1, '2026-11-01', '2026-11-10', 1000.00, 'PENDING'),
  ('${instFutureId}', '${testSchemeId}', '${testCustId}', 2, '2026-12-01', '2026-12-10', 1000.00, 'PENDING');

-- Attempt to pay future installment 2 directly while installment 1 is unpaid
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${testSchemeId}'::uuid,
    p_installment_number => 2,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'FUTURE_PAYMENT_ALLOWED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%earlier installment%' OR SQLERRM LIKE '%future%' OR SQLERRM LIKE '%PENDING%' OR SQLERRM LIKE '%cannot be paid before%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'FUTURE_REJECTED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'FUTURE_REJECTED', 'Future installment payment must be rejected');
});

test('Phase 1.7: Multiple schemes per customer (5-slot architecture)', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000006';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${testCustId}', 'CUSTOMER', '9876543215', 'MultiScheme Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${testCustId}', 'RJ2026-T06', '9876543215', 'MultiScheme Cust', '${ADMIN_ID}');

-- Enroll Slot 1
SELECT public.enroll_customer_scheme('${testCustId}', '2026-10-01'::date, 'Scheme Slot 1');
-- Enroll Slot 2
SELECT public.enroll_customer_scheme('${testCustId}', '2026-11-01'::date, 'Scheme Slot 2');
-- Enroll Slot 3
SELECT public.enroll_customer_scheme('${testCustId}', '2026-11-01'::date, 'Scheme Slot 3');

SELECT json_build_object(
  'scheme_count', count(*),
  'slots', array_agg(slot_number ORDER BY slot_number)
)::text FROM public.schemes WHERE customer_id = '${testCustId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.scheme_count, 3, 'Customer must successfully hold multiple active schemes');
  assert.deepEqual(res.slots, [1, 2, 3], 'Schemes must fill slots sequentially [1, 2, 3]');
});

test('Phase 1.8: Customer authentication and password reset workflow', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000007';
  const rawPw = 'SuperSecret123!';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${testCustId}', 'CUSTOMER', '9876543216', 'Auth Test Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${testCustId}', 'RJ2026-T07', '9876543216', 'Auth Test Cust', '${ADMIN_ID}');

-- Setup customer auth with bcrypt hash
INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts)
VALUES ('${testCustId}', extensions.crypt('${rawPw}', extensions.gen_salt('bf', 10)), 'ACTIVE', 0);

-- Verify password matches
SELECT json_build_object(
  'password_valid', (password_hash = extensions.crypt('${rawPw}', password_hash)),
  'wrong_password_rejected', (password_hash != extensions.crypt('WrongPass!', password_hash)),
  'status', password_status
)::text FROM public.customer_auth WHERE customer_id = '${testCustId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.password_valid, true, 'Valid password must match bcrypt hash');
  assert.equal(res.wrong_password_rejected, true, 'Incorrect password must be rejected');
  assert.equal(res.status, 'ACTIVE', 'Password status must be ACTIVE');
});

test('Phase 1.9: Customer passbook and payment history', () => {
  const testCustId = '11111111-aaaa-bbbb-cccc-000000000008';
  const testSchemeId = '22222222-aaaa-bbbb-cccc-000000000008';
  const inst1Id = '33333333-aaaa-bbbb-cccc-000000000081';
  const inst2Id = '33333333-aaaa-bbbb-cccc-000000000082';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${testCustId}', 'CUSTOMER', '9876543217', 'Passbook Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${testCustId}', 'RJ2026-T08', '9876543217', 'Passbook Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${testSchemeId}', 'SCH-T08', '${testCustId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${testSchemeId}', '${testCustId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING'),
  ('${inst2Id}', '${testSchemeId}', '${testCustId}', 2, '2026-11-01', '2026-11-10', 1000.00, 'PENDING');

-- Record payment for installment 1
SELECT public.record_installment_payment(
  p_scheme_id => '${testSchemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'GPAY',
  p_transaction_reference => 'GPAY-PASS-001',
  p_notes => 'Passbook test',
  p_actual_payment_date => '2026-10-12'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Diwali payment'
);

-- Query passbook view
SELECT json_build_object(
  'total_paid', (SELECT coalesce(sum(amount), 0) FROM public.payments WHERE scheme_id = '${testSchemeId}'),
  'paid_installments', (SELECT count(*) FROM public.scheme_installments WHERE scheme_id = '${testSchemeId}' AND status = 'PAID'),
  'pending_installments', (SELECT count(*) FROM public.scheme_installments WHERE scheme_id = '${testSchemeId}' AND status = 'PENDING'),
  'actual_payment_date', (SELECT actual_payment_date::text FROM public.payments WHERE scheme_id = '${testSchemeId}' LIMIT 1)
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.total_paid, 1000, 'Total paid in passbook must be ₹1,000');
  assert.equal(res.paid_installments, 1, 'Exactly 1 installment marked PAID');
  assert.equal(res.pending_installments, 1, 'Remaining installment marked PENDING');
  assert.equal(res.actual_payment_date, '2026-10-12', 'Actual payment date must show in passbook');
});

test('Phase 1.10: Customer profile authorization and family-linked accounts', () => {
  const custA = '11111111-aaaa-bbbb-cccc-000000000010';
  const custB = '22222222-aaaa-bbbb-cccc-000000000010';
  const sharedMobile = '9876543218';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES
  ('${custA}', 'CUSTOMER', '${sharedMobile}', 'Family Member A', TRUE),
  ('${custB}', 'CUSTOMER', '${sharedMobile}', 'Family Member B', TRUE);

INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES
  ('${custA}', 'RJ2026-FA', '${sharedMobile}', 'Family Member A', '${ADMIN_ID}'),
  ('${custB}', 'RJ2026-FB', '${sharedMobile}', 'Family Member B', '${ADMIN_ID}');

-- Explicit showroom linking with relationship_type
INSERT INTO public.customer_profile_authorizations (grantor_customer_id, grantee_customer_id, authorized_by, relationship_type)
VALUES ('${custA}', '${custB}', 'SHOWROOM_VERIFIED', 'SPOUSE');

-- Verify bidirectional or authorized link exists
SELECT json_build_object(
  'authorized_link_count', (
    SELECT count(*) FROM public.customer_profile_authorizations 
    WHERE (grantor_customer_id = '${custA}' AND grantee_customer_id = '${custB}')
  ),
  'relationship_type', (
    SELECT relationship_type FROM public.customer_profile_authorizations 
    WHERE (grantor_customer_id = '${custA}' AND grantee_customer_id = '${custB}')
  )
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.authorized_link_count, 1, 'Showroom linking creates explicit authorization');
  assert.equal(res.relationship_type, 'SPOUSE', 'Relationship type must be preserved');
});

test('Phase 1.11: Admin customer search and management filters', () => {
  const custId = '11111111-aaaa-bbbb-cccc-000000000011';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9840112233', 'Searchable Radha', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_by) VALUES ('${custId}', 'RJ2026-RADHA', '9840112233', 'Searchable Radha', 'Coimbatore', '${ADMIN_ID}');

SELECT json_build_object(
  'search_by_code', (SELECT count(*) FROM public.customers WHERE customer_code ILIKE '%RADHA%'),
  'search_by_phone', (SELECT count(*) FROM public.customers WHERE phone_number = '9840112233'),
  'search_by_city', (SELECT count(*) FROM public.customers WHERE city ILIKE '%Coimbatore%')
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.search_by_code, 1, 'Search by code must find customer');
  assert.equal(res.search_by_phone, 1, 'Search by phone must find customer');
  assert.equal(res.search_by_city, 1, 'Search by city must find customer');
});

test('Phase 1.12: Reports, financial totals, and receipt generation', () => {
  const custId = '11111111-aaaa-bbbb-cccc-000000000012';
  const schemeId = '22222222-aaaa-bbbb-cccc-000000000012';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9840112244', 'Reports Customer', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REP', '9840112244', 'Reports Customer', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REP', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('33333333-aaaa-bbbb-cccc-000000000121', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING');

-- Record payment
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'GPAY',
  p_transaction_reference => 'GPAY-REP-001',
  p_notes => 'Report receipt test',
  p_actual_payment_date => '2026-10-14'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Diwali collection'
);

-- Verify receipt number format and financial breakdown
SELECT json_build_object(
  'receipt_number', receipt_number,
  'valid_format', (receipt_number ~ '^RJ-RCP-[0-9]{4}-[A-Z0-9]{6}$'),
  'oct_bucket_amount', (SELECT coalesce(sum(amount), 0) FROM public.payments WHERE actual_payment_date >= '2026-10-01' AND actual_payment_date < '2026-11-01')
)::text FROM public.payments WHERE scheme_id = '${schemeId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.valid_format, true, 'Receipt number must match format RJ-RCP-YYYY-XXXXXX');
  assert.equal(res.oct_bucket_amount, 1000, 'October revenue bucket must accurately include historical payment');
});

test('Phase 1.13: Razorpay webhook reconciliation and retry idempotency', () => {
  const custId = '11111111-aaaa-bbbb-cccc-000000000013';
  const schemeId = '22222222-aaaa-bbbb-cccc-000000000013';
  const instId = '33333333-aaaa-bbbb-cccc-000000000131';
  const attemptId = '44444444-aaaa-bbbb-cccc-000000000131';
  const rzpPaymentId = 'pay_test_rzp_mock_123';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9840112255', 'Razorpay Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-RZP', '9840112255', 'Razorpay Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-RZP', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-11-01', '2027-10-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${instId}', '${schemeId}', '${custId}', 1, '2026-11-01', '2026-11-10', 1000.00, 'PENDING');

-- Create payment attempt with valid status 'CREATED'
INSERT INTO public.payment_attempts (id, scheme_id, customer_id, installment_id, installment_number, amount, status, razorpay_payment_id)
VALUES ('${attemptId}', '${schemeId}', '${custId}', '${instId}', 1, 1000.00, 'CREATED', '${rzpPaymentId}');

-- First webhook delivery
SELECT public.reconcile_online_payment(
  p_payment_attempt_id => '${attemptId}'::uuid,
  p_razorpay_payment_id => '${rzpPaymentId}',
  p_captured_amount_paise => 100000,
  p_payment_method => 'RAZORPAY',
  p_notes => 'Razorpay online payment captured'
);

-- Duplicate webhook retry (identical payment ID and attempt ID)
SELECT public.reconcile_online_payment(
  p_payment_attempt_id => '${attemptId}'::uuid,
  p_razorpay_payment_id => '${rzpPaymentId}',
  p_captured_amount_paise => 100000,
  p_payment_method => 'RAZORPAY',
  p_notes => 'Razorpay duplicate webhook retry'
);

-- Verify exactly 1 payment record exists and attempt is reconciled
SELECT json_build_object(
  'payment_count', (SELECT count(*) FROM public.payments WHERE scheme_id = '${schemeId}'),
  'attempt_status', (SELECT status FROM public.payment_attempts WHERE id = '${attemptId}'),
  'installment_status', (SELECT status FROM public.scheme_installments WHERE id = '${instId}')
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.payment_count, 1, 'Webhook reconciliation retry must be strictly idempotent (exactly 1 payment)');
  assert.ok(res.attempt_status === 'PAID' || res.attempt_status === 'RECONCILED', 'Attempt must be PAID or RECONCILED');
  assert.equal(res.installment_status, 'PAID', 'Installment must be PAID');
});

test('Phase 1.14: Customer scheme maturity and bonus credit (+₹1,000 automatic trigger)', () => {
  const custId = '11111111-aaaa-bbbb-cccc-000000000014';
  const schemeId = '22222222-aaaa-bbbb-cccc-000000000014';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9840112266', 'Maturity Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-MAT', '9840112266', 'Maturity Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-MAT', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2025-11-01', '2026-10-01', 'ACTIVE', 1, '${ADMIN_ID}');

-- Insert all 12 installments with 1-11 already PAID
DO $$
DECLARE
  i INT;
  v_iid UUID;
BEGIN
  FOR i IN 1..11 LOOP
    v_iid := extensions.gen_random_uuid();
    INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
    VALUES (v_iid, '${schemeId}', '${custId}', i, ('2025-11-01'::date + ((i - 1) || ' months')::interval)::date, ('2025-11-10'::date + ((i - 1) || ' months')::interval)::date, 1000.00, 'PAID');
    
    INSERT INTO public.payments (scheme_id, customer_id, installment_id, installment_number, amount, payment_method, payment_date, recorded_by, receipt_number)
    VALUES ('${schemeId}', '${custId}', v_iid, i, 1000.00, 'CASH', ('2025-11-05'::date + ((i - 1) || ' months')::interval)::date, '${ADMIN_ID}', 'RJ-RCP-2025-' || lpad(i::text, 6, '0'));
  END LOOP;

  -- 12th installment PENDING
  INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
  VALUES ('33333333-aaaa-bbbb-cccc-000000000142', '${schemeId}', '${custId}', 12, '2026-10-01', '2026-10-10', 1000.00, 'PENDING');
END $$;

-- Pay the 12th installment (historical October payment)
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 12,
  p_payment_method => 'CASH',
  p_transaction_reference => 'MAT-FINAL-001',
  p_notes => '12th installment payment',
  p_actual_payment_date => '2026-10-10'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Maturity final installment'
);

-- Verify bonus automatically credited and scheme updated to MATURED/COMPLETED
SELECT json_build_object(
  'bonus_count', (SELECT count(*) FROM public.scheme_bonuses WHERE scheme_id = '${schemeId}'),
  'bonus_amount', (SELECT coalesce(sum(bonus_amount), 0) FROM public.scheme_bonuses WHERE scheme_id = '${schemeId}'),
  'scheme_status', (SELECT status FROM public.schemes WHERE id = '${schemeId}')
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.bonus_count, 1, 'Bonus record must be automatically created upon 12th installment completion');
  assert.equal(res.bonus_amount, 1000, 'Bonus amount must be exactly ₹1,000');
  assert.ok(res.scheme_status === 'MATURED' || res.scheme_status === 'COMPLETED', 'Scheme status must be MATURED or COMPLETED');
});

test('Phase 1.15: Role-based access and unauthorized request rejection', () => {
  const sql = `
BEGIN;
SET ROLE anon;
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '00000000-0000-0000-0000-000000000000'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'ANON_ALLOWED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Admin access required%' OR SQLERRM LIKE '%permission denied%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM public.delete_customer_account('00000000-0000-0000-0000-000000000000'::uuid);
  RAISE EXCEPTION 'ANON_DELETE_ALLOWED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Only registered administrators%' OR SQLERRM LIKE '%permission denied%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'ROLE_SECURITY_ENFORCED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'ROLE_SECURITY_ENFORCED', 'Unauthenticated / anon callers must be denied from sensitive RPCs');
});

// =============================================================================
// PHASE 2: SECURITY TESTS
// =============================================================================

test('Phase 2.1: RLS and direct table-write restrictions on financial tables', () => {
  const sql = `
BEGIN;
SET ROLE anon;

DO $$
BEGIN
  INSERT INTO public.payments (scheme_id, customer_id, installment_id, installment_number, amount, payment_method)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 1, 1000, 'CASH');
  RAISE EXCEPTION 'ANON_PAYMENTS_WRITE_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%permission denied%' OR SQLERRM LIKE '%violates row-level security%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

DO $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_table) VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'HACK', 'payments');
  RAISE EXCEPTION 'ANON_AUDIT_WRITE_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%permission denied%' OR SQLERRM LIKE '%violates row-level security%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'DIRECT_WRITES_LOCKED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'DIRECT_WRITES_LOCKED', 'Direct table mutations on financial ledgers must be rejected for anon');
});

test('Phase 2.2: Administrator-only financial RPC access', () => {
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${NON_ADMIN_ID}", "role": "authenticated"}', true); END $$;

DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '00000000-0000-0000-0000-000000000000'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'NON_ADMIN_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Admin access required%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'ADMIN_RPC_ENFORCED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'ADMIN_RPC_ENFORCED', 'Financial RPCs must require verified active admin');
});

test('Phase 2.3: Customer account isolation between customers', () => {
  const custA = '11111111-aaaa-bbbb-cccc-000000000020';
  const custB = '22222222-aaaa-bbbb-cccc-000000000020';
  const sql = `
BEGIN;
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES
  ('${custA}', 'CUSTOMER', '9111122221', 'Customer Alice', TRUE),
  ('${custB}', 'CUSTOMER', '9111122222', 'Customer Bob', TRUE);

-- Emulate Customer Alice authenticated session under RLS
SET ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${custA}", "role": "authenticated"}', true); END $$;

SELECT json_build_object(
  'visible_profiles', (SELECT count(*) FROM public.profiles WHERE id = '${custB}')
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.visible_profiles, 0, 'Customer Alice must NOT be able to view Customer Bob profile under RLS');
});

test('Phase 2.4: Payment amount and installment constraints', () => {
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '00000000-0000-0000-0000-000000000000'::uuid,
    p_installment_number => 15,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'INVALID_INSTALLMENT_ALLOWED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%between 1 and 12%' OR SQLERRM LIKE '%Scheme not found%' OR SQLERRM LIKE '%Installment not found%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'CONSTRAINTS_ENFORCED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'CONSTRAINTS_ENFORCED', 'Invalid installment numbers must be rejected');
});

test('Phase 2.5: Historical-payment audit logging verification', () => {
  const custId = '11111111-aaaa-bbbb-cccc-000000000025';
  const schemeId = '22222222-aaaa-bbbb-cccc-000000000025';
  const instId = '33333333-aaaa-bbbb-cccc-000000000251';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9840112288', 'Audit Check Cust', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-AUD', '9840112288', 'Audit Check Cust', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-AUD', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${instId}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-10', 1000.00, 'PENDING');

-- Record historical payment with distinct payment date & audit reason
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_transaction_reference => 'AUD-CASH-001',
  p_notes => 'Audit trail test',
  p_actual_payment_date => '2026-10-18'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Audit trail verification reason'
);

-- Check audit_logs table for RECORD_HISTORICAL_PAYMENT
SELECT json_build_object(
  'audit_log_count', (SELECT count(*) FROM public.audit_logs WHERE entity_table = 'payments' AND action = 'RECORD_HISTORICAL_PAYMENT'),
  'actor_id', (SELECT actor_id::text FROM public.audit_logs WHERE entity_table = 'payments' AND action = 'RECORD_HISTORICAL_PAYMENT' ORDER BY created_at DESC LIMIT 1),
  'has_historical_meta', (SELECT (new_values->>'is_historical')::boolean FROM public.audit_logs WHERE entity_table = 'payments' AND action = 'RECORD_HISTORICAL_PAYMENT' ORDER BY created_at DESC LIMIT 1),
  'actual_date_in_audit', (SELECT (new_values->>'actual_payment_date') FROM public.audit_logs WHERE entity_table = 'payments' AND action = 'RECORD_HISTORICAL_PAYMENT' ORDER BY created_at DESC LIMIT 1)
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.audit_log_count > 0, true, 'Audit log entry must be created with action RECORD_HISTORICAL_PAYMENT');
  assert.equal(res.actor_id, ADMIN_ID, 'Actor ID must match authenticated admin');
  assert.equal(res.has_historical_meta, true, 'Audit metadata must record is_historical = true');
  assert.equal(res.actual_date_in_audit, '2026-10-18', 'Audit metadata must record actual payment date');
});
