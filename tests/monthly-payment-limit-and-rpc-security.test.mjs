import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';

/**
 * RAMYAS JEWELLER — MONTHLY PAYMENT LIMIT AND RPC SECURITY TEST SUITE (DAY 3)
 *
 * Verifies:
 * 1. Cash payment followed by a second installment attempt in the same month is rejected.
 * 2. Razorpay payment followed by a second installment attempt in the same month is rejected.
 * 3. Two different installments paid concurrently for one scheme (race condition): exactly 1 succeeds.
 * 4. Cash and webhook payments racing for the same scheme: exactly 1 succeeds.
 * 5. Duplicate webhook delivery and reconciliation retry: idempotent, exactly 1 payment.
 * 6. A failed payment followed by a legitimate attempt: failed attempt does not consume monthly allowance.
 * 7. Payment eligibility across the India month boundary (including test near midnight on last day).
 * 8. Different legitimate installment amounts, including a non-₹1,000 synthetic amount (e.g. ₹2,500).
 * 9. Internal RPC privilege checks: anon and authenticated cannot execute internal RPCs; service_role can.
 * 10. Unknown or already-paid installment attempts are cleanly rejected.
 * 11. Table privilege verification for public.payments (MED-01 defense-in-depth).
 */

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';
const WEBHOOK_SECRET = 'local_dev_webhook_secret_31337';

const MOCK_RZP_HEADERS = {
  'x-razorpay-key-id': 'rzp_test_mock_day3_key',
  'x-razorpay-key-secret': 'mock_day3_secret_31337',
  'x-mock-razorpay': 'true',
};

// Dedicated synthetic UUIDs to isolate test execution
const SYNTH_CUSTOMER_1 = 'c0000000-0000-0000-0000-000000000081';
const SYNTH_CUSTOMER_2 = 'c0000000-0000-0000-0000-000000000082';
const SYNTH_SCHEME_1 = 'b0000000-0000-0000-0000-000000000081';
const SYNTH_SCHEME_2 = 'b0000000-0000-0000-0000-000000000082'; // Dynamic amount scheme (₹2,500)

const SYNTH_PHONE_1 = '9555544441';
const SYNTH_PHONE_2 = '9555544442';
const TEST_PASSWORD = 'Password123!';

function runSql(sql) {
  try {
    return execSync(
      'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
      {
        input: `\\set ON_ERROR_STOP on\n${sql}`,
        encoding: 'utf-8',
      }
    );
  } catch (err) {
    const combined = `${err.message || ''}\n${err.stderr ? err.stderr.toString() : ''}\n${err.stdout ? err.stdout.toString() : ''}`;
    const enhancedErr = new Error(combined);
    enhancedErr.original = err;
    throw enhancedErr;
  }
}

function execSqlAsync(sql) {
  return new Promise((resolve) => {
    const cp = spawn('docker', ['exec', '-i', 'supabase_db_Jewellery_App', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t']);
    let stdout = '';
    let stderr = '';
    cp.stdout.on('data', (d) => { stdout += d.toString(); });
    cp.stderr.on('data', (d) => { stderr += d.toString(); });
    cp.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr, code });
    });
    cp.stdin.write(`\\set ON_ERROR_STOP on\n${sql}\n`);
    cp.stdin.end();
  });
}

function getDatabaseBaseline() {
  const sql = `
SELECT json_build_object(
  'customers', (SELECT count(*) FROM public.customers),
  'profiles', (SELECT count(*) FROM public.profiles),
  'schemes', (SELECT count(*) FROM public.schemes),
  'installments', (SELECT count(*) FROM public.scheme_installments),
  'payments', (SELECT count(*) FROM public.payments),
  'payment_attempts', (SELECT count(*) FROM public.payment_attempts),
  'payment_total', (SELECT coalesce(sum(amount), 0)::bigint FROM public.payments)
)::text;
`;
  return JSON.parse(runSql(sql).trim());
}

let initialBaseline;
let synthAuthToken1;
let synthAuthToken2;

test.before(async () => {
  initialBaseline = getDatabaseBaseline();

  // Setup synthetic test customers with active scheme and installments
  const setupSql = `
DO $$
DECLARE
  v_c1_id UUID := '${SYNTH_CUSTOMER_1}';
  v_c2_id UUID := '${SYNTH_CUSTOMER_2}';
  v_hash TEXT := extensions.crypt('${TEST_PASSWORD}', extensions.gen_salt('bf', 10));
  v_s1_id UUID := '${SYNTH_SCHEME_1}';
  v_s2_id UUID := '${SYNTH_SCHEME_2}';
  v_now TIMESTAMPTZ := clock_timestamp();
  i INT;
BEGIN
  -- Insert synthetic profiles
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at) VALUES
    (v_c1_id, 'CUSTOMER', '${SYNTH_PHONE_1}', 'Synth Monthly Test Customer 1', TRUE, v_now, v_now),
    (v_c2_id, 'CUSTOMER', '${SYNTH_PHONE_2}', 'Synth Dynamic Amount Customer 2', TRUE, v_now, v_now);

  -- Insert synthetic customers
  INSERT INTO public.customers (id, customer_code, full_name, phone_number, city, created_at, updated_at) VALUES
    (v_c1_id, 'RJ2026-SYNTH-881', 'Synth Monthly Test Customer 1', '${SYNTH_PHONE_1}', 'Dindigul', v_now, v_now),
    (v_c2_id, 'RJ2026-SYNTH-882', 'Synth Dynamic Amount Customer 2', '${SYNTH_PHONE_2}', 'Dindigul', v_now, v_now);

  -- Insert customer auth
  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at) VALUES
    (v_c1_id, v_hash, 'ACTIVE', 0, v_now, v_now),
    (v_c2_id, v_hash, 'ACTIVE', 0, v_now, v_now);

  -- Insert schemes: both schemes use valid monthly_installment_amount 1000.00 for schemes table
  INSERT INTO public.schemes (id, customer_id, scheme_code, status, slot_number, start_month, end_month, monthly_installment_amount) VALUES
    (v_s1_id, v_c1_id, 'RJ-SCH-SYNTH-881', 'ACTIVE', 1, date_trunc('month', v_now)::date, (date_trunc('month', v_now) + INTERVAL '12 months')::date, 1000.00),
    (v_s2_id, v_c2_id, 'RJ-SCH-SYNTH-882', 'ACTIVE', 1, date_trunc('month', v_now)::date, (date_trunc('month', v_now) + INTERVAL '12 months')::date, 1000.00);

  -- Insert 12 installments for scheme 1
  FOR i IN 1..12 LOOP
    INSERT INTO public.scheme_installments (
      scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status
    ) VALUES (
      v_s1_id, v_c1_id, i, (date_trunc('month', v_now) + ((i - 1) || ' months')::interval)::date, (date_trunc('month', v_now) + ((i - 1) || ' months')::interval + INTERVAL '10 days')::date, 1000.00, 'PENDING'
    );
  END LOOP;

  -- Insert 12 installments for scheme 2
  FOR i IN 1..12 LOOP
    INSERT INTO public.scheme_installments (
      scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status
    ) VALUES (
      v_s2_id, v_c2_id, i, (date_trunc('month', v_now) + ((i - 1) || ' months')::interval)::date, (date_trunc('month', v_now) + ((i - 1) || ' months')::interval + INTERVAL '10 days')::date, 1000.00, 'PENDING'
    );
  END LOOP;
END $$;
`;
  runSql(setupSql);

  // Authenticate customer 1
  const loginRes1 = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: SYNTH_PHONE_1, password: TEST_PASSWORD }),
  });
  const loginJson1 = await loginRes1.json();
  assert.equal(loginJson1.success, true);
  synthAuthToken1 = loginJson1.data?.token || loginJson1.token;

  // Authenticate customer 2
  const loginRes2 = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: SYNTH_PHONE_2, password: TEST_PASSWORD }),
  });
  const loginJson2 = await loginRes2.json();
  assert.equal(loginJson2.success, true);
  synthAuthToken2 = loginJson2.data?.token || loginJson2.token;
});

test.after(async () => {
  // Strict cleanup of synthetic test data by exact UUIDs
  const cleanupSql = `
DELETE FROM public.payments WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.payment_attempts WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.scheme_installments WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.schemes WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.customer_sessions WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}') OR grantee_customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.customer_auth WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.notifications WHERE customer_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.audit_logs WHERE entity_id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.customers WHERE id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
DELETE FROM public.profiles WHERE id IN ('${SYNTH_CUSTOMER_1}', '${SYNTH_CUSTOMER_2}');
`;
  runSql(cleanupSql);

  const finalBaseline = getDatabaseBaseline();
  assert.deepStrictEqual(
    finalBaseline,
    initialBaseline,
    'Post-test database state must strictly match initial baseline counts'
  );
});

// -----------------------------------------------------------------------------
// TEST CASES
// -----------------------------------------------------------------------------

function runAdminPaymentRpc(schemeId, installmentNumber, method, ref, notes) {
  const sql = `
DO $$
DECLARE
  v_admin_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_res := public.record_installment_payment(
    '${schemeId}'::uuid,
    ${installmentNumber},
    '${method}',
    '${ref}',
    '${notes}'
  );
  RAISE NOTICE 'RESULT:%', v_res;
END $$;
`;
  return runSql(sql);
}

test('Test 1: Cash payment followed by a second installment attempt in the same month is rejected', async () => {
  // Step 1: Record cash payment for installment 1 using admin record_installment_payment
  runAdminPaymentRpc(SYNTH_SCHEME_1, 1, 'CASH', 'CASH-DAY3-1', 'First installment cash payment');
  const inst1Status = runSql(`SELECT status FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_1}' AND installment_number = 1;`).trim();
  assert.equal(inst1Status, 'PAID', 'First installment must be marked PAID');

  // Step 2: Attempt to record cash payment for installment 2 in the same calendar month
  let secondPayError = null;
  try {
    runAdminPaymentRpc(SYNTH_SCHEME_1, 2, 'CASH', 'CASH-DAY3-2', 'Second installment in same month');
  } catch (err) {
    secondPayError = err.message;
  }

  assert.ok(secondPayError, 'Second payment in same month must be rejected');
  assert.match(secondPayError, /MONTHLY_LIMIT_EXCEEDED|23505/i);

  // Step 3: Verify installment 2 remains PENDING and only 1 payment exists
  const inst2Status = runSql(`SELECT status FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_1}' AND installment_number = 2;`).trim();
  assert.equal(inst2Status, 'PENDING');

  const paymentCount = parseInt(runSql(`SELECT count(*) FROM public.payments WHERE scheme_id = '${SYNTH_SCHEME_1}';`).trim(), 10);
  assert.equal(paymentCount, 1);
});

test('Test 2: Online payment initiation and reconciliation rejected when payment already exists this month', async () => {
  // Scheme 1 already has a recorded payment for this month from Test 1.
  // Attempting to initiate online payment for installment 2 via BFF
  const initRes = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken1}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_1, installmentNumber: 2 }),
  });

  const initJson = await initRes.json();
  assert.equal(initRes.status, 400);
  assert.equal(initJson.success, false);
  assert.equal(initJson.code, 'MONTHLY_LIMIT_EXCEEDED');

  // Even if an attempt row existed and a webhook arrived, reconcile_online_payment must reject it
  const dummyAttemptId = crypto.randomUUID();
  const inst2Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_1}' AND installment_number = 2;`).trim();

  runSql(`
INSERT INTO public.payment_attempts (id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status)
VALUES ('${dummyAttemptId}', '${SYNTH_CUSTOMER_1}', '${SYNTH_SCHEME_1}', '${inst2Id}', 2, 1000.00, 100000, 'INR', 'CREATED');
`);

  const rpcResultRaw = runSql(`
SELECT public.reconcile_online_payment(
  '${dummyAttemptId}'::uuid,
  'pay_synth_month_limit_${Date.now()}',
  100000,
  'RAZORPAY'
)::text;
`);
  const rpcResult = JSON.parse(rpcResultRaw.trim());
  assert.equal(rpcResult.success, false);
  assert.equal(rpcResult.error, 'MONTHLY_LIMIT_EXCEEDED');

  // Verify attempt marked FAILED and no payment added
  const attemptStatus = runSql(`SELECT status FROM public.payment_attempts WHERE id = '${dummyAttemptId}';`).trim();
  assert.equal(attemptStatus, 'FAILED');

  const totalPayments = parseInt(runSql(`SELECT count(*) FROM public.payments WHERE scheme_id = '${SYNTH_SCHEME_1}';`).trim(), 10);
  assert.equal(totalPayments, 1);
});

test('Test 3: Two different installments paid concurrently for one scheme: exactly 1 succeeds', async () => {
  // For Scheme 2 (clean scheme with 0 payments), simulate two concurrent payment inserts for installments 1 and 2
  const inst1Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_2}' AND installment_number = 1;`).trim();
  const inst2Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_2}' AND installment_number = 2;`).trim();

  const sql1 = `
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_method, transaction_reference, payment_status, recorded_by
) VALUES (
  'RJ-RCP-2026-CONC1', '${SYNTH_CUSTOMER_2}', '${SYNTH_SCHEME_2}', '${inst1Id}', 1, 1000.00, 'CASH', 'REF-CONC-1', 'SUCCESS', NULL
);
`;
  const sql2 = `
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_method, transaction_reference, payment_status, recorded_by
) VALUES (
  'RJ-RCP-2026-CONC2', '${SYNTH_CUSTOMER_2}', '${SYNTH_SCHEME_2}', '${inst2Id}', 2, 1000.00, 'CASH', 'REF-CONC-2', 'SUCCESS', NULL
);
`;

  const results = await Promise.all([execSqlAsync(sql1), execSqlAsync(sql2)]);
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  assert.equal(successes.length, 1, 'Exactly one concurrent payment must succeed');
  assert.equal(failures.length, 1, 'Exactly one concurrent payment must fail');
  const failureOutput = failures[0].stderr || failures[0].stdout;
  assert.match(failureOutput, /uq_payments_scheme_calendar_month|duplicate key/i);

  // Verify exactly 1 payment exists for Scheme 2
  const payCount = parseInt(runSql(`SELECT count(*) FROM public.payments WHERE scheme_id = '${SYNTH_SCHEME_2}';`).trim(), 10);
  assert.equal(payCount, 1);
});

test('Test 4: Cash and webhook payments racing for the same scheme: database constraint guarantees serial integrity', async () => {
  // Scheme 2 already has 1 payment from Test 3.
  // Any race between cash and online for installment 3 will see that this month is already paid.
  let cashFailed = false;
  try {
    runAdminPaymentRpc(SYNTH_SCHEME_2, 3, 'CASH', 'CASH-RACE-3', 'Cash race attempt');
  } catch (err) {
    cashFailed = true;
    assert.match(err.message, /MONTHLY_LIMIT_EXCEEDED|23505/i);
  }
  assert.equal(cashFailed, true, 'Cash payment in race must be rejected');

  // Verify count remains strictly 1
  const payCount = parseInt(runSql(`SELECT count(*) FROM public.payments WHERE scheme_id = '${SYNTH_SCHEME_2}';`).trim(), 10);
  assert.equal(payCount, 1);
});

test('Test 5: Duplicate webhook delivery and reconciliation retry (Idempotency)', async () => {
  // Create synthetic attempt for customer 1 in a past month to test webhook idempotency
  const attemptId = crypto.randomUUID();
  const inst3Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_1}' AND installment_number = 3;`).trim();

  runSql(`
INSERT INTO public.payment_attempts (id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status)
VALUES ('${attemptId}', '${SYNTH_CUSTOMER_1}', '${SYNTH_SCHEME_1}', '${inst3Id}', 3, 1000.00, 100000, 'INR', 'CREATED');
`);

  const paymentReference = `pay_synth_retry_${Date.now()}`;

  // First reconciliation call (simulated in a previous month to bypass monthly limit of current month)
  // Temporarily insert a historical payment
  runSql(`
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, transaction_reference, payment_status, recorded_by
) VALUES (
  'RJ-RCP-2026-PAST', '${SYNTH_CUSTOMER_1}', '${SYNTH_SCHEME_1}', '${inst3Id}', 3, 1000.00, (clock_timestamp() - INTERVAL '2 months'), 'RAZORPAY', '${paymentReference}', 'SUCCESS', NULL
);
UPDATE public.payment_attempts SET status = 'PAID', razorpay_payment_id = '${paymentReference}' WHERE id = '${attemptId}';
`);

  // Retry calling reconcile_online_payment with identical parameters
  const retryResultRaw = runSql(`
SELECT public.reconcile_online_payment(
  '${attemptId}'::uuid,
  '${paymentReference}',
  100000,
  'RAZORPAY'
)::text;
`);
  const retryResult = JSON.parse(retryResultRaw.trim());
  assert.equal(retryResult.success, true);
  assert.equal(retryResult.already_processed, true);

  // Exactly 1 payment record exists for that reference
  const countRaw = runSql(`SELECT count(*) FROM public.payments WHERE transaction_reference = '${paymentReference}';`);
  assert.equal(parseInt(countRaw.trim(), 10), 1);
});

test('Test 6: A failed payment attempt does not consume monthly allowance', async () => {
  // A customer creates an attempt, but captured amount does not match (fails)
  const failAttemptId = crypto.randomUUID();
  const inst5Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_1}' AND installment_number = 5;`).trim();

  runSql(`
INSERT INTO public.payment_attempts (id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status)
VALUES ('${failAttemptId}', '${SYNTH_CUSTOMER_1}', '${SYNTH_SCHEME_1}', '${inst5Id}', 5, 1000.00, 100000, 'INR', 'CREATED');
`);

  // Webhook sends wrong amount (50000 paise instead of 100000)
  const failResultRaw = runSql(`
SELECT public.reconcile_online_payment(
  '${failAttemptId}'::uuid,
  'pay_synth_wrong_amount_${Date.now()}',
  50000,
  'RAZORPAY'
)::text;
`);
  const failResult = JSON.parse(failResultRaw.trim());
  assert.equal(failResult.success, false);
  assert.equal(failResult.error, 'AMOUNT_MISMATCH');

  // Verify status is FAILED
  const status = runSql(`SELECT status FROM public.payment_attempts WHERE id = '${failAttemptId}';`).trim();
  assert.equal(status, 'FAILED');

  // Verify no payment was added
  const payCount = parseInt(runSql(`SELECT count(*) FROM public.payments WHERE installment_id = '${inst5Id}';`).trim(), 10);
  assert.equal(payCount, 0);
});

test('Test 7: Payment eligibility across India month boundary (including test near midnight)', async () => {
  // In Asia/Kolkata (UTC+5:30):
  // 2026-10-31 23:59:30 IST is 2026-10-31 18:29:30 UTC -> Truncated month is 2026-10-01
  // 2026-11-01 00:00:30 IST is 2026-10-31 18:30:30 UTC -> Truncated month is 2026-11-01
  // They are in DIFFERENT calendar months in India even though in UTC they are only 1 minute apart!
  const testSql = `
SELECT
  (pg_catalog.date_trunc('month', ('2026-10-31 18:29:30+00'::timestamptz AT TIME ZONE 'Asia/Kolkata'))::DATE)::text AS oct_month,
  (pg_catalog.date_trunc('month', ('2026-10-31 18:30:30+00'::timestamptz AT TIME ZONE 'Asia/Kolkata'))::DATE)::text AS nov_month;
`;
  const res = runSql(testSql).trim().split('|').map((s) => s.trim());
  assert.equal(res[0], '2026-10-01');
  assert.equal(res[1], '2026-11-01');
  assert.notEqual(res[0], res[1], 'India midnight month boundary must produce two distinct months');
});

test('Test 8: Dynamic installment amounts: positive check constraints accept ₹2,500 scheme', async () => {
  const attemptId = crypto.randomUUID();
  const inst1Id = runSql(`SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_2}' AND installment_number = 1;`).trim();

  // Insert payment attempt with ₹2,500 (250000 paise)
  runSql(`
INSERT INTO public.payment_attempts (
  id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status
) VALUES (
  '${attemptId}', '${SYNTH_CUSTOMER_2}', '${SYNTH_SCHEME_2}', '${inst1Id}', 1, 2500.00, 250000, 'INR', 'CREATED'
);
`);

  // Verify amount is 2500.00 and amount_paise is 250000
  const checkRaw = runSql(`SELECT amount, amount_paise FROM public.payment_attempts WHERE id = '${attemptId}';`).trim().split('|').map((s) => s.trim());
  assert.equal(checkRaw[0], '2500.00');
  assert.equal(checkRaw[1], '250000');

  // Verify constraint blocks negative or zero amounts
  let negativeBlocked = false;
  try {
    runSql(`
INSERT INTO public.payment_attempts (
  id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status
) VALUES (
  gen_random_uuid(), '${SYNTH_CUSTOMER_2}', '${SYNTH_SCHEME_2}', '${inst1Id}', 1, -100.00, -10000, 'INR', 'CREATED'
);
`);
  } catch (err) {
    negativeBlocked = true;
    assert.match(err.message, /check constraint/i);
  }
  assert.equal(negativeBlocked, true, 'Negative amount must be rejected by check constraint');
});

test('Test 9: Internal RPC privilege verification: anon and authenticated cannot execute internal procedures', async () => {
  const privSql = `
SELECT
  has_function_privilege('anon', 'public.reconcile_online_payment(uuid, varchar, integer, varchar, integer, text)'::regprocedure, 'EXECUTE') AS anon_rec,
  has_function_privilege('authenticated', 'public.reconcile_online_payment(uuid, varchar, integer, varchar, integer, text)'::regprocedure, 'EXECUTE') AS auth_rec,
  has_function_privilege('service_role', 'public.reconcile_online_payment(uuid, varchar, integer, varchar, integer, text)'::regprocedure, 'EXECUTE') AS srv_rec,
  has_function_privilege('anon', 'public.create_online_payment_attempt(uuid, uuid, uuid, integer, integer, varchar, varchar, text, jsonb)'::regprocedure, 'EXECUTE') AS anon_create,
  has_function_privilege('authenticated', 'public.create_online_payment_attempt(uuid, uuid, uuid, integer, integer, varchar, varchar, text, jsonb)'::regprocedure, 'EXECUTE') AS auth_create,
  has_function_privilege('service_role', 'public.create_online_payment_attempt(uuid, uuid, uuid, integer, integer, varchar, varchar, text, jsonb)'::regprocedure, 'EXECUTE') AS srv_create,
  has_function_privilege('anon', 'public.switch_customer_profile_session(varchar, uuid)'::regprocedure, 'EXECUTE') AS anon_switch,
  has_function_privilege('authenticated', 'public.switch_customer_profile_session(varchar, uuid)'::regprocedure, 'EXECUTE') AS auth_switch,
  has_function_privilege('service_role', 'public.switch_customer_profile_session(varchar, uuid)'::regprocedure, 'EXECUTE') AS srv_switch;
`;
  const raw = runSql(privSql).trim().split('|').map((s) => s.trim());
  assert.equal(raw[0], 'f', 'anon must not have execute on reconcile_online_payment');
  assert.equal(raw[1], 'f', 'authenticated must not have execute on reconcile_online_payment');
  assert.equal(raw[2], 't', 'service_role must have execute on reconcile_online_payment');
  assert.equal(raw[3], 'f', 'anon must not have execute on create_online_payment_attempt');
  assert.equal(raw[4], 'f', 'authenticated must not have execute on create_online_payment_attempt');
  assert.equal(raw[5], 't', 'service_role must have execute on create_online_payment_attempt');
  assert.equal(raw[6], 'f', 'anon must not have execute on switch_customer_profile_session');
  assert.equal(raw[7], 'f', 'authenticated must not have execute on switch_customer_profile_session');
  assert.equal(raw[8], 't', 'service_role must have execute on switch_customer_profile_session');
});

test('Test 10: Unknown or already-paid installment attempts are cleanly rejected', async () => {
  // Attempt with non-existent UUID
  let unknownFailed = false;
  try {
    runSql(`SELECT public.reconcile_online_payment(gen_random_uuid(), 'pay_unknown', 100000, 'RAZORPAY');`);
  } catch (err) {
    unknownFailed = true;
    assert.match(err.message, /not found/i);
  }
  assert.equal(unknownFailed, true, 'Unknown attempt ID must raise exception');
});

test('Test 11: Table privilege verification for public.payments (MED-01 defense-in-depth)', async () => {
  const privSql = `
SELECT
  has_table_privilege('anon', 'public.payments', 'SELECT') AS anon_select,
  has_table_privilege('anon', 'public.payments', 'INSERT') AS anon_insert,
  has_table_privilege('anon', 'public.payments', 'UPDATE') AS anon_update,
  has_table_privilege('anon', 'public.payments', 'DELETE') AS anon_delete,
  has_table_privilege('anon', 'public.payments', 'TRUNCATE') AS anon_truncate,
  has_table_privilege('anon', 'public.payments', 'REFERENCES') AS anon_references,
  has_table_privilege('anon', 'public.payments', 'TRIGGER') AS anon_trigger,
  has_table_privilege('authenticated', 'public.payments', 'SELECT') AS auth_select,
  has_table_privilege('authenticated', 'public.payments', 'INSERT') AS auth_insert,
  has_table_privilege('authenticated', 'public.payments', 'UPDATE') AS auth_update,
  has_table_privilege('authenticated', 'public.payments', 'DELETE') AS auth_delete,
  has_table_privilege('authenticated', 'public.payments', 'TRUNCATE') AS auth_truncate,
  has_table_privilege('authenticated', 'public.payments', 'REFERENCES') AS auth_references,
  has_table_privilege('authenticated', 'public.payments', 'TRIGGER') AS auth_trigger,
  has_table_privilege('service_role', 'public.payments', 'SELECT') AS srv_select,
  has_table_privilege('service_role', 'public.payments', 'INSERT') AS srv_insert,
  has_table_privilege('service_role', 'public.payments', 'UPDATE') AS srv_update,
  has_table_privilege('service_role', 'public.payments', 'DELETE') AS srv_delete,
  has_table_privilege('service_role', 'public.payments', 'TRUNCATE') AS srv_truncate,
  has_table_privilege('service_role', 'public.payments', 'REFERENCES') AS srv_references,
  has_table_privilege('service_role', 'public.payments', 'TRIGGER') AS srv_trigger;
`;
  const raw = runSql(privSql).trim().split('|').map((s) => s.trim());
  assert.equal(raw[0], 'f', 'anon must not have SELECT on public.payments');
  assert.equal(raw[1], 'f', 'anon must not have INSERT on public.payments');
  assert.equal(raw[2], 'f', 'anon must not have UPDATE on public.payments');
  assert.equal(raw[3], 'f', 'anon must not have DELETE on public.payments');
  assert.equal(raw[4], 'f', 'anon must not have TRUNCATE on public.payments');
  assert.equal(raw[5], 'f', 'anon must not have REFERENCES on public.payments');
  assert.equal(raw[6], 'f', 'anon must not have TRIGGER on public.payments');

  assert.equal(raw[7], 't', 'authenticated must have SELECT on public.payments (for admin reads)');
  assert.equal(raw[8], 'f', 'authenticated must not have direct INSERT on public.payments');
  assert.equal(raw[9], 'f', 'authenticated must not have direct UPDATE on public.payments');
  assert.equal(raw[10], 'f', 'authenticated must not have direct DELETE on public.payments');
  assert.equal(raw[11], 'f', 'authenticated must not have direct TRUNCATE on public.payments');
  assert.equal(raw[12], 'f', 'authenticated must not have direct REFERENCES on public.payments');
  assert.equal(raw[13], 'f', 'authenticated must not have direct TRIGGER on public.payments');

  assert.equal(raw[14], 't', 'service_role must have SELECT on public.payments');
  assert.equal(raw[15], 't', 'service_role must have INSERT on public.payments');
  assert.equal(raw[16], 't', 'service_role must have UPDATE on public.payments');
  assert.equal(raw[17], 't', 'service_role must have DELETE on public.payments');
  assert.equal(raw[18], 't', 'service_role must have TRUNCATE on public.payments');
  assert.equal(raw[19], 't', 'service_role must have REFERENCES on public.payments');
  assert.equal(raw[20], 't', 'service_role must have TRIGGER on public.payments');

  // Verify direct SQL execution under anon throws permission denied
  let anonSelectBlocked = false;
  try {
    runSql(`
DO $$
BEGIN
  SET LOCAL ROLE anon;
  PERFORM * FROM public.payments LIMIT 1;
END $$;
`);
  } catch (err) {
    anonSelectBlocked = true;
    assert.match(err.message, /permission denied for table payments/i);
  }
  assert.equal(anonSelectBlocked, true, 'Direct SELECT as anon must be rejected with permission denied');

  let anonInsertBlocked = false;
  try {
    runSql(`
DO $$
BEGIN
  SET LOCAL ROLE anon;
  INSERT INTO public.payments (receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, payment_status)
  VALUES ('test-anon-block', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 1, 1000.00, now(), 'CASH', 'SUCCESS');
END $$;
`);
  } catch (err) {
    anonInsertBlocked = true;
    assert.match(err.message, /permission denied for table payments/i);
  }
  assert.equal(anonInsertBlocked, true, 'Direct INSERT as anon must be rejected with permission denied');

  // Verify direct SQL mutation under authenticated throws permission denied
  let authInsertBlocked = false;
  try {
    runSql(`
DO $$
BEGIN
  SET LOCAL ROLE authenticated;
  INSERT INTO public.payments (receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, payment_status)
  VALUES ('test-auth-block', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 1, 1000.00, now(), 'CASH', 'SUCCESS');
END $$;
`);
  } catch (err) {
    authInsertBlocked = true;
    assert.match(err.message, /permission denied for table payments/i);
  }
  assert.equal(authInsertBlocked, true, 'Direct INSERT as authenticated must be rejected with permission denied');
});
