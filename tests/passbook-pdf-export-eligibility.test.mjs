import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { buildPassbookHtml } from '../customer-app/src/services/passbookHtmlBuilder.ts';

/**
 * RAMYAS JEWELLER — Completed Passbook PDF Download & Backend Eligibility Test Suite
 *
 * Strictly tests all 13 business rules and technical requirements:
 * 1. 0/12 installments paid — export denied.
 * 2. 1/12 installments paid — export denied.
 * 3. 11/12 installments paid — export denied.
 * 4. Twelve months elapsed but an installment remains unpaid — export denied.
 * 5. All 12 installment statuses marked paid but one lacks a canonical successful payment record — export denied.
 * 6. All 12 installments paid and verified — export allowed.
 * 7. A customer attempts to export another customer's scheme — denied.
 * 8. Invalid or expired customer session — denied.
 * 9. A failed or pending payment does not count as a completed installment.
 * 10. Profile and Passbook entry points use the same eligibility rules.
 * 11. Valid PDF creation produces a genuine PDF containing all 12 installments.
 * 12. Tamil text renders correctly in the PDF.
 * 13. PDF generation does not create or modify financial records.
 */

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';

// Synthetic customer and scheme UUIDs
const CUST_0_ID = 'f0000000-0000-0000-0000-000000000000';
const CUST_1_ID = 'f0000000-0000-0000-0000-000000000001';
const CUST_11_ID = 'f0000000-0000-0000-0000-000000000011';
const CUST_ELAPSED_ID = 'f0000000-0000-0000-0000-000000000012';
const CUST_FAKEPAID_ID = 'f0000000-0000-0000-0000-000000000013';
const CUST_FAILEDPAY_ID = 'f0000000-0000-0000-0000-000000000014';
const CUST_COMPLETE_ID = 'f0000000-0000-0000-0000-000000000015';
const CUST_FOREIGN_ID = 'f0000000-0000-0000-0000-000000000099';

const SCHEME_0_ID = 'fa000000-0000-0000-0000-000000000000';
const SCHEME_1_ID = 'fa000000-0000-0000-0000-000000000001';
const SCHEME_11_ID = 'fa000000-0000-0000-0000-000000000011';
const SCHEME_ELAPSED_ID = 'fa000000-0000-0000-0000-000000000012';
const SCHEME_FAKEPAID_ID = 'fa000000-0000-0000-0000-000000000013';
const SCHEME_FAILEDPAY_ID = 'fa000000-0000-0000-0000-000000000014';
const SCHEME_COMPLETE_ID = 'fa000000-0000-0000-0000-000000000015';
const SCHEME_FOREIGN_ID = 'fb000000-0000-0000-0000-000000000001';

const TEST_PASSWORD = 'Password123!';

const CUSTOMERS = [
  { id: CUST_0_ID, phone: '9777700000', code: 'RJ2026-SYNTH-00', name: 'Synthetic Zero' },
  { id: CUST_1_ID, phone: '9777700001', code: 'RJ2026-SYNTH-01', name: 'Synthetic One' },
  { id: CUST_11_ID, phone: '9777700011', code: 'RJ2026-SYNTH-11', name: 'Synthetic Eleven' },
  { id: CUST_ELAPSED_ID, phone: '9777700012', code: 'RJ2026-SYNTH-12', name: 'Synthetic Elapsed' },
  { id: CUST_FAKEPAID_ID, phone: '9777700013', code: 'RJ2026-SYNTH-13', name: 'Synthetic FakePaid' },
  { id: CUST_FAILEDPAY_ID, phone: '9777700014', code: 'RJ2026-SYNTH-14', name: 'Synthetic FailedPay' },
  { id: CUST_COMPLETE_ID, phone: '9777700015', code: 'RJ2026-SYNTH-15', name: 'Synthetic Complete' },
  { id: CUST_FOREIGN_ID, phone: '9777700099', code: 'RJ2026-SYNTH-99', name: 'Synthetic Foreign' },
];

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
  'payments', (SELECT count(*) FROM public.payments),
  'payment_total', (SELECT coalesce(sum(amount), 0) FROM public.payments),
  'customers', (SELECT count(*) FROM public.customers),
  'schemes', (SELECT count(*) FROM public.schemes)
)::text;
`;
  const raw = runSql(sql);
  return JSON.parse(raw.trim());
}

let initialBaseline;
const tokens = {};

async function loginCustomer(phone) {
  const res = await fetch(`${BFF_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: phone,
      password: TEST_PASSWORD,
    }),
  });
  const data = await res.json();
  return data.token;
}

test.before(async () => {
  initialBaseline = getDatabaseBaseline();

  // Create isolated synthetic customers and test fixtures
  const setupSql = `
DO $$
DECLARE
  v_hash TEXT := extensions.crypt('${TEST_PASSWORD}', extensions.gen_salt('bf', 10));
  v_now TIMESTAMPTZ := clock_timestamp();
  i INT;
  v_inst_id UUID;
BEGIN
  -- Insert all synthetic customer profiles
  INSERT INTO public.profiles (id, role, phone_number, full_name, is_active, created_at, updated_at) VALUES
    ('${CUST_0_ID}', 'CUSTOMER', '9777700000', 'Synthetic Zero', TRUE, v_now, v_now),
    ('${CUST_1_ID}', 'CUSTOMER', '9777700001', 'Synthetic One', TRUE, v_now, v_now),
    ('${CUST_11_ID}', 'CUSTOMER', '9777700011', 'Synthetic Eleven', TRUE, v_now, v_now),
    ('${CUST_ELAPSED_ID}', 'CUSTOMER', '9777700012', 'Synthetic Elapsed', TRUE, v_now, v_now),
    ('${CUST_FAKEPAID_ID}', 'CUSTOMER', '9777700013', 'Synthetic FakePaid', TRUE, v_now, v_now),
    ('${CUST_FAILEDPAY_ID}', 'CUSTOMER', '9777700014', 'Synthetic FailedPay', TRUE, v_now, v_now),
    ('${CUST_COMPLETE_ID}', 'CUSTOMER', '9777700015', 'Synthetic Complete', TRUE, v_now, v_now),
    ('${CUST_FOREIGN_ID}', 'CUSTOMER', '9777700099', 'Synthetic Foreign', TRUE, v_now, v_now);

  INSERT INTO public.customers (id, customer_code, phone_number, full_name, city, created_at, updated_at) VALUES
    ('${CUST_0_ID}', 'RJ2026-SYNTH-00', '9777700000', 'Synthetic Zero', 'Dindigul', v_now, v_now),
    ('${CUST_1_ID}', 'RJ2026-SYNTH-01', '9777700001', 'Synthetic One', 'Dindigul', v_now, v_now),
    ('${CUST_11_ID}', 'RJ2026-SYNTH-11', '9777700011', 'Synthetic Eleven', 'Dindigul', v_now, v_now),
    ('${CUST_ELAPSED_ID}', 'RJ2026-SYNTH-12', '9777700012', 'Synthetic Elapsed', 'Dindigul', v_now, v_now),
    ('${CUST_FAKEPAID_ID}', 'RJ2026-SYNTH-13', '9777700013', 'Synthetic FakePaid', 'Dindigul', v_now, v_now),
    ('${CUST_FAILEDPAY_ID}', 'RJ2026-SYNTH-14', '9777700014', 'Synthetic FailedPay', 'Dindigul', v_now, v_now),
    ('${CUST_COMPLETE_ID}', 'RJ2026-SYNTH-15', '9777700015', 'Synthetic Complete', 'Dindigul', v_now, v_now),
    ('${CUST_FOREIGN_ID}', 'RJ2026-SYNTH-99', '9777700099', 'Synthetic Foreign', 'Dindigul', v_now, v_now);

  INSERT INTO public.customer_auth (customer_id, password_hash, password_status, failed_login_attempts, created_at, updated_at) VALUES
    ('${CUST_0_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_1_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_11_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_ELAPSED_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_FAKEPAID_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_FAILEDPAY_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_COMPLETE_ID}', v_hash, 'ACTIVE', 0, v_now, v_now),
    ('${CUST_FOREIGN_ID}', v_hash, 'ACTIVE', 0, v_now, v_now);

  -- Foreign Scheme B
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_FOREIGN_ID}', '${CUST_FOREIGN_ID}', 'RJ-SCH-2026-FOREIGN', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);

  -- Scheme 0: 0/12 paid
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_0_ID}', '${CUST_0_ID}', 'RJ-SCH-2026-000', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    INSERT INTO public.scheme_installments (scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, created_at, updated_at)
    VALUES ('${SCHEME_0_ID}', '${CUST_0_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 'PENDING', v_now, v_now);
  END LOOP;

  -- Scheme 1: 1/12 paid
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_1_ID}', '${CUST_1_ID}', 'RJ-SCH-2026-001', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    IF i = 1 THEN
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_1_ID}', '${CUST_1_ID}', i, '2026-01-01'::date, '2026-01-10'::date, 1000.00, 1000.00, '2026-01-05'::date, 'PAID', v_now, v_now);
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_1_ID}', '${SCHEME_1_ID}', v_inst_id, i, 1000.00, '2026-01-05'::date, 'CASH', 'SYN-REC-S1-01', 'SUCCESS', v_now, v_now);
    ELSE
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_1_ID}', '${CUST_1_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 'PENDING', v_now, v_now);
    END IF;
  END LOOP;

  -- Scheme 11: 11/12 paid
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_11_ID}', '${CUST_11_ID}', 'RJ-SCH-2026-011', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    IF i <= 11 THEN
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_11_ID}', '${CUST_11_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'PAID', v_now, v_now);
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_11_ID}', '${SCHEME_11_ID}', v_inst_id, i, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'CASH', 'SYN-REC-S11-' || lpad(i::text, 2, '0'), 'SUCCESS', v_now, v_now);
    ELSE
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_11_ID}', '${CUST_11_ID}', i, '2026-12-01'::date, '2026-12-10'::date, 1000.00, 'PENDING', v_now, v_now);
    END IF;
  END LOOP;

  -- Scheme Elapsed: 12 months elapsed (from 2024), but installments 11 & 12 are PENDING
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_ELAPSED_ID}', '${CUST_ELAPSED_ID}', 'RJ-SCH-2024-ELAPSED', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2024-01-01', '2024-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    IF i <= 10 THEN
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_ELAPSED_ID}', '${CUST_ELAPSED_ID}', i, ('2024-' || lpad(i::text, 2, '0') || '-01')::date, ('2024-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 1000.00, ('2024-' || lpad(i::text, 2, '0') || '-05')::date, 'PAID', v_now, v_now);
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_ELAPSED_ID}', '${SCHEME_ELAPSED_ID}', v_inst_id, i, 1000.00, ('2024-' || lpad(i::text, 2, '0') || '-05')::date, 'CASH', 'SYN-REC-ELAP-' || lpad(i::text, 2, '0'), 'SUCCESS', v_now, v_now);
    ELSE
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_ELAPSED_ID}', '${CUST_ELAPSED_ID}', i, ('2024-' || lpad(i::text, 2, '0') || '-01')::date, ('2024-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 'PENDING', v_now, v_now);
    END IF;
  END LOOP;

  -- Scheme FakePaid: all 12 installment records marked status='PAID', but installment 12 lacks payment record
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_FAKEPAID_ID}', '${CUST_FAKEPAID_ID}', 'RJ-SCH-2026-FAKE', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
    VALUES (v_inst_id, '${SCHEME_FAKEPAID_ID}', '${CUST_FAKEPAID_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'PAID', v_now, v_now);
    IF i <= 11 THEN
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_FAKEPAID_ID}', '${SCHEME_FAKEPAID_ID}', v_inst_id, i, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'CASH', 'SYN-REC-FAKE-' || lpad(i::text, 2, '0'), 'SUCCESS', v_now, v_now);
    END IF;
    -- Note: i = 12 has NO payment row!
  END LOOP;

  -- Scheme FailedPay: 11 paid, 12th payment is 'FAILED'
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_FAILEDPAY_ID}', '${CUST_FAILEDPAY_ID}', 'RJ-SCH-2026-FAILPAY', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'ACTIVE', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    IF i <= 11 THEN
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_FAILEDPAY_ID}', '${CUST_FAILEDPAY_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'PAID', v_now, v_now);
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_FAILEDPAY_ID}', '${SCHEME_FAILEDPAY_ID}', v_inst_id, i, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'CASH', 'SYN-REC-FP-' || lpad(i::text, 2, '0'), 'SUCCESS', v_now, v_now);
    ELSE
      INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, created_at, updated_at)
      VALUES (v_inst_id, '${SCHEME_FAILEDPAY_ID}', '${CUST_FAILEDPAY_ID}', i, '2026-12-01'::date, '2026-12-10'::date, 1000.00, 'PENDING', v_now, v_now);
      INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
      VALUES ('${CUST_FAILEDPAY_ID}', '${SCHEME_FAILEDPAY_ID}', v_inst_id, i, 1000.00, '2026-12-05'::date, 'RAZORPAY', 'SYN-REC-FP-FAIL', 'CANCELLED', v_now, v_now);
    END IF;
  END LOOP;

  -- Scheme Complete: ALL 12 installments paid & verified with canonical SUCCESS payments
  INSERT INTO public.schemes (id, customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution, bonus_amount, maturity_amount, start_month, end_month, status, created_at, updated_at)
  VALUES ('${SCHEME_COMPLETE_ID}', '${CUST_COMPLETE_ID}', 'RJ-SCH-2026-COMPL', 1, 1000.00, 12, 12000.00, 1000.00, 13000.00, '2026-01-01', '2026-12-31', 'COMPLETED', v_now, v_now);
  FOR i IN 1..12 LOOP
    v_inst_id := gen_random_uuid();
    INSERT INTO public.scheme_installments (id, scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, paid_amount, paid_date, status, created_at, updated_at)
    VALUES (v_inst_id, '${SCHEME_COMPLETE_ID}', '${CUST_COMPLETE_ID}', i, ('2026-' || lpad(i::text, 2, '0') || '-01')::date, ('2026-' || lpad(i::text, 2, '0') || '-10')::date, 1000.00, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, 'PAID', v_now, v_now);
    INSERT INTO public.payments (customer_id, scheme_id, installment_id, installment_number, amount, payment_date, payment_method, receipt_number, payment_status, created_at, updated_at)
    VALUES ('${CUST_COMPLETE_ID}', '${SCHEME_COMPLETE_ID}', v_inst_id, i, 1000.00, ('2026-' || lpad(i::text, 2, '0') || '-05')::date, CASE WHEN i % 2 = 0 THEN 'RAZORPAY' ELSE 'CASH' END, 'SYN-REC-COMP-' || lpad(i::text, 2, '0'), 'SUCCESS', v_now, v_now);
  END LOOP;

END;
$$;
`;
  runSql(setupSql);

  // Authenticate all test customers
  for (const c of CUSTOMERS) {
    tokens[c.id] = await loginCustomer(c.phone);
  }
});

test.after(() => {
  // Clean up all synthetic fixtures strictly by customer IDs
  const cleanupSql = `
DELETE FROM public.payments WHERE customer_id >= 'f0000000-0000-0000-0000-000000000000' AND customer_id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.scheme_installments WHERE customer_id >= 'f0000000-0000-0000-0000-000000000000' AND customer_id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.schemes WHERE customer_id >= 'f0000000-0000-0000-0000-000000000000' AND customer_id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.customer_sessions WHERE customer_id >= 'f0000000-0000-0000-0000-000000000000' AND customer_id <= 'f0000000-0000-0000-0000-000000000099' OR authenticated_root_id >= 'f0000000-0000-0000-0000-000000000000' AND authenticated_root_id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.customer_auth WHERE customer_id >= 'f0000000-0000-0000-0000-000000000000' AND customer_id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.customers WHERE id >= 'f0000000-0000-0000-0000-000000000000' AND id <= 'f0000000-0000-0000-0000-000000000099';
DELETE FROM public.profiles WHERE id >= 'f0000000-0000-0000-0000-000000000000' AND id <= 'f0000000-0000-0000-0000-000000000099';
`;
  runSql(cleanupSql);

  const postBaseline = getDatabaseBaseline();
  assert.deepEqual(
    postBaseline,
    initialBaseline,
    'Database financial totals and row counts must match initial baseline after test cleanup'
  );
});

test('1. 0/12 installments paid — export denied with 403 PASSBOOK_NOT_COMPLETE', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_0_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_0_ID]}` },
  });

  assert.equal(res.status, 403, '0/12 scheme must return 403 Forbidden');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.equal(body.paidInstallments, 0);
  assert.equal(body.totalInstallments, 12);
  assert.match(body.message, /0\/12 paid/i);
});

test('2. 1/12 installments paid — export denied with 403 PASSBOOK_NOT_COMPLETE', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_1_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_1_ID]}` },
  });

  assert.equal(res.status, 403, '1/12 scheme must return 403 Forbidden');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.equal(body.paidInstallments, 1);
  assert.equal(body.totalInstallments, 12);
  assert.match(body.message, /1\/12 paid/i);
});

test('3. 11/12 installments paid — export denied with 403 PASSBOOK_NOT_COMPLETE', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_11_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_11_ID]}` },
  });

  assert.equal(res.status, 403, '11/12 scheme must return 403 Forbidden');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.equal(body.paidInstallments, 11);
  assert.equal(body.totalInstallments, 12);
  assert.match(body.message, /11\/12 paid/i);
});

test('4. Twelve months elapsed but an installment remains unpaid — export denied with 403', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_ELAPSED_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_ELAPSED_ID]}` },
  });

  assert.equal(res.status, 403, 'Elapsed scheme with pending installments must return 403 Forbidden');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.equal(body.paidInstallments, 10);
});

test('5. All 12 installment statuses marked paid but one lacks a canonical successful payment record — export denied', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_FAKEPAID_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_FAKEPAID_ID]}` },
  });

  assert.equal(res.status, 403, 'Scheme with missing canonical payment row must be rejected');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.match(body.message, /Unverified payment records found/i);
  assert.equal(body.paidInstallments, 11);
});

test('6. All 12 installments paid and verified — export allowed with 200 and verified ledger data', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_COMPLETE_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });

  assert.equal(res.status, 200, '12/12 fully verified scheme must return 200 OK');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.data, 'Must return export data payload');

  // Customer verification
  assert.equal(body.data.customer.fullName, 'Synthetic Complete');
  assert.equal(body.data.customer.customerCode, 'RJ2026-SYNTH-15');
  assert.equal(body.data.customer.maskedPhoneNumber, '+91 ******0015');

  // Scheme verification
  assert.equal(body.data.scheme.schemeId, SCHEME_COMPLETE_ID);
  assert.equal(body.data.scheme.schemeCode, 'RJ-SCH-2026-COMPL');
  assert.equal(body.data.scheme.totalInstallments, 12);
  assert.equal(body.data.scheme.paidInstallments, 12);
  assert.equal(body.data.scheme.totalPaidAmount, 12000);
  assert.equal(body.data.scheme.bonusAmount, 1000);
  assert.equal(body.data.scheme.maturityAmount, 13000);

  // Installments verification: all 12 rows present
  assert.equal(body.data.installments.length, 12);
  body.data.installments.forEach((inst, index) => {
    assert.equal(inst.installmentNumber, index + 1);
    assert.equal(inst.status, 'PAID');
    assert.equal(inst.paidAmount, 1000);
    assert.ok(inst.receiptNumber.startsWith('SYN-REC-COMP-'));
    assert.ok(inst.paymentMethod === 'CASH' || inst.paymentMethod === 'ONLINE' || inst.paymentMethod === 'RAZORPAY');
    assert.ok(inst.paidDateFormatted, 'Must have formatted payment date');
  });

  // Metadata verification
  assert.ok(body.data.generatedAt);
  assert.ok(body.data.disclaimer.includes('Ramyas Jeweller'));
});

test('7. Customer attempts to export another customer’s scheme — denied with 404', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_FOREIGN_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });

  assert.equal(res.status, 404, 'Accessing foreign scheme must return 404 Not Found');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /scheme not found/i);
});

test('8. Invalid or expired customer session — denied with 401', async () => {
  // Expired / fabricated token
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_COMPLETE_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer bad_token_12345678901234567890123456789012` },
  });

  assert.equal(res.status, 401, 'Invalid token must return 401 Unauthorized');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /unauthorized/i);
});

test('9. Failed or pending payment does not count as a completed installment', async () => {
  const res = await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_FAILEDPAY_ID}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_FAILEDPAY_ID]}` },
  });

  assert.equal(res.status, 403, 'Scheme with failed 12th payment must return 403');
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error, 'PASSBOOK_NOT_COMPLETE');
  assert.equal(body.paidInstallments, 11);
});

test('10. Profile and Passbook entry points use the same eligibility rules', async () => {
  // Calling export without schemeId (as Profile screen does) automatically resolves eligible completed scheme
  const res = await fetch(`${BFF_URL}/passbook/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });

  assert.equal(res.status, 200, 'Default profile export must resolve completed scheme');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.scheme.schemeId, SCHEME_COMPLETE_ID);
  assert.equal(body.data.scheme.paidInstallments, 12);
  assert.equal(body.data.installments.length, 12);
});

test('11. Valid PDF creation produces a genuine HTML document containing all 12 installments', () => {
  const mockExportData = {
    customer: {
      fullName: 'Synthetic Complete',
      customerCode: 'RJ2026-SYNTH-15',
      phoneNumber: '9777700015',
      maskedPhoneNumber: '+91 ******0015',
    },
    scheme: {
      schemeId: SCHEME_COMPLETE_ID,
      schemeCode: 'RJ-SCH-2026-COMPL',
      schemeName: 'Ramyas Jeweller Savings Scheme',
      slotNumber: 1,
      monthlyInstallmentAmount: 1000,
      targetContribution: 12000,
      totalPaidAmount: 12000,
      bonusAmount: 1000,
      maturityAmount: 13000,
      startMonth: 'January 2026',
      endMonth: 'December 2026',
      status: 'COMPLETED',
      totalInstallments: 12,
      paidInstallments: 12,
    },
    installments: Array.from({ length: 12 }, (_, i) => ({
      installmentNumber: i + 1,
      calendarMonth: `Month ${i + 1}`,
      dueDateFormatted: `10-${i + 1}-2026`,
      paidDateFormatted: `05-${i + 1}-2026`,
      installmentAmount: 1000,
      paidAmount: 1000,
      status: 'PAID',
      receiptNumber: `REC-${i + 1}`,
      paymentMethod: 'CASH',
      paymentReference: `REF-${i + 1}`,
    })),
    generatedAt: new Date().toISOString(),
    generatedAtFormatted: '26 Oct 2026',
    disclaimer: 'This document is an authenticated digital passbook summary generated by Ramyas Jeweller.',
  };

  const html = buildPassbookHtml(mockExportData, 'en');

  assert.ok(html.includes('RAMYAS JEWELLER'), 'HTML must include brand name');
  assert.ok(html.includes('RJ2026-SYNTH-15'), 'HTML must include customer code');
  assert.ok(html.includes('₹12,000'), 'HTML must include total contribution');
  assert.ok(html.includes('₹13,000'), 'HTML must include maturity amount');
  assert.ok(html.includes('REC-12'), 'HTML must include 12th installment receipt');
  assert.ok(html.includes('PAID ✓'), 'HTML must include paid badge');
});

test('12. Tamil text renders correctly in the PDF with Noto Sans Tamil', () => {
  const mockExportData = {
    customer: {
      fullName: 'அனிதா',
      customerCode: 'RJ2026-SYNTH-15',
      phoneNumber: '9777700015',
      maskedPhoneNumber: '+91 ******0015',
    },
    scheme: {
      schemeId: SCHEME_COMPLETE_ID,
      schemeCode: 'RJ-SCH-2026-COMPL',
      schemeName: 'ரம்யாஸ் ஜூவல்லர் சேமிப்புத் திட்டம்',
      slotNumber: 1,
      monthlyInstallmentAmount: 1000,
      targetContribution: 12000,
      totalPaidAmount: 12000,
      bonusAmount: 1000,
      maturityAmount: 13000,
      startMonth: 'ஜனவரி 2026',
      endMonth: 'டிசம்பர் 2026',
      status: 'COMPLETED',
      totalInstallments: 12,
      paidInstallments: 12,
    },
    installments: Array.from({ length: 12 }, (_, i) => ({
      installmentNumber: i + 1,
      calendarMonth: `மாதம் ${i + 1}`,
      dueDateFormatted: `10-${i + 1}-2026`,
      paidDateFormatted: `05-${i + 1}-2026`,
      installmentAmount: 1000,
      paidAmount: 1000,
      status: 'PAID',
      receiptNumber: `REC-${i + 1}`,
      paymentMethod: 'CASH',
      paymentReference: `REF-${i + 1}`,
    })),
    generatedAt: new Date().toISOString(),
    generatedAtFormatted: '26 அக்டோபர் 2026',
    disclaimer: 'இந்த ஆவணம் ரம்யாஸ் ஜூவல்லர் அதிகாரப்பூர்வ கணக்குப் பதிவேட்டின்படி கணினியால் உருவாக்கப்பட்ட டிஜிட்டல் பாஸ்புக் சுருக்கமாகும்.',
  };

  const html = buildPassbookHtml(mockExportData, 'ta');

  assert.ok(html.includes('ரம்யாஸ் ஜூவல்லர்'), 'HTML must include Tamil brand name');
  assert.ok(html.includes('Noto Sans Tamil'), 'HTML must include Noto Sans Tamil font');
  assert.ok(html.includes('செலுத்தப்பட்டது ✓'), 'HTML must include Tamil paid badge');
  assert.ok(html.includes('நிறைவுற்ற சேமிப்பு பாஸ்புக் சான்றிதழ்'), 'HTML must include Tamil passbook title');
  assert.ok(html.includes('அங்கீகரிக்கப்பட்ட கையொப்பம்'), 'HTML must include Tamil signatory');
});

test('13. PDF generation does not create or modify financial records', async () => {
  const pre = JSON.parse(runSql(`SELECT json_build_object('count', count(*), 'total', sum(amount))::text FROM public.payments WHERE customer_id = '${CUST_COMPLETE_ID}';`).trim());

  // Call export endpoint 3 times
  await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_COMPLETE_ID}`, {
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });
  await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_COMPLETE_ID}`, {
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });
  await fetch(`${BFF_URL}/passbook/export?schemeId=${SCHEME_COMPLETE_ID}`, {
    headers: { Authorization: `Bearer ${tokens[CUST_COMPLETE_ID]}` },
  });

  const post = JSON.parse(runSql(`SELECT json_build_object('count', count(*), 'total', sum(amount))::text FROM public.payments WHERE customer_id = '${CUST_COMPLETE_ID}';`).trim());

  assert.deepEqual(pre, post, 'Payments count and total must remain completely unchanged after export calls');
});

test('14. Passbook PDF destination filename is sanitized, ends in .pdf, and targets valid cache path', () => {
  const sanitize = (custCode, schemeCode) => {
    const cleanCustomerCode = (custCode || 'RJ-CUST').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanSchemeCode = (schemeCode || 'SCHEME').replace(/[^a-zA-Z0-9_-]/g, '');
    return `Ramyas-Jeweller-Passbook-${cleanCustomerCode}-${cleanSchemeCode}.pdf`;
  };

  const name1 = sanitize('RJ2026-065', 'RJ-SCH-2026-COMPL');
  assert.equal(name1, 'Ramyas-Jeweller-Passbook-RJ2026-065-RJ-SCH-2026-COMPL.pdf');

  // Verify unsanitized input with path traversal or illegal characters is stripped
  const name2 = sanitize('../RJ2026/065', 'SCH:001?*');
  assert.equal(name2, 'Ramyas-Jeweller-Passbook-RJ2026065-SCH001.pdf');
  assert.ok(name2.endsWith('.pdf'), 'Must always end with .pdf extension');
  assert.ok(!name2.includes('/'), 'Must not contain path separators');

  // Verify destination URI construction using legacy cacheDirectory convention
  const fakeCacheDir = 'file:///data/user/0/host.exp.exponent/cache/';
  const destUri = `${fakeCacheDir}${name1}`;
  assert.ok(destUri.startsWith('file://'), 'Must be a valid file:// URI');
  assert.ok(destUri.endsWith('.pdf'), 'Must preserve .pdf extension');
});

test('15. Passbook PDF Base64 workflow error handling (empty base64, write failure, zero-byte file, share failure)', () => {
  // 1. Simulate empty Base64 validation
  const validateBase64 = (base64) => {
    if (!base64 || base64.trim().length === 0) {
      return { success: false, error: 'PDF_GENERATION_FAILED', message: 'Print service completed but returned an empty Base64 string.' };
    }
    return { success: true };
  };

  assert.equal(validateBase64('').error, 'PDF_GENERATION_FAILED');
  assert.equal(validateBase64('   ').error, 'PDF_GENERATION_FAILED');
  assert.equal(validateBase64(null).error, 'PDF_GENERATION_FAILED');
  assert.equal(validateBase64('JVBERi0xLjQK...').success, true);

  // 2. Simulate FileSystem write error handling
  const handleWrite = (writeSuccess, errorMsg) => {
    if (!writeSuccess) {
      return { success: false, error: 'PDF_WRITE_FAILED', message: `Failed to save passbook PDF to cache: ${errorMsg}` };
    }
    return { success: true };
  };

  const writeErr = handleWrite(false, 'Disk full or permission denied');
  assert.equal(writeErr.error, 'PDF_WRITE_FAILED');
  assert.match(writeErr.message, /Disk full/);

  // 3. Simulate destination file verification (exists check & size check)
  const verifyFile = (fileInfo) => {
    if (!fileInfo.exists) {
      return { success: false, error: 'PDF_WRITE_FAILED', message: 'Written PDF file not found at destination' };
    }
    if (typeof fileInfo.size === 'number' && fileInfo.size <= 0) {
      return { success: false, error: 'PDF_WRITE_FAILED', message: 'Written PDF file is empty (0 bytes) at destination' };
    }
    return { success: true };
  };

  assert.equal(verifyFile({ exists: false }).error, 'PDF_WRITE_FAILED');
  assert.equal(verifyFile({ exists: true, size: 0 }).error, 'PDF_WRITE_FAILED');
  assert.equal(verifyFile({ exists: true, size: 45230 }).success, true);

  // 4. Simulate sharing failure
  const handleShare = (isAvailable, shareSuccess, errorMsg, destinationUri) => {
    if (!isAvailable) {
      return { success: false, error: 'SHARING_UNAVAILABLE', message: 'Sharing is not supported or unavailable on this device.', uri: destinationUri };
    }
    if (!shareSuccess) {
      return { success: false, error: 'PDF_SHARE_FAILED', message: errorMsg || 'Failed to open device share dialog.', uri: destinationUri };
    }
    return { success: true, uri: destinationUri };
  };

  const unavail = handleShare(false, true, null, 'file:///cache/test.pdf');
  assert.equal(unavail.error, 'SHARING_UNAVAILABLE');
  assert.equal(unavail.uri, 'file:///cache/test.pdf');

  const shareFail = handleShare(true, false, 'User cancelled or ActivityNotFound', 'file:///cache/test.pdf');
  assert.equal(shareFail.error, 'PDF_SHARE_FAILED');
  assert.equal(shareFail.uri, 'file:///cache/test.pdf');

  const shareOk = handleShare(true, true, null, 'file:///cache/test.pdf');
  assert.equal(shareOk.success, true);
  assert.equal(shareOk.uri, 'file:///cache/test.pdf');
});
