-- =============================================================================
-- Migration: 20261107120000_fix_historical_installment_classification.sql
-- Description:
--   Enforce rigorous November 2026 Two-Installment Exception with automatic
--   expiration on December 1, 2026 (Asia/Kolkata).
--
-- EXACT BUSINESS RULES:
-- 1. During November 1–30, 2026 (Asia/Kolkata):
--    - Administrators can record an unpaid October 2026 installment (calendar_month = '2026-10-01').
--      It is classified as historical (is_historical = TRUE), requires actual collection date
--      and audit reason (min 5 chars).
--    - The same customer & scheme can record the November 2026 installment (calendar_month = '2026-11-01').
--      It is classified as regular (is_historical = FALSE).
--    - Both installments are permitted to be recorded during November 2026.
-- 2. Never permit duplicate payment for the same installment (enforced by status = 'PAID' & installment_id UNIQUE).
-- 3. Never permit advance payment for December 2026 or later (calendar_month > current_calendar_month).
-- 4. Automatic expiration on December 1, 2026:
--    - On or after December 1, 2026 IST, the October 2026 exception window is closed.
-- 5. Customer online payments and Razorpay attempts cannot pay prior or future months.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPGRADE public.record_installment_payment
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_installment_payment(
    p_scheme_id UUID,
    p_installment_number INTEGER,
    p_payment_method VARCHAR(30) DEFAULT 'CASH',
    p_transaction_reference VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_actual_payment_date DATE DEFAULT CURRENT_DATE,
    p_is_historical BOOLEAN DEFAULT FALSE,
    p_historical_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_scheme RECORD;
    v_installment RECORD;
    v_bonus RECORD;
    v_payment_id UUID;
    v_receipt_number VARCHAR(50);
    v_paid_count INTEGER;
    v_bonus_credited BOOLEAN := FALSE;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_payment_amount NUMERIC(12, 2);
    v_now_ist_date DATE := (v_now AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_current_month DATE := pg_catalog.date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata'))::DATE;
    v_is_nov_2026_window BOOLEAN := (v_now_ist_date >= '2026-11-01'::DATE AND v_now_ist_date <= '2026-11-30'::DATE);
    v_resolved_actual_date DATE;
    v_payment_timestamptz TIMESTAMPTZ;
    v_paid_date TIMESTAMPTZ;
    v_clean_hist_reason TEXT := NULLIF(pg_catalog.btrim(COALESCE(p_historical_reason, '')), '');
    v_is_historical BOOLEAN := FALSE;
BEGIN
    -- 1. Authorization Check (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- 2. Validate installment number boundary
    IF p_installment_number < 1 OR p_installment_number > 12 THEN
        RAISE EXCEPTION 'Invalid installment number %. Must be between 1 and 12.', p_installment_number;
    END IF;

    -- 3. Validate payment method
    IF p_payment_method NOT IN ('CASH', 'GPAY', 'PHONEPE', 'BANK_TRANSFER', 'UPI', 'CARD', 'RAZORPAY', 'OTHER') THEN
        RAISE EXCEPTION 'Invalid payment method %. Supported methods: CASH, GPAY, PHONEPE, BANK_TRANSFER, UPI, CARD, RAZORPAY, OTHER.', p_payment_method;
    END IF;

    -- 4. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status NOT IN ('ACTIVE', 'COMPLETED') THEN
        RAISE EXCEPTION 'Cannot record payment for scheme with status %.', v_scheme.status;
    END IF;

    -- 5. Lock and verify installment slot
    SELECT * INTO v_installment
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND installment_number = p_installment_number
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment number % not found for scheme %.', p_installment_number, p_scheme_id;
    END IF;

    IF v_installment.status = 'PAID' THEN
        RAISE EXCEPTION 'Installment number % has already been paid on %.', p_installment_number, v_installment.paid_date;
    END IF;

    -- Sequential payment requirement: Prior installments must be paid
    IF p_installment_number > 1 THEN
        IF EXISTS (
            SELECT 1 FROM public.scheme_installments
            WHERE scheme_id = p_scheme_id
              AND installment_number < p_installment_number
              AND status != 'PAID'
        ) THEN
            RAISE EXCEPTION 'Installment % cannot be paid before earlier installments are settled.', p_installment_number;
        END IF;
    END IF;

    -- Prevent paying future calendar month installments (Advance payments strictly forbidden)
    IF v_installment.calendar_month > v_current_month THEN
        RAISE EXCEPTION 'FUTURE_INSTALLMENT_BLOCKED: Installment % for calendar month % cannot be paid before that month begins.',
            p_installment_number, v_installment.calendar_month
            USING ERRCODE = '22023';
    END IF;

    -- 6. Rigorous Historical Classification & November 2026 Exception
    IF v_installment.calendar_month < v_current_month THEN
        -- PRIOR MONTH INSTALLMENT:
        -- The two-installment exception permits October 2026 installment ONLY during November 1–30, 2026 (Asia/Kolkata).
        IF v_installment.calendar_month = '2026-10-01'::DATE THEN
            IF NOT v_is_nov_2026_window THEN
                RAISE EXCEPTION 'OCTOBER_EXCEPTION_EXPIRED: The October 2026 historical payment window was only active during November 2026 (November 1–30, 2026 IST) and expired on December 1, 2026.'
                    USING ERRCODE = '22023';
            END IF;
        ELSE
            RAISE EXCEPTION 'PRIOR_MONTH_BLOCKED: Historical installment payment is not permitted for calendar month %.',
                v_installment.calendar_month
                USING ERRCODE = '22023';
        END IF;

        -- Historical workflow validations
        v_resolved_actual_date := COALESCE(p_actual_payment_date, v_installment.due_date);

        -- Validate actual payment date
        IF v_resolved_actual_date > v_now_ist_date THEN
            RAISE EXCEPTION 'Actual payment date (%) cannot be in the future.', v_resolved_actual_date;
        END IF;

        IF v_resolved_actual_date < v_scheme.start_month THEN
            RAISE EXCEPTION 'Actual payment date (%) cannot precede scheme start month (%).',
                v_resolved_actual_date, v_scheme.start_month;
        END IF;

        -- Require valid historical reason (at least 5 characters)
        IF v_clean_hist_reason IS NULL OR pg_catalog.length(v_clean_hist_reason) < 5 THEN
            RAISE EXCEPTION 'A valid historical reason (minimum 5 characters) is required when recording prior month installment % (%).',
                p_installment_number, v_installment.calendar_month;
        END IF;

        -- Authorize and set historical classification
        v_is_historical := TRUE;
    ELSE
        -- CURRENT MONTH INSTALLMENT (calendar_month = v_current_month):
        -- Current month installment cannot be marked historical
        IF p_is_historical IS TRUE THEN
            RAISE EXCEPTION 'Historical payment flag can only be used for prior calendar month installments (earlier than %).',
                v_current_month;
        END IF;

        v_resolved_actual_date := COALESCE(p_actual_payment_date, v_now_ist_date);

        -- Actual payment date cannot be in the future
        IF v_resolved_actual_date > v_now_ist_date THEN
            RAISE EXCEPTION 'Actual payment date (%) cannot be in the future.', v_resolved_actual_date;
        END IF;

        -- Regular payment: enforce monthly scheme payment limit (max 1 regular payment per scheme per calendar month)
        IF EXISTS (
            SELECT 1 FROM public.payments
            WHERE scheme_id = p_scheme_id
              AND payment_status = 'SUCCESS'
              AND is_historical = FALSE
              AND pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE = v_current_month
        ) THEN
            RAISE EXCEPTION 'MONTHLY_LIMIT_EXCEEDED: A regular payment has already been recorded for this scheme in the current calendar month.'
                USING ERRCODE = '23505';
        END IF;

        v_is_historical := FALSE;
    END IF;

    -- 7. Resolve payment parameters and timestamps (strictly un-backdated system timestamps)
    v_payment_amount := COALESCE(v_installment.installment_amount, v_scheme.monthly_installment_amount, 1000.00);
    v_payment_timestamptz := v_now;
    v_paid_date := v_now;

    -- 8. Generate unique receipt number (RJ-RCP-YYYY-XXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 9. Insert payment record into canonical ledger
    INSERT INTO public.payments (
        receipt_number,
        customer_id,
        scheme_id,
        installment_id,
        installment_number,
        amount,
        payment_date,
        payment_method,
        transaction_reference,
        payment_status,
        recorded_by,
        notes,
        is_historical,
        historical_reason,
        actual_payment_date,
        created_at,
        updated_at
    ) VALUES (
        v_receipt_number,
        v_scheme.customer_id,
        p_scheme_id,
        v_installment.id,
        p_installment_number,
        v_payment_amount,
        v_payment_timestamptz,
        p_payment_method,
        p_transaction_reference,
        'SUCCESS',
        v_admin_id,
        p_notes,
        v_is_historical,
        CASE WHEN v_is_historical THEN v_clean_hist_reason ELSE NULL END,
        v_resolved_actual_date,
        v_now, -- Explicit un-falsified system timestamp of entry
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 10. Update installment status
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = v_payment_amount,
        paid_date = v_paid_date,
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 11. Audit total paid installments for completion & bonus triggering
    SELECT pg_catalog.count(*) INTO v_paid_count
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 12. Bonus Guarantee on 12th completed installment
    IF v_paid_count = 12 THEN
        INSERT INTO public.scheme_bonuses (
            scheme_id,
            customer_id,
            bonus_amount,
            is_eligible,
            status,
            credited_date,
            credited_by,
            created_at,
            updated_at
        ) VALUES (
            p_scheme_id,
            v_scheme.customer_id,
            COALESCE(v_scheme.bonus_amount, 1000.00),
            TRUE,
            'CREDITED',
            v_now,
            v_admin_id,
            v_now,
            v_now
        )
        ON CONFLICT (scheme_id) DO UPDATE
        SET is_eligible = TRUE,
            status = 'CREDITED',
            bonus_amount = COALESCE(v_scheme.bonus_amount, 1000.00),
            credited_date = v_now,
            credited_by = v_admin_id,
            updated_at = v_now
        RETURNING * INTO v_bonus;

        UPDATE public.schemes
        SET status = 'MATURED',
            updated_at = v_now
        WHERE id = p_scheme_id;

        INSERT INTO public.notifications (
            customer_id,
            scheme_id,
            title,
            message,
            notification_type,
            created_at
        ) VALUES (
            v_scheme.customer_id,
            p_scheme_id,
            'Scheme Matured!',
            'Congratulations! You have completed all 12 installments. Your ₹1,000 bonus has been credited and your scheme is now matured with a total value of ₹13,000.',
            'SCHEME_MATURED',
            v_now
        );

        v_bonus_credited := TRUE;
    END IF;

    -- 13. Append audit log preserving administrator identity and exact recording timestamp
    PERFORM private.log_audit(
        v_admin_id,
        CASE WHEN v_is_historical THEN 'RECORD_HISTORICAL_PAYMENT' ELSE 'PAYMENT_RECORDED' END,
        'payments',
        v_payment_id,
        NULL,
        pg_catalog.json_build_object(
            'receipt_number', v_receipt_number,
            'scheme_id', p_scheme_id,
            'installment_number', p_installment_number,
            'calendar_month', v_installment.calendar_month,
            'amount', v_payment_amount,
            'bonus_credited', v_bonus_credited,
            'paid_count', v_paid_count,
            'is_historical', v_is_historical,
            'historical_reason', CASE WHEN v_is_historical THEN v_clean_hist_reason ELSE NULL END,
            'actual_payment_date', v_resolved_actual_date
        )::jsonb,
        pg_catalog.json_build_object(
            'method', p_payment_method,
            'recorded_at', v_now
        )::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_receipt_number,
        'installment_number', p_installment_number,
        'calendar_month', v_installment.calendar_month,
        'amount', v_payment_amount,
        'bonus_credited', v_bonus_credited,
        'paid_count', v_paid_count,
        'is_historical', v_is_historical,
        'actual_payment_date', v_resolved_actual_date,
        'payment_date', v_payment_timestamptz,
        'recorded_at', v_now,
        'status', CASE WHEN v_paid_count = 12 AND v_bonus_credited THEN 'MATURED' ELSE 'ACTIVE' END,
        'message', CASE 
            WHEN v_bonus_credited THEN 'Installment #' || p_installment_number || ' paid (' || CASE WHEN v_is_historical THEN 'Historical' ELSE 'Regular' END || '). Scheme completed! 100% bonus credited (+₹1,000).'
            ELSE 'Installment #' || p_installment_number || ' paid successfully (' || CASE WHEN v_is_historical THEN 'Historical' ELSE 'Regular' END || ').'
        END
    );
END;
$$;

-- Ensure secure permissions
REVOKE ALL ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT, DATE, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT, DATE, BOOLEAN, TEXT) TO authenticated, service_role, postgres;

-- -----------------------------------------------------------------------------
-- 2. UPGRADE public.create_online_payment_attempt (STRICT CURRENT MONTH RESTRICTION)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_online_payment_attempt(
    p_customer_id UUID,
    p_scheme_id UUID,
    p_installment_id UUID,
    p_installment_number INTEGER,
    p_amount_paise INTEGER,
    p_currency VARCHAR(10) DEFAULT 'INR',
    p_razorpay_link_id VARCHAR(100) DEFAULT NULL,
    p_razorpay_link_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_scheme RECORD;
    v_installment RECORD;
    v_attempt_id UUID;
    v_existing_attempt RECORD;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_current_month DATE := pg_catalog.date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata'))::DATE;
    v_target_amount NUMERIC(12, 2);
    v_target_paise INTEGER;
BEGIN
    -- 1. Validate customer and scheme ownership
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id AND customer_id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme % not found or does not belong to customer %.', p_scheme_id, p_customer_id;
    END IF;

    -- 2. MONTHLY SCHEME PAYMENT LIMIT: Pre-flight check (Regular payments only)
    IF EXISTS (
        SELECT 1 FROM public.payments
        WHERE scheme_id = p_scheme_id
          AND payment_status = 'SUCCESS'
          AND is_historical = FALSE
          AND pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE = v_current_month
    ) THEN
        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'MONTHLY_LIMIT_EXCEEDED',
            'message', 'A payment has already been recorded for this scheme in the current calendar month.'
        );
    END IF;

    -- 3. Validate installment
    SELECT * INTO v_installment
    FROM public.scheme_installments
    WHERE id = p_installment_id AND scheme_id = p_scheme_id AND installment_number = p_installment_number;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment % not found for scheme %.', p_installment_number, p_scheme_id;
    END IF;

    IF v_installment.status = 'PAID' THEN
        RAISE EXCEPTION 'Installment % is already paid.', p_installment_number;
    END IF;

    -- Online payments are strictly restricted to the current calendar month installment
    IF v_installment.calendar_month != v_current_month THEN
        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'INVALID_INSTALLMENT_MONTH',
            'message', 'Online payments are only permitted for the current calendar month installment.'
        );
    END IF;

    -- 4. Dynamic amount resolution
    v_target_amount := COALESCE(
        (p_amount_paise / 100.0)::numeric(12, 2),
        v_installment.installment_amount,
        v_scheme.monthly_installment_amount,
        1000.00
    );
    v_target_paise := COALESCE(
        p_amount_paise,
        pg_catalog.round(v_target_amount * 100)::integer
    );

    -- 5. Check if an active attempt with a valid payment link already exists (created in last 20 minutes)
    SELECT * INTO v_existing_attempt
    FROM public.payment_attempts
    WHERE scheme_id = p_scheme_id
      AND installment_id = p_installment_id
      AND status = 'CREATED'
      AND razorpay_payment_link_id IS NOT NULL
      AND created_at > (v_now - INTERVAL '20 minutes')
    ORDER BY created_at DESC
    LIMIT 1;

    -- If a recent valid attempt exists and no new link is passed, reuse it
    IF FOUND AND (p_razorpay_link_id IS NULL OR p_razorpay_link_id = v_existing_attempt.razorpay_payment_link_id) THEN
        RETURN pg_catalog.json_build_object(
            'success', true,
            'payment_attempt_id', v_existing_attempt.id,
            'razorpay_payment_link_id', v_existing_attempt.razorpay_payment_link_id,
            'razorpay_payment_link_url', v_existing_attempt.razorpay_payment_link_url,
            'reused', true
        );
    END IF;

    -- 6. Insert new attempt record
    INSERT INTO public.payment_attempts (
        customer_id,
        scheme_id,
        installment_id,
        installment_number,
        amount,
        amount_paise,
        currency,
        razorpay_payment_link_id,
        razorpay_payment_link_url,
        status,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        p_scheme_id,
        p_installment_id,
        p_installment_number,
        v_target_amount,
        v_target_paise,
        COALESCE(p_currency, 'INR'),
        p_razorpay_link_id,
        p_razorpay_link_url,
        'CREATED',
        COALESCE(p_metadata, '{}'::jsonb),
        v_now,
        v_now
    ) RETURNING id INTO v_attempt_id;

    RETURN pg_catalog.json_build_object(
        'success', true,
        'payment_attempt_id', v_attempt_id,
        'razorpay_payment_link_id', p_razorpay_link_id,
        'razorpay_payment_link_url', p_razorpay_link_url,
        'reused', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) TO service_role, postgres;

NOTIFY pgrst, 'reload schema';
