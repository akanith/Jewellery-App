import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

/**
 * RAMYAS JEWELLER — END-TO-END RAZORPAY PAYMENT RECONCILIATION TEST SUITE
 *
 * Verifies the full online payment lifecycle:
 * 1. Missing credentials cleanly rejects initiation without creating attempts or generic links.
 * 2. Configured/mocked credentials creates dynamic Razorpay payment link for exact installment amount in paise.
 * 3. Generic-link fallback is strictly prevented from being used as auto-reconciling link.
 * 4. Pending payment recovery via GET /payment/status without attemptId finds active pending attempt.
 * 5. Attempting payment for a stranger customer scheme profile is rejected (404/403).
 * 6. Unauthenticated payment initiation is rejected with 401 Unauthorized.
 * 7. Zero secret exposure in responses, database metadata, or client payload.
 * 8. Webhook rejects request with invalid HMAC-SHA256 signature (400 Bad Request).
 * 9. Currency mismatch in webhook payload is quarantined and rejected (e.g. USD).
 * 10. Amount mismatch in webhook payload is quarantined and rejected (e.g. 50000 paise).
 * 11. Webhook event with unknown payment reference does not modify financial ledger.
 * 12. Valid captured payment webhook atomically records payment in canonical ledger and updates installment.
 * 13. Duplicate / replayed webhook does NOT duplicate ledger entries (Idempotency verified).
 * 14. Concurrent webhook deliveries simulation: row lock ensures exactly 1 payment record is created.
 * 15. Cash-paid installment collision: installment paid in cash cannot be paid again via online webhook.
 * 16. Online-paid installment collision: installment paid online cannot be paid again via cash.
 * 17. Customer Passbook and Dashboard reflect canonical payment automatically.
 * 18. Admin Web ledger query displays recorded Razorpay payment with method and reference.
 * 19. Pre- and Post-test baseline counts are strictly 100% matched.
 */

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';
const WEBHOOK_SECRET = 'local_dev_webhook_secret_31337';

const MOCK_RZP_HEADERS = {
  'x-razorpay-key-id': 'rzp_test_mock_audit_key',
  'x-razorpay-key-secret': 'mock_audit_secret_31337',
  'x-mock-razorpay': 'true',
};

// Dedicated synthetic UUIDs to isolate test execution
const SYNTH_CUSTOMER_ID = 'c0000000-0000-0000-0000-000000000091';
const STRANGER_CUSTOMER_ID = 'c0000000-0000-0000-0000-000000000092';
const SYNTH_SCHEME_ID = 'b0000000-0000-0000-0000-000000000091';
const STRANGER_SCHEME_ID = 'b0000000-0000-0000-0000-000000000092';

const SYNTH_PHONE = '9666655551';
const STRANGER_PHONE = '9666655552';
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
let synthAuthToken;
let strangerAuthToken;

test.before(async () => {
  initialBaseline = getDatabaseBaseline();

  // Setup synthetic test customers with active scheme and installments
  const setupSql = `
DO $$
DECLARE
  v_c1_id UUID := '${SYNTH_CUSTOMER_ID}';
  v_c2_id UUID := '${STRANGER_CUSTOMER_ID}';
  v_hash TEXT := extensions.crypt('${TEST_PASSWORD}', extensions.gen_salt('bf', 10));
  v_s1_id UUID := '${SYNTH_SCHEME_ID}';
  v_s2_id UUID := '${STRANGER_SCHEME_ID}';
  v_now TIMESTAMPTZ := clock_timestamp();
  i INT;
BEGIN
  -- Insert synthetic profiles
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at) VALUES
    (v_c1_id, 'CUSTOMER', '${SYNTH_PHONE}', 'Synth Razorpay Customer', TRUE, v_now, v_now),
    (v_c2_id, 'CUSTOMER', '${STRANGER_PHONE}', 'Synth Stranger Customer', TRUE, v_now, v_now);

  -- Insert synthetic customers
  INSERT INTO public.customers (id, customer_code, full_name, phone_number, city, created_at, updated_at) VALUES
    (v_c1_id, 'RJ2026-SYNTH-991', 'Synth Razorpay Customer', '${SYNTH_PHONE}', 'Dindigul', v_now, v_now),
    (v_c2_id, 'RJ2026-SYNTH-992', 'Synth Stranger Customer', '${STRANGER_PHONE}', 'Dindigul', v_now, v_now);

  -- Insert customer auth
  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at) VALUES
    (v_c1_id, v_hash, 'ACTIVE', 0, v_now, v_now),
    (v_c2_id, v_hash, 'ACTIVE', 0, v_now, v_now);

  -- Insert schemes
  INSERT INTO public.schemes (id, customer_id, scheme_code, status, slot_number, start_month, end_month) VALUES
    (v_s1_id, v_c1_id, 'RJ-SCH-SYNTH-991', 'ACTIVE', 1, v_now::date, (v_now + INTERVAL '12 months')::date),
    (v_s2_id, v_c2_id, 'RJ-SCH-SYNTH-992', 'ACTIVE', 1, v_now::date, (v_now + INTERVAL '12 months')::date);

  -- Insert 12 installments for scheme 1
  FOR i IN 1..12 LOOP
    INSERT INTO public.scheme_installments (
      scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status
    ) VALUES (
      v_s1_id, v_c1_id, i, (v_now + ((i - 1) || ' months')::interval)::date, (v_now + ((i - 1) || ' months')::interval + INTERVAL '10 days')::date, 1000.00, 'PENDING'
    );
  END LOOP;

  -- Insert 12 installments for scheme 2
  FOR i IN 1..12 LOOP
    INSERT INTO public.scheme_installments (
      scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status
    ) VALUES (
      v_s2_id, v_c2_id, i, (v_now + ((i - 1) || ' months')::interval)::date, (v_now + ((i - 1) || ' months')::interval + INTERVAL '10 days')::date, 1000.00, 'PENDING'
    );
  END LOOP;
END $$;
`;
  runSql(setupSql);

  // Authenticate customer 1 to get bearer session token
  const loginRes1 = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: SYNTH_PHONE, password: TEST_PASSWORD }),
  });
  const loginJson1 = await loginRes1.json();
  assert.equal(loginJson1.success, true);
  synthAuthToken = loginJson1.data?.token || loginJson1.token;

  // Authenticate stranger customer to get stranger bearer session token
  const loginRes2 = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: STRANGER_PHONE, password: TEST_PASSWORD }),
  });
  const loginJson2 = await loginRes2.json();
  assert.equal(loginJson2.success, true);
  strangerAuthToken = loginJson2.data?.token || loginJson2.token;
});

test.after(async () => {
  // Strict cleanup of synthetic test data by exact UUIDs
  const cleanupSql = `
DELETE FROM public.payments WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.payment_attempts WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.scheme_installments WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.scheme_bonuses WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.schemes WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.customer_sessions WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.customer_profile_authorizations WHERE grantor_customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}') OR grantee_customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.customer_auth WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.notifications WHERE customer_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.audit_logs WHERE entity_id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.customers WHERE id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
DELETE FROM public.profiles WHERE id IN ('${SYNTH_CUSTOMER_ID}', '${STRANGER_CUSTOMER_ID}');
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

let createdPaymentAttemptId;
let createdInstallmentNumber;

test('Case 1: Missing Razorpay credentials cleanly rejects initiation without creating attempts or generic links', async () => {
  // Call initiate WITHOUT Razorpay key headers or env
  const res = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken}`,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID }),
  });

  const json = await res.json();
  assert.equal(res.status, 503, 'Must return 503 Service Unavailable when credentials are missing');
  assert.equal(json.success, false);
  assert.equal(json.code, 'PAYMENT_GATEWAY_NOT_CONFIGURED');
  assert.equal(json.paymentLinkUrl, undefined, 'Must not return any checkout URL');
  assert.equal(json.paymentAttemptId, undefined, 'Must not create any payment attempt ID');

  // Verify zero payment attempt records created in the database
  const countRaw = runSql(`SELECT count(*) FROM public.payment_attempts WHERE customer_id = '${SYNTH_CUSTOMER_ID}';`);
  assert.equal(parseInt(countRaw.trim(), 10), 0, 'No attempt record must be stored without credentials');
});

test('Case 2: Configured/mocked credentials creates dynamic Razorpay payment link for exact installment amount in paise', async () => {
  const res = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID, installmentNumber: 1 }),
  });

  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.success, true);
  assert.ok(json.paymentAttemptId, 'Must return paymentAttemptId');
  assert.match(json.paymentLinkUrl, /^https:\/\/rzp\.io\/i\/plink_test_/, 'Must return dynamic Razorpay link');
  assert.equal(json.paymentLinkUrl.includes('razorpay.me/@ramyasjeweller'), false, 'Must not use generic static link');
  assert.equal(json.amount, 1000, 'Must charge exact ₹1,000');
  assert.equal(json.amountPaise, 100000, 'Must record exact 100000 subunits (paise)');
  assert.equal(json.currency, 'INR');
  assert.equal(json.installmentNumber, 1);

  createdPaymentAttemptId = json.paymentAttemptId;
  createdInstallmentNumber = json.installmentNumber;

  // Verify attempt row stored in database with CREATED status
  const sql = `SELECT status, amount, amount_paise, currency FROM public.payment_attempts WHERE id = '${createdPaymentAttemptId}';`;
  const raw = runSql(sql);
  assert.match(raw, /CREATED/);
  assert.match(raw, /1000\.00/);
  assert.match(raw, /100000/);
});

test('Case 3: Pending payment recovery via GET /payment/status without attemptId finds active pending attempt', async () => {
  const res = await fetch(`${BFF_URL}/payment/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${synthAuthToken}`,
    },
  });

  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.success, true);
  assert.ok(json.data, 'Must recover active pending attempt');
  assert.equal(json.data.paymentAttemptId, createdPaymentAttemptId);
  assert.equal(json.data.status, 'CREATED');
  assert.equal(json.data.isPaid, false);
});

test('Case 4: Attempting payment for a stranger customer scheme profile is rejected (404/403)', async () => {
  const res = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${strangerAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID }), // Stranger requesting Customer 1's scheme
  });

  const json = await res.json();
  assert.equal(res.status, 404);
  assert.equal(json.success, false);
  assert.match(json.error, /not found/i);
});

test('Case 5: Unauthenticated payment initiation is rejected with 401 Unauthorized', async () => {
  const res = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID }),
  });

  assert.equal(res.status, 401);
});

test('Case 6: Razorpay API secrets never appear in client responses, bundles, or database attempts', async () => {
  const res = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID }),
  });

  const responseText = await res.text();
  assert.equal(responseText.includes('RAZORPAY_KEY_SECRET'), false);
  assert.equal(responseText.includes('RAZORPAY_WEBHOOK_SECRET'), false);
  assert.equal(responseText.includes('mock_audit_secret_31337'), false);

  // Check attempt metadata in database
  const raw = runSql(`SELECT metadata::text FROM public.payment_attempts WHERE id = '${createdPaymentAttemptId}';`);
  assert.equal(raw.includes('secret'), false);
});

test('Case 7: Webhook rejects request with invalid HMAC-SHA256 signature (400 Bad Request)', async () => {
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_synth_invalid_sig',
          amount: 100000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: createdPaymentAttemptId },
        },
      },
    },
  });

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
    },
    body: payload,
  });

  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.success, false);
  assert.match(json.error, /invalid.*signature/i);
});

test('Case 8: Currency mismatch in webhook payload is quarantined and rejected (e.g. USD)', async () => {
  const mismatchPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_synth_cur_mismatch_${Date.now()}`,
          amount: 100000,
          currency: 'USD', // Currency mismatch!
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: createdPaymentAttemptId },
        },
      },
    },
  });

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(mismatchPayload)
    .digest('hex');

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: mismatchPayload,
  });

  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /mismatch/i);
});

test('Case 9: Amount mismatch in webhook payload is quarantined and rejected (e.g. 50000 paise)', async () => {
  // Create another attempt for installment 2
  const initRes = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID, installmentNumber: 2 }),
  });
  const initJson = await initRes.json();
  assert.equal(initJson.success, true);
  const attempt2Id = initJson.paymentAttemptId;

  // Send webhook with 50000 paise (₹500 instead of ₹1,000)
  const mismatchPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_synth_mismatch_${Date.now()}`,
          amount: 50000, // Amount mismatch!
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: attempt2Id },
        },
      },
    },
  });

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(mismatchPayload)
    .digest('hex');

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: mismatchPayload,
  });

  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /mismatch/i);

  // Verify attempt is marked FAILED and installment 2 is NOT marked paid
  const attCheck = runSql(`SELECT status, reconciliation_notes FROM public.payment_attempts WHERE id = '${attempt2Id}';`);
  assert.match(attCheck, /FAILED/);
  assert.match(attCheck, /mismatch/i);

  const instCheck = runSql(`SELECT status FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_ID}' AND installment_number = 2;`);
  assert.match(instCheck, /PENDING/);
});

test('Case 10: Webhook event with unknown payment reference does NOT modify financial ledger', async () => {
  const countBefore = parseInt(runSql(`SELECT count(*) FROM public.payments;`).trim(), 10);

  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_synth_stranger_unmapped',
          amount: 100000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: '00000000-0000-0000-0000-000000000000' },
        },
      },
    },
  });

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: payload,
  });

  const json = await res.json();
  assert.equal(json.success, false);

  const countAfter = parseInt(runSql(`SELECT count(*) FROM public.payments;`).trim(), 10);
  assert.equal(countAfter, countBefore, 'Payments table count must not change on unmapped attempt');
});

const synthPaymentId1 = `pay_synth_${Date.now()}`;

test('Case 11: Valid captured payment webhook atomically records payment in canonical ledger and updates installment', async () => {
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: synthPaymentId1,
          amount: 100000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: createdPaymentAttemptId },
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validSignature,
    },
    body: payload,
  });

  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.success, true);
  assert.equal(json.processed, true);
  assert.ok(json.result?.payment_id, 'Must return recorded payment ID');
  assert.match(json.result?.receipt_number, /^RJ-RCP-/);

  // Verify in public.payments (canonical financial ledger)
  const paySql = `SELECT receipt_number, amount, payment_method, transaction_reference, payment_status, recorded_by FROM public.payments WHERE transaction_reference = '${synthPaymentId1}';`;
  const payRaw = runSql(paySql);
  assert.match(payRaw, /1000\.00/);
  assert.match(payRaw, /UPI/);
  assert.match(payRaw, new RegExp(synthPaymentId1));
  assert.match(payRaw, /SUCCESS/);

  // Verify installment in public.scheme_installments is now PAID
  const instSql = `SELECT status, paid_amount, paid_date FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_ID}' AND installment_number = 1;`;
  const instRaw = runSql(instSql);
  assert.match(instRaw, /PAID/);
  assert.match(instRaw, /1000\.00/);

  // Verify payment_attempts is marked PAID
  const attSql = `SELECT status, razorpay_payment_id FROM public.payment_attempts WHERE id = '${createdPaymentAttemptId}';`;
  const attRaw = runSql(attSql);
  assert.match(attRaw, /PAID/);
  assert.match(attRaw, new RegExp(synthPaymentId1));
});

test('Case 12: Duplicate / replayed webhook does NOT duplicate ledger entries (Idempotency verified)', async () => {
  // Query payments count before replay
  const beforeCountRaw = runSql(`SELECT count(*) FROM public.payments WHERE customer_id = '${SYNTH_CUSTOMER_ID}';`);
  const beforeCount = parseInt(beforeCountRaw.trim(), 10);
  assert.equal(beforeCount, 1);

  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: synthPaymentId1,
          amount: 100000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: createdPaymentAttemptId },
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const res = await fetch(`${BFF_URL}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validSignature,
    },
    body: payload,
  });

  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.success, true);
  assert.equal(json.result?.already_processed, true);

  // Count must strictly remain 1 (zero duplication!)
  const afterCountRaw = runSql(`SELECT count(*) FROM public.payments WHERE customer_id = '${SYNTH_CUSTOMER_ID}';`);
  const afterCount = parseInt(afterCountRaw.trim(), 10);
  assert.equal(afterCount, 1);
});

test('Case 13: Concurrent webhook deliveries simulation: row lock ensures exactly 1 payment record is created', async () => {
  // Create an attempt for stranger customer installment 1
  const initRes = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${strangerAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: STRANGER_SCHEME_ID, installmentNumber: 1 }),
  });
  const initJson = await initRes.json();
  assert.equal(initJson.success, true);
  const concurrentAttemptId = initJson.paymentAttemptId;
  const concurrentPaymentId = `pay_synth_concurrent_${Date.now()}`;

  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: concurrentPaymentId,
          amount: 100000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { payment_attempt_id: concurrentAttemptId },
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Send 2 webhook requests simultaneously in parallel
  const [res1, res2] = await Promise.all([
    fetch(`${BFF_URL}/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: payload,
    }),
    fetch(`${BFF_URL}/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validSignature,
      },
      body: payload,
    }),
  ]);

  const [json1, json2] = await Promise.all([res1.json(), res2.json()]);
  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  assert.equal(json1.success, true);
  assert.equal(json2.success, true);

  // Exactly 1 payment record must be created in public.payments
  const concurrentCountRaw = runSql(`SELECT count(*) FROM public.payments WHERE transaction_reference = '${concurrentPaymentId}';`);
  assert.equal(parseInt(concurrentCountRaw.trim(), 10), 1, 'Only one payment row must be created under concurrency');
});

test('Case 14: Cash-paid installment collision: installment paid in cash cannot be paid again via online webhook', async () => {
  // Mark installment 4 as paid via counter cash in previous month to test installment-level collision without monthly conflict
  const markCashSql = `
DO $$
DECLARE
  v_scheme RECORD;
  v_inst RECORD;
  v_receipt VARCHAR(50) := 'RJ-RCP-2026-CASH04';
BEGIN
  SELECT * INTO v_scheme FROM public.schemes WHERE id = '${SYNTH_SCHEME_ID}';
  SELECT * INTO v_inst FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_ID}' AND installment_number = 4;

  INSERT INTO public.payments (
    receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, transaction_reference, payment_status, recorded_by
  ) VALUES (
    v_receipt, v_scheme.customer_id, v_scheme.id, v_inst.id, 4, 1000.00, (clock_timestamp() - INTERVAL '1 month'), 'CASH', 'CASH-COUNTER', 'SUCCESS', NULL
  );

  UPDATE public.scheme_installments
  SET status = 'PAID', paid_amount = 1000.00, paid_date = (clock_timestamp() - INTERVAL '1 month')
  WHERE id = v_inst.id;
END $$;
`;
  runSql(markCashSql);

  // 1. Attempt to initiate online payment for installment 4 should be rejected upfront
  const initRes = await fetch(`${BFF_URL}/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${synthAuthToken}`,
      ...MOCK_RZP_HEADERS,
    },
    body: JSON.stringify({ schemeId: SYNTH_SCHEME_ID, installmentNumber: 4 }),
  });

  const initJson = await initRes.json();
  assert.equal(initRes.status, 400);
  assert.equal(initJson.success, false);
  assert.match(initJson.error, /already paid/i);

  // 2. Even if a webhook arrives for an attempt linked to this installment, reconcile_online_payment rejects it
  const dummyAttemptId = crypto.randomUUID();
  const getInstSql = `SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_ID}' AND installment_number = 4;`;
  const inst4Id = runSql(getInstSql).trim();

  runSql(`
INSERT INTO public.payment_attempts (id, customer_id, scheme_id, installment_id, installment_number, amount, amount_paise, currency, status)
VALUES ('${dummyAttemptId}', '${SYNTH_CUSTOMER_ID}', '${SYNTH_SCHEME_ID}', '${inst4Id}', 4, 1000.00, 100000, 'INR', 'CREATED');
`);

  const rpcResultRaw = runSql(`
SELECT public.reconcile_online_payment(
  '${dummyAttemptId}'::uuid,
  'pay_synth_cash_collision_${Date.now()}',
  100000,
  'RAZORPAY'
)::text;
`);
  const rpcResult = JSON.parse(rpcResultRaw.trim());
  assert.equal(rpcResult.success, false);
  assert.ok(rpcResult.error === 'ALREADY_PAID' || rpcResult.error === 'MONTHLY_LIMIT_EXCEEDED', 'Must reject online reconciliation');

  // Verify only 1 payment exists for installment 4 (the cash payment)
  const payCountRaw = runSql(`SELECT count(*) FROM public.payments WHERE installment_id = '${inst4Id}';`);
  assert.equal(parseInt(payCountRaw.trim(), 10), 1);
});

test('Case 15: Online-paid installment collision: installment paid online cannot be paid again via cash', async () => {
  // Installment 1 was paid online via Razorpay in Case 11
  const getInstSql = `SELECT id FROM public.scheme_installments WHERE scheme_id = '${SYNTH_SCHEME_ID}' AND installment_number = 1;`;
  const inst1Id = runSql(getInstSql).trim();

  // Attempting to record cash payment for installment 1 must fail due to unique constraint on payments(installment_id)
  let failed = false;
  try {
    runSql(`
INSERT INTO public.payments (
  receipt_number, customer_id, scheme_id, installment_id, installment_number, amount, payment_method, transaction_reference, payment_status, recorded_by
) VALUES (
  'RJ-RCP-2026-CASHDUPE', '${SYNTH_CUSTOMER_ID}', '${SYNTH_SCHEME_ID}', '${inst1Id}', 1, 1000.00, 'CASH', 'CASH-COUNTER', 'SUCCESS', NULL
);
`);
  } catch (err) {
    failed = true;
    assert.match(err.message, /unique constraint|payments_installment_id/i);
  }
  assert.equal(failed, true, 'Database unique constraint must block duplicate payment for installment 1');
});

test('Case 16: Customer Passbook and Dashboard reflect canonical payment automatically', async () => {
  // Query Passbook from Customer BFF
  const passRes = await fetch(`${BFF_URL}/passbook?schemeId=${SYNTH_SCHEME_ID}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${synthAuthToken}`,
    },
  });

  const passJson = await passRes.json();
  assert.equal(passRes.status, 200);
  assert.equal(passJson.success, true);

  const passData = passJson.data;
  assert.ok(passData.paidInstallments >= 2, 'Must have at least 2 paid installments');
  assert.ok(passData.paidAmount >= 2000, 'Must reflect at least ₹2,000 paid');

  const inst1 = passData.installments.find((i) => i.installmentNumber === 1);
  assert.equal(inst1.status, 'PAID');
  assert.ok(inst1.receiptNumber, 'Paid installment must show receipt number from public.payments');

  // Query Dashboard from Customer BFF
  const dashRes = await fetch(`${BFF_URL}/dashboard`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${synthAuthToken}`,
    },
  });

  const dashJson = await dashRes.json();
  assert.equal(dashRes.status, 200);
  assert.equal(dashJson.success, true);
  assert.ok(dashJson.data.recentPayments.length >= 1, 'Must include newly recorded payment in recent payments');
});

test('Case 17: Admin Web ledger query displays recorded Razorpay payment with method and reference', async () => {
  // Query exactly as Admin Web payments page does
  const adminQuerySql = `
SELECT json_build_object(
  'receipt_number', p.receipt_number,
  'customer_name', c.full_name,
  'customer_code', c.customer_code,
  'scheme_code', s.scheme_code,
  'installment_number', p.installment_number,
  'amount', p.amount,
  'payment_method', p.payment_method,
  'transaction_reference', p.transaction_reference,
  'payment_status', p.payment_status
)::text
FROM public.payments p
JOIN public.customers c ON c.id = p.customer_id
JOIN public.schemes s ON s.id = p.scheme_id
WHERE p.customer_id = '${SYNTH_CUSTOMER_ID}' AND p.installment_number = 1 AND (p.payment_method = 'RAZORPAY' OR p.transaction_reference LIKE 'pay_synth_%')
LIMIT 1;
`;
  const raw = runSql(adminQuerySql);
  const row = JSON.parse(raw.trim());

  assert.equal(row.customer_code, 'RJ2026-SYNTH-991');
  assert.equal(row.customer_name, 'Synth Razorpay Customer');
  assert.equal(row.scheme_code, 'RJ-SCH-SYNTH-991');
  assert.equal(row.installment_number, 1);
  assert.equal(row.amount, 1000.00);
  assert.ok(row.payment_method === 'RAZORPAY' || row.payment_method === 'UPI');
  assert.match(row.transaction_reference, /^pay_synth_/);
  assert.equal(row.payment_status, 'SUCCESS');
});
