-- ==============================================================================
-- RAMYAS JEWELLER — COMPLETED PASSBOOK DEMO FIXTURE
-- Purpose: Isolated synthetic customer with 12/12 completed installments & payments
-- Strictly for local device verification.
-- ==============================================================================

DO $$
DECLARE
  v_cust_id UUID := 'dd000000-0000-0000-0000-000000000012';
  v_scheme_id UUID := 'ee000000-0000-0000-0000-000000000012';
  v_phone VARCHAR := '9800033333';
  v_password_hash TEXT := extensions.crypt('PassbookDemo@2026', extensions.gen_salt('bf', 10));
  v_now TIMESTAMPTZ := clock_timestamp();
  v_inst_id UUID;
  v_pay_id UUID;
  i INT;
BEGIN
  -- 1. Create profiles record
  INSERT INTO public.profiles (
    id, role, phone_number, full_name, is_active, created_at, updated_at
  ) VALUES (
    v_cust_id, 'CUSTOMER', v_phone, U&'DEMO \2014 COMPLETED PASSBOOK TEST', TRUE, v_now, v_now
  ) ON CONFLICT (id) DO UPDATE SET
    phone_number = EXCLUDED.phone_number,
    full_name = EXCLUDED.full_name,
    is_active = TRUE,
    updated_at = v_now;

  -- 2. Create customer record
  INSERT INTO public.customers (
    id, customer_code, phone_number, full_name, address, city, pincode, notes, created_at, updated_at
  ) VALUES (
    v_cust_id, 'RJ2026-DEMO-012', v_phone, U&'DEMO \2014 COMPLETED PASSBOOK TEST',
    'Demo Test Suite, 91 Main Road', 'Dindigul', '624001',
    '[SYNTHETIC_FIXTURE] Local demo customer for completed passbook PDF testing',
    v_now, v_now
  ) ON CONFLICT (id) DO UPDATE SET
    customer_code = EXCLUDED.customer_code,
    phone_number = EXCLUDED.phone_number,
    full_name = EXCLUDED.full_name,
    notes = EXCLUDED.notes,
    updated_at = v_now;

  -- 3. Create customer_auth record (ACTIVE password, 0 failed attempts)
  INSERT INTO public.customer_auth (
    customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
  ) VALUES (
    v_cust_id, v_password_hash, 'ACTIVE', 0, NULL, v_now, v_now
  ) ON CONFLICT (customer_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    password_status = 'ACTIVE',
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = v_now;

  -- 4. Create scheme record (12-installment completed scheme)
  INSERT INTO public.schemes (
    id, customer_id, scheme_code, slot_number, monthly_installment_amount,
    total_installments, target_contribution, bonus_amount, maturity_amount,
    start_month, end_month, status, notes, created_at, updated_at
  ) VALUES (
    v_scheme_id, v_cust_id, 'RJ-SCH-DEMO-COMPL', 1, 1000.00,
    12, 12000.00, 1000.00, 13000.00,
    '2025-01-01'::date, '2025-12-31'::date, 'COMPLETED',
    '[SYNTHETIC_FIXTURE] 12/12 completed passbook demo scheme',
    v_now, v_now
  ) ON CONFLICT (id) DO UPDATE SET
    status = 'COMPLETED',
    updated_at = v_now;

  -- 5. Delete any existing test installments and payments for this specific scheme before inserting clean records
  DELETE FROM public.payments WHERE scheme_id = v_scheme_id;
  DELETE FROM public.scheme_installments WHERE scheme_id = v_scheme_id;

  -- 6. Insert all 12 installments and 12 canonical SUCCESS payments
  FOR i IN 1..12 LOOP
    v_inst_id := ('ee000000-0000-0000-0000-00000000' || lpad((1200 + i)::text, 4, '0'))::uuid;
    v_pay_id  := ('ee000000-0000-0000-0000-00000000' || lpad((2200 + i)::text, 4, '0'))::uuid;

    INSERT INTO public.scheme_installments (
      id, scheme_id, customer_id, installment_number, calendar_month, due_date,
      installment_amount, paid_amount, paid_date, status, notes, created_at, updated_at
    ) VALUES (
      v_inst_id,
      v_scheme_id,
      v_cust_id,
      i,
      ('2025-' || lpad(i::text, 2, '0') || '-01')::date,
      ('2025-' || lpad(i::text, 2, '0') || '-10')::date,
      1000.00,
      1000.00,
      ('2025-' || lpad(i::text, 2, '0') || '-05 10:30:00+05:30')::timestamptz,
      'PAID',
      '[SYNTHETIC_FIXTURE] Completed installment ' || i || ' of 12',
      v_now,
      v_now
    );

    INSERT INTO public.payments (
      id, customer_id, scheme_id, installment_id, installment_number, amount,
      payment_date, payment_method, receipt_number, transaction_reference,
      payment_status, notes, created_at, updated_at
    ) VALUES (
      v_pay_id,
      v_cust_id,
      v_scheme_id,
      v_inst_id,
      i,
      1000.00,
      ('2025-' || lpad(i::text, 2, '0') || '-05 10:30:00+05:30')::timestamptz,
      CASE WHEN i % 2 = 0 THEN 'RAZORPAY' ELSE 'CASH' END,
      'DEMO-REC-COMP-' || lpad(i::text, 2, '0'),
      'DEMO-TXN-2025-' || lpad(i::text, 2, '0'),
      'SUCCESS',
      '[SYNTHETIC_FIXTURE] Canonical test payment for completed passbook installment ' || i,
      v_now,
      v_now
    );
  END LOOP;

  RAISE NOTICE 'Completed passbook demo fixture created successfully for customer % (scheme %)', v_cust_id, v_scheme_id;
END;
$$;
