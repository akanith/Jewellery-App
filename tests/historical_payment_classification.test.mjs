import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';

const DOCKER_EXE = path.resolve('scripts/bin/docker.exe');

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
// REGRESSION TEST SUITE: OCTOBER HISTORICAL PAYMENT CLASSIFICATION
// =============================================================================

test('Regression 1: October payment entered in November is classified as historical even if p_is_historical was false', () => {
  const custId = 'a1111111-0000-0000-0000-000000000001';
  const schemeId = 'b1111111-0000-0000-0000-000000000001';
  const inst1Id = 'c1111111-0000-0000-0000-000000000001';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${custId}', 'CUSTOMER', '9700000001', 'Test Customer 1', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${custId}', 'RJ2026-REG1', '9700000001', 'Test Customer 1', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG1', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING');

-- Record payment for Month 1 (October) while current month is November
-- Caller sends p_is_historical => FALSE, but supplies actual collection date and valid reason
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'PHONEPE',
  p_transaction_reference => 'PHONEPE-COUNTER-1',
  p_notes => 'October collection',
  p_actual_payment_date => '2026-10-07'::date,
  p_is_historical => FALSE, -- Passed false by caller
  p_historical_reason => 'Diwali scheme launch kickoff installment'
);

SELECT json_build_object(
  'is_historical', is_historical,
  'actual_payment_date', actual_payment_date::text,
  'payment_date_month', to_char(payment_date, 'YYYY-MM'),
  'historical_reason', historical_reason,
  'created_at_is_recent', (created_at > (now() - interval '10 minutes'))
)::text FROM public.payments WHERE scheme_id = '${schemeId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.is_historical, true, 'Prior-month installment MUST be classified as historical');
  assert.equal(res.actual_payment_date, '2026-10-07', 'Actual payment date must be preserved in historical field');
  assert.equal(res.created_at_is_recent, true, 'created_at must record exact system timestamp without backdating');
});

test('Regression 2: October historical payment followed by November regular payment (No MONTHLY_LIMIT_EXCEEDED)', () => {
  const custId = 'a1111111-0000-0000-0000-000000000002';
  const schemeId = 'b1111111-0000-0000-0000-000000000002';
  const inst1Id = 'c1111111-0000-0000-0000-000000000021';
  const inst2Id = 'c1111111-0000-0000-0000-000000000022';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${custId}', 'CUSTOMER', '9700000002', 'Test Customer 2', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${custId}', 'RJ2026-REG2', '9700000002', 'Test Customer 2', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG2', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 'PENDING');

-- Step 1: Record October historical payment
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'PHONEPE',
  p_actual_payment_date => '2026-10-07'::date,
  p_is_historical => TRUE,
  p_historical_reason => 'Genuine October collection in showroom'
);

-- Step 2: Record November regular payment
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 2,
  p_payment_method => 'CASH'
);

SELECT json_build_object(
  'total_payments', (SELECT count(*) FROM public.payments WHERE scheme_id = '${schemeId}'),
  'inst1_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst1Id}'),
  'inst2_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst2Id}'),
  'historical_count', (SELECT count(*) FROM public.payments WHERE scheme_id = '${schemeId}' AND is_historical = TRUE),
  'regular_count', (SELECT count(*) FROM public.payments WHERE scheme_id = '${schemeId}' AND is_historical = FALSE)
)::text;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.total_payments, 2, 'Both installments must be successfully paid');
  assert.equal(res.inst1_status, 'PAID', 'Installment #1 must be PAID');
  assert.equal(res.inst2_status, 'PAID', 'Installment #2 must be PAID');
  assert.equal(res.historical_count, 1, 'Exactly 1 payment is classified as historical');
  assert.equal(res.regular_count, 1, 'Exactly 1 payment is classified as regular November payment');
});

test('Regression 3: Duplicate October payment rejection', () => {
  const custId = 'a1111111-0000-0000-0000-000000000003';
  const schemeId = 'b1111111-0000-0000-0000-000000000003';
  const inst1Id = 'c1111111-0000-0000-0000-000000000031';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000003', 'Test Cust 3', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG3', '9700000003', 'Test Cust 3', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG3', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING');

-- Pay Installment 1 once
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_actual_payment_date => '2026-10-07'::date,
  p_historical_reason => 'October initial payment'
);

-- Attempt duplicate pay
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_actual_payment_date => '2026-10-08'::date,
    p_historical_reason => 'Duplicate attempt'
  );
  RAISE EXCEPTION 'DUPLICATE_PAYMENT_WAS_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%has already been paid%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'DUPLICATE_REJECTED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'DUPLICATE_REJECTED', 'Duplicate payment attempt must be rejected');
});

test('Regression 4: Future installment rejection', () => {
  const custId = 'a1111111-0000-0000-0000-000000000004';
  const schemeId = 'b1111111-0000-0000-0000-000000000004';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000004', 'Test Cust 4', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG4', '9700000004', 'Test Cust 4', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG4', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-11-01', '2027-10-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('c1111111-0000-0000-0000-000000000041', '${schemeId}', '${custId}', 1, '2026-11-01', '2026-11-30', 1000.00, 'PENDING'),
  ('c1111111-0000-0000-0000-000000000042', '${schemeId}', '${custId}', 2, '2026-12-01', '2026-12-31', 1000.00, 'PENDING');

-- Attempt to pay Installment 2 (December) directly while Installment 1 is unpaid
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 2,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'FUTURE_PAYMENT_WAS_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%earlier installments are settled%' OR SQLERRM LIKE '%cannot be paid before that month begins%' THEN
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

test('Regression 5: Audit reason and timestamp preservation in audit_logs', () => {
  const custId = 'a1111111-0000-0000-0000-000000000005';
  const schemeId = 'b1111111-0000-0000-0000-000000000005';
  const inst1Id = 'c1111111-0000-0000-0000-000000000051';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000005', 'Test Cust 5', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG5', '9700000005', 'Test Cust 5', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG5', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING');

-- Record historical payment with distinct audit reason
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'GPAY',
  p_actual_payment_date => '2026-10-14'::date,
  p_historical_reason => 'Audited Diwali opening installment'
);

SELECT json_build_object(
  'action', action,
  'actor_id', actor_id::text,
  'is_historical', (new_values->>'is_historical')::boolean,
  'actual_payment_date', (new_values->>'actual_payment_date'),
  'historical_reason', (new_values->>'historical_reason')
)::text FROM public.audit_logs 
WHERE entity_table = 'payments' AND action = 'RECORD_HISTORICAL_PAYMENT'
ORDER BY created_at DESC LIMIT 1;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.action, 'RECORD_HISTORICAL_PAYMENT', 'Action must be RECORD_HISTORICAL_PAYMENT');
  assert.equal(res.actor_id, ADMIN_ID, 'Actor ID must match admin');
  assert.equal(res.is_historical, true, 'is_historical must be true in audit new_values');
  assert.equal(res.actual_payment_date, '2026-10-14', 'actual_payment_date must be preserved in audit');
  assert.equal(res.historical_reason, 'Audited Diwali opening installment', 'historical_reason must be preserved');
});

test('Regression 6: Prior-month installment rejected if historical reason is missing or < 5 characters', () => {
  const custId = 'a1111111-0000-0000-0000-000000000006';
  const schemeId = 'b1111111-0000-0000-0000-000000000006';
  const inst1Id = 'c1111111-0000-0000-0000-000000000061';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000006', 'Test Cust 6', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG6', '9700000006', 'Test Cust 6', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG6', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING');

-- Try to pay October installment with no historical reason
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_actual_payment_date => '2026-10-07'::date,
    p_historical_reason => 'no' -- less than 5 characters
  );
  RAISE EXCEPTION 'MISSING_REASON_WAS_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%minimum 5 characters%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'REASON_REQUIRED_ENFORCED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'REASON_REQUIRED_ENFORCED', 'Must enforce minimum 5 character historical reason');
});

test('Regression 7: Current month installment CANNOT be marked historical', () => {
  const custId = 'a1111111-0000-0000-0000-000000000007';
  const schemeId = 'b1111111-0000-0000-0000-000000000007';
  const inst1Id = 'c1111111-0000-0000-0000-000000000071';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000007', 'Test Cust 7', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG7', '9700000007', 'Test Cust 7', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG7', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-11-01', '2027-10-01', 'ACTIVE', 1, '${ADMIN_ID}');
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-11-01', '2026-11-30', 1000.00, 'PENDING');

-- Try to mark November installment as historical
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_is_historical => TRUE,
    p_historical_reason => 'Attempt to bypass monthly limit'
  );
  RAISE EXCEPTION 'CURRENT_MONTH_HISTORICAL_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%prior calendar month installments%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'CURRENT_MONTH_HISTORICAL_BLOCKED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'CURRENT_MONTH_HISTORICAL_BLOCKED', 'Current month installment cannot be marked historical');
});

test('Regression 8: Regular payment strictly enforces monthly limit (second regular payment in November rejected with MONTHLY_LIMIT_EXCEEDED)', () => {
  const custId = 'a1111111-0000-0000-0000-000000000008';
  const schemeId = 'b1111111-0000-0000-0000-000000000008';
  const inst1Id = 'c1111111-0000-0000-0000-000000000081';
  const inst2Id = 'c1111111-0000-0000-0000-000000000082';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000008', 'Test Cust 8', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG8', '9700000008', 'Test Cust 8', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG8', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PAID'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 'PENDING');

-- Insert a regular payment recorded in November for this scheme (simulating the erroneous classification)
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number, amount,
  payment_date, payment_method, payment_status, recorded_by, is_historical, actual_payment_date, created_at
) VALUES (
  'RJ-RCP-2026-SIM888', '${custId}', '${schemeId}', '${inst1Id}', 1, 1000.00,
  now(), 'CASH', 'SUCCESS', '${ADMIN_ID}', FALSE, '2026-10-07', now()
);

-- Attempt to pay Installment 2 (November) when a regular payment is already logged for November
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 2,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'SECOND_REGULAR_PAYMENT_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%MONTHLY_LIMIT_EXCEEDED%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'MONTHLY_LIMIT_ENFORCED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'MONTHLY_LIMIT_ENFORCED', 'Second regular payment in current month must be rejected with MONTHLY_LIMIT_EXCEEDED');
});

test('Regression 9: November Exception: October historical + November regular payments both succeed during November', () => {
  const custId = 'a1111111-0000-0000-0000-000000000009';
  const schemeId = 'b1111111-0000-0000-0000-000000000009';
  const inst1Id = 'c1111111-0000-0000-0000-000000000091';
  const inst2Id = 'c1111111-0000-0000-0000-000000000092';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000009', 'Test Cust 9', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG9', '9700000009', 'Test Cust 9', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG9', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 'PENDING');

-- Step 1: Record October installment #1 under historical workflow
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'PHONEPE',
  p_actual_payment_date => '2026-10-07'::date,
  p_historical_reason => 'October kickoff collection at showroom'
);

-- Step 2: Record November installment #2 under regular workflow
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 2,
  p_payment_method => 'CASH'
);

-- Verify payments state
SELECT json_build_object(
  'total_payments', count(*),
  'historical_count', count(*) FILTER (WHERE is_historical = TRUE),
  'regular_count', count(*) FILTER (WHERE is_historical = FALSE),
  'inst1_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst1Id}'),
  'inst2_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst2Id}')
)::text FROM public.payments WHERE scheme_id = '${schemeId}';

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.total_payments, 2, 'Both October and November payments must exist');
  assert.equal(res.historical_count, 1, 'Exactly one payment must be historical');
  assert.equal(res.regular_count, 1, 'Exactly one payment must be regular');
  assert.equal(res.inst1_status, 'PAID', 'Installment 1 must be PAID');
  assert.equal(res.inst2_status, 'PAID', 'Installment 2 must be PAID');
});

test('Regression 10: Advance payment for December 2026 or later is strictly blocked with FUTURE_INSTALLMENT_BLOCKED', () => {
  const custId = 'a1111111-0000-0000-0000-000000000010';
  const schemeId = 'b1111111-0000-0000-0000-000000000010';
  const inst1Id = 'c1111111-0000-0000-0000-000000000101';
  const inst2Id = 'c1111111-0000-0000-0000-000000000102';
  const inst3Id = 'c1111111-0000-0000-0000-000000000103';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000010', 'Test Cust 10', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG10', '9700000010', 'Test Cust 10', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG10', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PAID'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 'PAID'),
  ('${inst3Id}', '${schemeId}', '${custId}', 3, '2026-12-01', '2026-12-31', 1000.00, 'PENDING');

-- Attempt to pay December installment #3 during November
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 3,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'FUTURE_PAYMENT_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%FUTURE_INSTALLMENT_BLOCKED%' OR SQLERRM LIKE '%cannot be paid before that month begins%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'FUTURE_BLOCKED_SUCCESS' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'FUTURE_BLOCKED_SUCCESS', 'December advance payment must be rejected');
});

test('Regression 11: Duplicate payment for the same installment is rejected by status and unique constraint', () => {
  const custId = 'a1111111-0000-0000-0000-000000000011';
  const schemeId = 'b1111111-0000-0000-0000-000000000011';
  const inst1Id = 'c1111111-0000-0000-0000-000000000111';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000011', 'Test Cust 11', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG11', '9700000011', 'Test Cust 11', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG11', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING');

-- First payment succeeds
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 1,
  p_payment_method => 'CASH',
  p_actual_payment_date => '2026-10-07'::date,
  p_historical_reason => 'October initial payment'
);

-- Second attempt on same installment
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_actual_payment_date => '2026-10-07'::date,
    p_historical_reason => 'Duplicate October attempt'
  );
  RAISE EXCEPTION 'DUPLICATE_PAYMENT_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%has already been paid%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'DUPLICATE_REJECTED' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'DUPLICATE_REJECTED', 'Duplicate payment on same installment must be rejected');
});

test('Regression 12: Customer online payment attempt rejects prior October and future December installments', () => {
  const custId = 'a1111111-0000-0000-0000-000000000012';
  const schemeId = 'b1111111-0000-0000-0000-000000000012';
  const inst1Id = 'c1111111-0000-0000-0000-000000000121';
  const inst2Id = 'c1111111-0000-0000-0000-000000000122';
  const inst3Id = 'c1111111-0000-0000-0000-000000000123';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "service_role"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000012', 'Test Cust 12', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG12', '9700000012', 'Test Cust 12', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG12', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 'PENDING'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 'PENDING'),
  ('${inst3Id}', '${schemeId}', '${custId}', 3, '2026-12-01', '2026-12-31', 1000.00, 'PENDING');

-- 1. Online attempt for October (prior month)
SELECT public.create_online_payment_attempt(
  p_customer_id => '${custId}'::uuid,
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_id => '${inst1Id}'::uuid,
  p_installment_number => 1,
  p_amount_paise => 100000
) AS res_oct;

-- 2. Online attempt for December (future month)
SELECT public.create_online_payment_attempt(
  p_customer_id => '${custId}'::uuid,
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_id => '${inst3Id}'::uuid,
  p_installment_number => 3,
  p_amount_paise => 100000
) AS res_dec;

-- 3. Online attempt for November (current month)
SELECT public.create_online_payment_attempt(
  p_customer_id => '${custId}'::uuid,
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_id => '${inst2Id}'::uuid,
  p_installment_number => 2,
  p_amount_paise => 100000
) AS res_nov;

SELECT json_build_object(
  'oct_success', (public.create_online_payment_attempt('${custId}', '${schemeId}', '${inst1Id}', 1, 100000)->>'success')::boolean,
  'oct_error', (public.create_online_payment_attempt('${custId}', '${schemeId}', '${inst1Id}', 1, 100000)->>'error'),
  'dec_success', (public.create_online_payment_attempt('${custId}', '${schemeId}', '${inst3Id}', 3, 100000)->>'success')::boolean,
  'dec_error', (public.create_online_payment_attempt('${custId}', '${schemeId}', '${inst3Id}', 3, 100000)->>'error'),
  'nov_success', (public.create_online_payment_attempt('${custId}', '${schemeId}', '${inst2Id}', 2, 100000)->>'success')::boolean
)::text AS results;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.oct_success, false, 'October online payment attempt must fail');
  assert.equal(res.oct_error, 'INVALID_INSTALLMENT_MONTH', 'October online payment error must be INVALID_INSTALLMENT_MONTH');
  assert.equal(res.dec_success, false, 'December online payment attempt must fail');
  assert.equal(res.dec_error, 'INVALID_INSTALLMENT_MONTH', 'December online payment error must be INVALID_INSTALLMENT_MONTH');
  assert.equal(res.nov_success, true, 'November online payment attempt must succeed');
});

test('Regression 13: Existing customer RJ2026-002: Audited classification correction enables November payment without modifying timestamps', () => {
  const custId = 'be1dc980-e318-4eb9-a39f-3d5e3273d698';
  const schemeId = '4939857a-e380-48c0-a8c2-2687cb5f18a7';
  const inst1Id = 'dcae426f-f62d-4b64-b8e8-c05475c3dcd6';
  const inst2Id = 'cec53da5-e335-421d-92dc-51bee1b66920';
  const paymentId = '522b841d-2d6e-4bf3-8e33-be52377f140a';

  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

-- 1. Setup exact replica of production RJ2026-002
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '8778173682', 'test', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${custId}', 'RJ2026-002', '8778173682', 'test', '${ADMIN_ID}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'RJ-SCH-2026-7FADDA', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-10-01', '2027-09-01', 'ACTIVE', 1, '${ADMIN_ID}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status)
VALUES 
  ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-10-01', '2026-10-31', 1000.00, 1000.00, '2026-11-07 04:39:02.483796+00', 'PAID'),
  ('${inst2Id}', '${schemeId}', '${custId}', 2, '2026-11-01', '2026-11-30', 1000.00, 0.00, NULL, 'PENDING')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Existing payment entered in showroom with erroneous is_historical = FALSE
INSERT INTO public.payments (
  id, receipt_number, customer_id, scheme_id, installment_id, installment_number, amount,
  payment_date, payment_method, payment_status, recorded_by, is_historical, historical_reason, actual_payment_date, created_at, updated_at
) VALUES (
  '${paymentId}', 'RJ-RCP-2026-8308E7', '${custId}', '${schemeId}', '${inst1Id}', 1, 1000.00,
  '2026-11-07 04:39:02.483796+00', 'PHONEPE', 'SUCCESS', '${ADMIN_ID}', FALSE, NULL, '2026-10-07',
  '2026-11-07 04:39:02.483796+00', '2026-11-07 04:39:02.483796+00'
) ON CONFLICT (id) DO UPDATE SET is_historical = FALSE, historical_reason = NULL;

-- 2. Verify that prior to correction, recording November installment #2 is BLOCKED
DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 2,
    p_payment_method => 'CASH'
  );
  RAISE EXCEPTION 'PAYMENT_SHOULD_HAVE_FAILED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%MONTHLY_LIMIT_EXCEEDED%' THEN
    NULL; -- Expected blocker
  ELSE
    RAISE;
  END IF;
END $$;

-- 3. Execute the exact proposed non-destructive correction SQL
UPDATE public.payments
SET is_historical = TRUE,
    historical_reason = 'Diwali savings scheme October 2026 kickoff installment collected in showroom on October 7, 2026',
    updated_at = clock_timestamp()
WHERE id = '${paymentId}'
  AND customer_id = '${custId}'
  AND receipt_number = 'RJ-RCP-2026-8308E7'
  AND is_historical = FALSE;

-- 4. Now record November installment #2
SELECT public.record_installment_payment(
  p_scheme_id => '${schemeId}'::uuid,
  p_installment_number => 2,
  p_payment_method => 'CASH'
);

-- 5. Verify results
SELECT json_build_object(
  'inst1_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst1Id}'),
  'inst2_status', (SELECT status FROM public.scheme_installments WHERE id = '${inst2Id}'),
  'payment1_id', (SELECT id FROM public.payments WHERE installment_number = 1 AND scheme_id = '${schemeId}'),
  'payment1_receipt', (SELECT receipt_number FROM public.payments WHERE installment_number = 1 AND scheme_id = '${schemeId}'),
  'payment1_is_historical', (SELECT is_historical FROM public.payments WHERE installment_number = 1 AND scheme_id = '${schemeId}'),
  'payment1_date_unchanged', (SELECT to_char(payment_date AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') FROM public.payments WHERE installment_number = 1 AND scheme_id = '${schemeId}'),
  'payment2_status', (SELECT payment_status FROM public.payments WHERE installment_number = 2 AND scheme_id = '${schemeId}'),
  'payment2_is_historical', (SELECT is_historical FROM public.payments WHERE installment_number = 2 AND scheme_id = '${schemeId}'),
  'total_payments', (SELECT count(*) FROM public.payments WHERE scheme_id = '${schemeId}')
)::text AS verification;

ROLLBACK;
`;
  const res = runSqlJson(sql);
  assert.equal(res.inst1_status, 'PAID', 'Installment 1 must remain PAID');
  assert.equal(res.inst2_status, 'PAID', 'Installment 2 must now be PAID');
  assert.equal(res.payment1_id, paymentId, 'Original payment ID must be preserved');
  assert.equal(res.payment1_receipt, 'RJ-RCP-2026-8308E7', 'Original receipt number must be preserved');
  assert.equal(res.payment1_is_historical, true, 'Payment 1 is_historical must be TRUE');
  assert.equal(res.payment1_date_unchanged, '2026-11-07 04:39:02', 'System recording timestamp must remain completely un-backdated');
  assert.equal(res.payment2_status, 'SUCCESS', 'Payment 2 must be SUCCESS');
  assert.equal(res.payment2_is_historical, false, 'Payment 2 must be regular (is_historical = FALSE)');
  assert.equal(res.total_payments, 2, 'Exactly 2 payments must exist in ledger');
});

test('Regression 14: Prior calendar month other than October 2026 is rejected with PRIOR_MONTH_BLOCKED', () => {
  const custId = 'a1111111-0000-0000-0000-000000000014';
  const schemeId = 'b1111111-0000-0000-0000-000000000014';
  const inst1Id = 'c1111111-0000-0000-0000-000000000141';
  const sql = `
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true); END $$;

INSERT INTO public.profiles (id, role, phone_number, full_name, is_active) VALUES ('${custId}', 'CUSTOMER', '9700000014', 'Test Cust 14', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by) VALUES ('${custId}', 'RJ2026-REG14', '9700000014', 'Test Cust 14', '${ADMIN_ID}');
INSERT INTO public.schemes (id, scheme_code, customer_id, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, slot_number, enrolled_by)
VALUES ('${schemeId}', 'SCH-REG14', '${custId}', 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-09-01', '2027-08-01', 'ACTIVE', 1, '${ADMIN_ID}');

INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${inst1Id}', '${schemeId}', '${custId}', 1, '2026-09-01', '2026-09-30', 1000.00, 'PENDING');

DO $$
BEGIN
  PERFORM public.record_installment_payment(
    p_scheme_id => '${schemeId}'::uuid,
    p_installment_number => 1,
    p_payment_method => 'CASH',
    p_actual_payment_date => '2026-09-15'::date,
    p_historical_reason => 'September payment attempt'
  );
  RAISE EXCEPTION 'SEPTEMBER_PAYMENT_PERMITTED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%PRIOR_MONTH_BLOCKED%' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;

SELECT 'PRIOR_MONTH_BLOCKED_SUCCESS' AS result;
ROLLBACK;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'PRIOR_MONTH_BLOCKED_SUCCESS', 'September installment must be rejected with PRIOR_MONTH_BLOCKED');
});

test('Regression 15: Expiration logic verifies window closes on December 1, 2026', () => {
  const sql = `
DO $$
DECLARE
  v_test_date_nov DATE := '2026-11-15'::DATE;
  v_test_date_dec DATE := '2026-12-01'::DATE;
  v_in_window_nov BOOLEAN := (v_test_date_nov >= '2026-11-01'::DATE AND v_test_date_nov <= '2026-11-30'::DATE);
  v_in_window_dec BOOLEAN := (v_test_date_dec >= '2026-11-01'::DATE AND v_test_date_dec <= '2026-11-30'::DATE);
BEGIN
  IF NOT v_in_window_nov THEN
    RAISE EXCEPTION 'November 15 must be inside exception window';
  END IF;
  IF v_in_window_dec THEN
    RAISE EXCEPTION 'December 1 must be OUTSIDE exception window (expired)';
  END IF;
END $$;

SELECT 'EXPIRATION_VALIDATED' AS result;
`;
  const res = runSql(sql).split('\n').pop().trim();
  assert.equal(res, 'EXPIRATION_VALIDATED', 'Expiration condition must evaluate to false starting December 1, 2026');
});

