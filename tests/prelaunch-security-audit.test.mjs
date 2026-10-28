import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

/**
 * RAMYAS JEWELLER — PRE-LAUNCH PRODUCTION SECURITY AUDIT TEST SUITE
 *
 * Verifies all 6 mandatory audit requirements:
 * 1. Cleanup function called with TRUE, FALSE and NULL fails closed.
 * 2. Unauthorized callers rejected from account deletion procedure.
 * 3. Authorized administrator can record an installment payment via RPC.
 * 4. Duplicate installment/monthly payment strictly rejected (storage-level + application-level).
 * 5. Online payment reconciliation is strictly idempotent on duplicate webhooks.
 * 6. Shared mobile number supports multiple customer profiles without cross-profile data leakage.
 */

const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
const NON_ADMIN_ID = 'c9999999-9999-9999-9999-999999999999';

// Synthetic isolated UUIDs for test fixtures
const FIXTURE_CUST_A = 'd1111111-1111-1111-1111-111111111111';
const FIXTURE_CUST_B = 'd2222222-2222-2222-2222-222222222222';
const FIXTURE_FOREIGN_CUST = 'd3333333-3333-3333-3333-333333333333';
const FIXTURE_SCHEME = 'e1111111-1111-1111-1111-111111111111';
const FIXTURE_INST_1 = 'e2222222-2222-2222-2222-222222222221';
const FIXTURE_INST_2 = 'e2222222-2222-2222-2222-222222222222';
const FIXTURE_ATTEMPT = 'e3333333-3333-3333-3333-333333333331';

const SHARED_MOBILE = '9888811111';
const FOREIGN_MOBILE = '9888822222';

function runSql(sql) {
  try {
    return execSync(
      'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
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

test.before(() => {
  // Setup clean isolated fixtures
  const setupSql = `
BEGIN;
-- Clean up any prior fixtures
DELETE FROM public.payments WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.payment_attempts WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.scheme_installments WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.schemes WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_sessions WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}') OR grantee_customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_auth WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customers WHERE id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.profiles WHERE id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');

-- Insert Customer A (Shared Mobile)
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${FIXTURE_CUST_A}', 'CUSTOMER', '${SHARED_MOBILE}', 'Fixture Cust A', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${FIXTURE_CUST_A}', 'RJ2026-FIXA', '${SHARED_MOBILE}', 'Fixture Cust A', '${ADMIN_ID}');

-- Insert Customer B (Same Shared Mobile)
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${FIXTURE_CUST_B}', 'CUSTOMER', '${SHARED_MOBILE}', 'Fixture Cust B', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${FIXTURE_CUST_B}', 'RJ2026-FIXB', '${SHARED_MOBILE}', 'Fixture Cust B', '${ADMIN_ID}');

-- Insert Foreign Customer (Different Mobile)
INSERT INTO public.profiles (id, role, phone_number, full_name, is_active)
VALUES ('${FIXTURE_FOREIGN_CUST}', 'CUSTOMER', '${FOREIGN_MOBILE}', 'Fixture Cust Foreign', TRUE);
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${FIXTURE_FOREIGN_CUST}', 'RJ2026-FIXF', '${FOREIGN_MOBILE}', 'Fixture Cust Foreign', '${ADMIN_ID}');

-- Insert Active Scheme for Customer A
INSERT INTO public.schemes (
  id, scheme_code, customer_id, monthly_installment_amount, total_installments,
  target_contribution, bonus_amount, maturity_amount, start_month, end_month,
  status, slot_number, enrolled_by
) VALUES (
  '${FIXTURE_SCHEME}', 'SCH-FIX-001', '${FIXTURE_CUST_A}', 1000.00, 12,
  12000.00, 1000.00, 13000.00, date_trunc('month', now())::date, (date_trunc('month', now()) + INTERVAL '11 months')::date,
  'ACTIVE', 1, '${ADMIN_ID}'
);

-- Insert Installment 1 (Previous month, so due and payable)
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${FIXTURE_INST_1}', '${FIXTURE_SCHEME}', '${FIXTURE_CUST_A}', 1, (date_trunc('month', now()) - INTERVAL '1 month')::date, (date_trunc('month', now()) - INTERVAL '20 days')::date, 1000.00, 'PENDING');

-- Insert Installment 2 (Current month, so due and payable)
INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status)
VALUES ('${FIXTURE_INST_2}', '${FIXTURE_SCHEME}', '${FIXTURE_CUST_A}', 2, date_trunc('month', now())::date, (date_trunc('month', now()) + INTERVAL '10 days')::date, 1000.00, 'PENDING');

COMMIT;
`;
  runSql(setupSql);
});

test.after(() => {
  // Cleanup test fixtures
  const cleanupSql = `
BEGIN;
DELETE FROM public.payments WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.payment_attempts WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.scheme_installments WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.schemes WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_sessions WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}') OR grantee_customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customer_auth WHERE customer_id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.customers WHERE id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
DELETE FROM public.profiles WHERE id IN ('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}', '${FIXTURE_FOREIGN_CUST}');
COMMIT;
`;
  runSql(cleanupSql);
});

// -----------------------------------------------------------------------------
// REQUIREMENT 1: Cleanup function called with TRUE, FALSE and NULL
// -----------------------------------------------------------------------------
test('Requirement 1.1: Cleanup function called with FALSE produces DRY_RUN without deleting records', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.admin_cleanup_six_test_customers(FALSE) ->> 'mode';
ROLLBACK;
`;
  const result = runSql(sql).split('\n').pop().trim();
  assert.equal(result, 'DRY_RUN', 'FALSE parameter must trigger safe DRY_RUN report');
});

test('Requirement 1.2: Cleanup function called with NULL fails closed to DRY_RUN (three-valued logic guard)', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.admin_cleanup_six_test_customers(NULL) ->> 'mode';
ROLLBACK;
`;
  const result = runSql(sql).split('\n').pop().trim();
  assert.equal(result, 'DRY_RUN', 'NULL parameter must fail closed to safe DRY_RUN report');
});

test('Requirement 1.3: Cleanup function called with TRUE fails safely when database is not in the exact 12-test-customer state', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.admin_cleanup_six_test_customers(TRUE);
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Cleanup guard failure/i, 'Must block destructive execution on non-fixture database');
  }
  assert.equal(threw, true, 'Executing cleanup on non-12-customer state must abort with exception');
});

test('Requirement 1.4: Unauthenticated or non-admin caller rejected from cleanup function', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${NON_ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.admin_cleanup_six_test_customers(FALSE);
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Unauthorized: Only registered administrators/i);
  }
  assert.equal(threw, true, 'Non-admin caller must be strictly rejected');
});

// -----------------------------------------------------------------------------
// REQUIREMENT 2: Unauthorized caller rejected from account deletion
// -----------------------------------------------------------------------------
test('Requirement 2.1: Unauthenticated caller rejected from delete_customer_account', () => {
  const sql = `
BEGIN;
SELECT public.delete_customer_account('${FIXTURE_CUST_A}');
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Unauthorized: Only registered administrators/i);
  }
  assert.equal(threw, true, 'Anonymous/unauthenticated caller must be rejected');
});

test('Requirement 2.2: Non-admin authenticated caller rejected from delete_customer_account', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${NON_ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.delete_customer_account('${FIXTURE_CUST_A}');
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Unauthorized: Only registered administrators/i);
  }
  assert.equal(threw, true, 'Non-admin caller must be rejected');
});

test('Requirement 2.3: delete_customer_account strictly rejects NULL customer ID', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.delete_customer_account(NULL);
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Customer ID cannot be NULL/i);
  }
  assert.equal(threw, true, 'NULL customer ID must raise exception 22004');
});

test('Requirement 2.4: delete_customer_account strictly prevents deletion of administrator accounts', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
-- Temporarily insert admin into customers table to test safety guard
INSERT INTO public.customers (id, customer_code, phone_number, full_name, created_by)
VALUES ('${ADMIN_ID}', 'RJ2026-ADM1', '9000000000', 'Test Admin 1', '${ADMIN_ID}')
ON CONFLICT (id) DO NOTHING;

SELECT public.delete_customer_account('${ADMIN_ID}');
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Safety Violation: Cannot delete administrator account/i);
  }
  assert.equal(threw, true, 'Deleting admin account must raise Safety Violation exception');
});

// -----------------------------------------------------------------------------
// REQUIREMENT 3: Authorized administrator can record an installment
// -----------------------------------------------------------------------------
test('Requirement 3.1: Authorized administrator successfully records installment payment', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);
SELECT public.record_installment_payment(
  '${FIXTURE_SCHEME}',
  1,
  'CASH',
  'CASH-COUNTER-001',
  'Test admin installment payment'
) ->> 'success';
ROLLBACK;
`;
  const result = runSql(sql).split('\n').pop().trim();
  assert.equal(result, 'true', 'Admin must be able to record valid installment payment');
});

// -----------------------------------------------------------------------------
// REQUIREMENT 4: Duplicate installment / monthly payment rejected
// -----------------------------------------------------------------------------
test('Requirement 4.1: Second payment attempt on the same scheme in the same calendar month is rejected (Application Guard)', () => {
  const sql = `
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub": "${ADMIN_ID}", "role": "authenticated"}', true);

-- Record payment 1
SELECT public.record_installment_payment('${FIXTURE_SCHEME}', 1, 'CASH', 'CASH-001', 'First payment');

-- Attempt payment 2 on installment 2 in the same month
SELECT public.record_installment_payment('${FIXTURE_SCHEME}', 2, 'CASH', 'CASH-002', 'Second payment same month');
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /MONTHLY_LIMIT_EXCEEDED/i, 'Must reject second installment in same calendar month');
  }
  assert.equal(threw, true, 'Application-level monthly guard must reject duplicate payment');
});

test('Requirement 4.2: Storage-level partial unique index (uq_payments_scheme_calendar_month) enforces single monthly success', () => {
  const sql = `
BEGIN;
-- Direct manual insert 1
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number,
  amount, payment_date, payment_method, payment_status
) VALUES (
  'RJ-RCP-TEST-001', '${FIXTURE_CUST_A}', '${FIXTURE_SCHEME}', '${FIXTURE_INST_1}', 1,
  1000.00, now(), 'CASH', 'SUCCESS'
);

-- Direct manual insert 2 for the same scheme in the same month
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number,
  amount, payment_date, payment_method, payment_status
) VALUES (
  'RJ-RCP-TEST-002', '${FIXTURE_CUST_A}', '${FIXTURE_SCHEME}', '${FIXTURE_INST_2}', 2,
  1000.00, now(), 'CASH', 'SUCCESS'
);
ROLLBACK;
`;
  let threw = false;
  try {
    runSql(sql);
  } catch (err) {
    threw = true;
    assert.match(err.message, /uq_payments_scheme_calendar_month|duplicate key value violates unique constraint/i);
  }
  assert.equal(threw, true, 'Unique partial index must reject second successful payment row for same scheme in same month');
});

// -----------------------------------------------------------------------------
// REQUIREMENT 5: Duplicate online payment webhook is idempotent
// -----------------------------------------------------------------------------
test('Requirement 5.1: Online payment reconciliation is strictly idempotent on duplicate webhook payloads', () => {
  const sql = `
BEGIN;
-- Create payment attempt
INSERT INTO public.payment_attempts (
  id, customer_id, scheme_id, installment_id, installment_number,
  amount, amount_paise, currency, razorpay_payment_link_id, status
) VALUES (
  '${FIXTURE_ATTEMPT}', '${FIXTURE_CUST_A}', '${FIXTURE_SCHEME}', '${FIXTURE_INST_1}', 1,
  1000.00, 100000, 'INR', 'plink_test_fixture_123', 'CREATED'
);

-- First webhook delivery
SELECT public.reconcile_online_payment(
  '${FIXTURE_ATTEMPT}',
  'pay_test_rzp_mock_9999',
  100000,
  'RAZORPAY',
  NULL,
  'Initial webhook'
) ->> 'success' AS first_success;

-- Duplicate webhook delivery with exact same payment ID
SELECT public.reconcile_online_payment(
  '${FIXTURE_ATTEMPT}',
  'pay_test_rzp_mock_9999',
  100000,
  'RAZORPAY',
  NULL,
  'Duplicate webhook'
) ->> 'already_processed' AS second_already_processed;

-- Verify total payments for this scheme remains exactly 1
SELECT count(*) FROM public.payments WHERE scheme_id = '${FIXTURE_SCHEME}' AND transaction_reference = 'pay_test_rzp_mock_9999';

ROLLBACK;
`;
  const output = runSql(sql);
  assert.match(output, /true/, 'First reconciliation must succeed');
  assert.match(output, /1/, 'Payment count for transaction reference must remain strictly 1');
});

// -----------------------------------------------------------------------------
// REQUIREMENT 6: Shared mobile number supports multiple authorized customer profiles without cross-profile data leakage
// -----------------------------------------------------------------------------
test('Requirement 6.1: Shared mobile number authorizes linked profiles within group', () => {
  const sql = `
SELECT public.is_customer_authorized_for_profile('${FIXTURE_CUST_A}', '${FIXTURE_CUST_B}') AS auth_within_group;
`;
  const result = runSql(sql).split('\n').pop().trim();
  assert.equal(result, 't', 'Customers sharing the same 10-digit mobile number must be authorized within group');
});

test('Requirement 6.2: Shared mobile number strictly rejects outside foreign profiles (No cross-profile leakage)', () => {
  const sql = `
SELECT public.is_customer_authorized_for_profile('${FIXTURE_CUST_A}', '${FIXTURE_FOREIGN_CUST}') AS auth_outside_group;
`;
  const result = runSql(sql).split('\n').pop().trim();
  assert.equal(result, 'f', 'Foreign customer outside the mobile group must be strictly rejected');
});
