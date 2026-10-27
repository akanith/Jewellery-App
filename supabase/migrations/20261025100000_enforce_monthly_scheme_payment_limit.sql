-- =============================================================================
-- Migration: 20261025100000_enforce_monthly_scheme_payment_limit.sql
-- Description:
--   1. Fix payment_attempts fixed ₹1,000 check constraints to support dynamic
--      positive amounts while guaranteeing rupee/paise consistency.
--   2. Enforce business rule: Maximum one successful installment payment per scheme
--      per Indian calendar month (Asia/Kolkata) using a database-level partial unique index.
--   3. Update public.record_installment_payment to enforce monthly limit in cash path.
--   4. Update public.reconcile_online_payment to enforce monthly limit in webhook path
--      and support dynamic amounts.
--   5. Update public.create_online_payment_attempt to enforce monthly limit at initiation
--      and support dynamic amounts.
--   6. Restrict internal procedures from authenticated/anon roles (Part D hardening).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX PAYMENT_ATTEMPTS AMOUNT CONSTRAINTS (DYNAMIC AMOUNTS SUPPORT)
-- -----------------------------------------------------------------------------

ALTER TABLE public.payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_amount_check;
ALTER TABLE public.payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_amount_paise_check;

ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_amount_check
    CHECK (amount > 0);

ALTER TABLE public.payment_attempts ADD CONSTRAINT payment_attempts_amount_paise_check
    CHECK (amount_paise > 0 AND amount_paise = pg_catalog.round(amount * 100)::integer);

-- -----------------------------------------------------------------------------
-- 2. DATABASE-LEVEL UNIQUE PARTIAL INDEX (ONE PAYMENT PER SCHEME PER INDIAN MONTH)
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_scheme_calendar_month
    ON public.payments (
        scheme_id,
        (pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE)
    )
    WHERE payment_status = 'SUCCESS';

-- -----------------------------------------------------------------------------
-- 3. UPGRADE public.record_installment_payment
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_installment_payment(
    p_scheme_id UUID,
    p_installment_number INTEGER,
    p_payment_method VARCHAR(30),
    p_transaction_reference VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
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
BEGIN
    -- 1. Authorization check
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

    -- 5. MONTHLY SCHEME PAYMENT LIMIT: Maximum 1 payment per scheme per Indian calendar month
    IF EXISTS (
        SELECT 1 FROM public.payments
        WHERE scheme_id = p_scheme_id
          AND payment_status = 'SUCCESS'
          AND pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE =
              pg_catalog.date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata'))::DATE
    ) THEN
        RAISE EXCEPTION 'MONTHLY_LIMIT_EXCEEDED: A payment has already been recorded for this scheme in the current calendar month.'
            USING ERRCODE = '23505';
    END IF;

    -- 6. Lock and verify installment slot
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

    IF v_installment.calendar_month > pg_catalog.date_trunc('month', v_now)::DATE THEN
        RAISE EXCEPTION 'Installment % for calendar month % cannot be paid before that month begins.', p_installment_number, v_installment.calendar_month;
    END IF;

    v_payment_amount := COALESCE(v_installment.installment_amount, v_scheme.monthly_installment_amount, 1000.00);

    -- 7. Generate unique receipt number (RJ-RCP-YYYY-XXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 8. Insert payment record into canonical ledger
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
        created_at,
        updated_at
    ) VALUES (
        v_receipt_number,
        v_scheme.customer_id,
        p_scheme_id,
        v_installment.id,
        p_installment_number,
        v_payment_amount,
        v_now,
        p_payment_method,
        p_transaction_reference,
        'SUCCESS',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 9. Update installment status
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = v_payment_amount,
        paid_date = v_now,
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 10. Audit total paid installments for completion & bonus triggering
    SELECT pg_catalog.count(*) INTO v_paid_count
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 11. Bonus Guarantee on 12th completed installment
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
            1000.00,
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
            bonus_amount = 1000.00,
            credited_date = v_now,
            credited_by = v_admin_id,
            updated_at = v_now
        WHERE public.scheme_bonuses.status = 'PENDING';

        SELECT * INTO v_bonus
        FROM public.scheme_bonuses
        WHERE scheme_id = p_scheme_id;

        IF FOUND AND v_bonus.status = 'CREDITED' AND v_bonus.bonus_amount = 1000.00 AND v_bonus.is_eligible = TRUE THEN
            v_bonus_credited := TRUE;

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
                'Scheme Matured with Bonus!',
                'Congratulations! All 12 monthly installments are completed. Your ₹1,000 bonus has been credited. Total eligible maturity balance: ₹13,000.',
                'BONUS_CREDITED',
                v_now
            );
        END IF;
    END IF;

    -- 12. Create standard payment notification
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
        'Installment Payment Received',
        'Payment of ₹' || v_payment_amount || ' for installment #' || p_installment_number || ' has been recorded. Receipt: ' || v_receipt_number,
        'PAYMENT_RECORDED',
        v_now
    );

    -- 13. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'PAYMENT_RECORDED',
        'payments',
        v_payment_id,
        NULL,
        pg_catalog.json_build_object(
            'receipt_number', v_receipt_number,
            'scheme_id', p_scheme_id,
            'installment_number', p_installment_number,
            'amount', v_payment_amount,
            'bonus_credited', v_bonus_credited,
            'paid_count', v_paid_count
        )::jsonb,
        pg_catalog.json_build_object('method', p_payment_method)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_receipt_number,
        'paid_count', v_paid_count,
        'bonus_credited', v_bonus_credited,
        'status', CASE WHEN v_paid_count = 12 AND v_bonus_credited THEN 'MATURED' ELSE 'ACTIVE' END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) TO authenticated, service_role, postgres;

-- -----------------------------------------------------------------------------
-- 4. UPGRADE public.reconcile_online_payment
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reconcile_online_payment(
    p_payment_attempt_id UUID,
    p_razorpay_payment_id VARCHAR(100),
    p_captured_amount_paise INTEGER,
    p_payment_method VARCHAR(30) DEFAULT 'RAZORPAY',
    p_gateway_fee_paise INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_attempt RECORD;
    v_scheme RECORD;
    v_installment RECORD;
    v_bonus RECORD;
    v_existing_payment RECORD;
    v_payment_id UUID;
    v_receipt_number VARCHAR(50);
    v_paid_count INTEGER;
    v_bonus_credited BOOLEAN := FALSE;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_payment_amount NUMERIC(12, 2);
BEGIN
    -- 1. Input Validation
    IF p_payment_attempt_id IS NULL THEN
        RAISE EXCEPTION 'p_payment_attempt_id cannot be null.';
    END IF;

    IF p_razorpay_payment_id IS NULL OR pg_catalog.btrim(p_razorpay_payment_id) = '' THEN
        RAISE EXCEPTION 'p_razorpay_payment_id cannot be empty.';
    END IF;

    -- 2. Lock and retrieve payment attempt record
    SELECT * INTO v_attempt
    FROM public.payment_attempts
    WHERE id = p_payment_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment attempt with ID % not found.', p_payment_attempt_id;
    END IF;

    -- 3. Idempotency Check: Already processed attempt
    IF v_attempt.status IN ('PAID', 'RECONCILED') THEN
        SELECT * INTO v_existing_payment
        FROM public.payments
        WHERE installment_id = v_attempt.installment_id;

        IF FOUND THEN
            RETURN pg_catalog.json_build_object(
                'success', true,
                'already_processed', true,
                'payment_id', v_existing_payment.id,
                'receipt_number', v_existing_payment.receipt_number,
                'message', 'Payment was already reconciled.'
            );
        END IF;
    END IF;

    -- 4. Idempotency Check: Existing transaction reference (Razorpay payment ID)
    SELECT * INTO v_existing_payment
    FROM public.payments
    WHERE transaction_reference = p_razorpay_payment_id;

    IF FOUND THEN
        UPDATE public.payment_attempts
        SET status = 'PAID',
            razorpay_payment_id = p_razorpay_payment_id,
            updated_at = v_now
        WHERE id = p_payment_attempt_id;

        RETURN pg_catalog.json_build_object(
            'success', true,
            'already_processed', true,
            'payment_id', v_existing_payment.id,
            'receipt_number', v_existing_payment.receipt_number,
            'message', 'Payment with this Razorpay transaction reference already recorded.'
        );
    END IF;

    -- 5. Verify captured amount strictly matches expected installment amount
    IF p_captured_amount_paise IS NULL OR p_captured_amount_paise != v_attempt.amount_paise THEN
        UPDATE public.payment_attempts
        SET status = 'FAILED',
            reconciliation_notes = 'Amount mismatch: expected ' || v_attempt.amount_paise || ' paise but captured ' || COALESCE(p_captured_amount_paise::text, 'NULL') || ' paise',
            updated_at = v_now
        WHERE id = p_payment_attempt_id;

        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'AMOUNT_MISMATCH',
            'message', 'Captured amount does not match the required installment amount.'
        );
    END IF;

    -- 6. Lock and verify scheme record
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = v_attempt.scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', v_attempt.scheme_id;
    END IF;

    IF v_scheme.status NOT IN ('ACTIVE', 'COMPLETED') THEN
        UPDATE public.payment_attempts
        SET status = 'FAILED',
            reconciliation_notes = 'Cannot record payment for scheme with status ' || v_scheme.status,
            updated_at = v_now
        WHERE id = p_payment_attempt_id;

        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'INVALID_SCHEME_STATUS',
            'message', 'Scheme is not in an active or eligible state.'
        );
    END IF;

    -- 7. MONTHLY SCHEME PAYMENT LIMIT: Maximum 1 payment per scheme per Indian calendar month
    IF EXISTS (
        SELECT 1 FROM public.payments
        WHERE scheme_id = v_attempt.scheme_id
          AND payment_status = 'SUCCESS'
          AND pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE =
              pg_catalog.date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata'))::DATE
    ) THEN
        UPDATE public.payment_attempts
        SET status = 'FAILED',
            reconciliation_notes = 'MONTHLY_LIMIT_EXCEEDED: Scheme already has a recorded payment for this calendar month.',
            updated_at = v_now
        WHERE id = p_payment_attempt_id;

        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'MONTHLY_LIMIT_EXCEEDED',
            'message', 'A payment has already been recorded for this scheme in the current calendar month.'
        );
    END IF;

    -- 8. Lock and verify installment record
    SELECT * INTO v_installment
    FROM public.scheme_installments
    WHERE id = v_attempt.installment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment with ID % not found for scheme %.', v_attempt.installment_id, v_attempt.scheme_id;
    END IF;

    IF v_installment.status = 'PAID' THEN
        UPDATE public.payment_attempts
        SET status = 'FAILED',
            reconciliation_notes = 'Installment #' || v_attempt.installment_number || ' already marked PAID on ' || COALESCE(v_installment.paid_date::text, 'unknown date'),
            updated_at = v_now
        WHERE id = p_payment_attempt_id;

        RETURN pg_catalog.json_build_object(
            'success', false,
            'error', 'ALREADY_PAID',
            'message', 'Installment has already been paid.'
        );
    END IF;

    v_payment_amount := v_attempt.amount;

    -- 9. Generate Unique Canonical Receipt Number (RJ-RCP-YYYY-XXXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 10. Insert payment into canonical ledger (public.payments)
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
        created_at,
        updated_at
    ) VALUES (
        v_receipt_number,
        v_scheme.customer_id,
        v_attempt.scheme_id,
        v_installment.id,
        v_attempt.installment_number,
        v_payment_amount,
        v_now,
        COALESCE(p_payment_method, 'RAZORPAY'),
        p_razorpay_payment_id,
        'SUCCESS',
        NULL,
        COALESCE(p_notes, 'Online Payment via Razorpay (' || p_razorpay_payment_id || ')'),
        v_now,
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 11. Update installment status to PAID
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = v_payment_amount,
        paid_date = v_now,
        notes = COALESCE(notes || ' | ', '') || 'Paid online via Razorpay (' || p_razorpay_payment_id || ')',
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 12. Update payment attempt status to PAID
    UPDATE public.payment_attempts
    SET status = 'PAID',
        razorpay_payment_id = p_razorpay_payment_id,
        reconciliation_notes = 'Reconciled successfully with receipt ' || v_receipt_number,
        updated_at = v_now
    WHERE id = p_payment_attempt_id;

    -- 13. Check total paid installments count for bonus & maturity triggering
    SELECT pg_catalog.count(*) INTO v_paid_count
    FROM public.scheme_installments
    WHERE scheme_id = v_attempt.scheme_id AND status = 'PAID';

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
            v_attempt.scheme_id,
            v_scheme.customer_id,
            1000.00,
            TRUE,
            'CREDITED',
            v_now,
            NULL,
            v_now,
            v_now
        )
        ON CONFLICT (scheme_id) DO UPDATE
        SET is_eligible = TRUE,
            status = 'CREDITED',
            bonus_amount = 1000.00,
            credited_date = v_now,
            credited_by = NULL,
            updated_at = v_now
        WHERE public.scheme_bonuses.status = 'PENDING';

        SELECT * INTO v_bonus
        FROM public.scheme_bonuses
        WHERE scheme_id = v_attempt.scheme_id;

        IF FOUND AND v_bonus.status = 'CREDITED' AND v_bonus.bonus_amount = 1000.00 AND v_bonus.is_eligible = TRUE THEN
            v_bonus_credited := TRUE;

            UPDATE public.schemes
            SET status = 'MATURED',
                updated_at = v_now
            WHERE id = v_attempt.scheme_id;

            INSERT INTO public.notifications (
                customer_id,
                scheme_id,
                title,
                message,
                notification_type,
                created_at
            ) VALUES (
                v_scheme.customer_id,
                v_attempt.scheme_id,
                'Scheme Matured with Bonus!',
                'Congratulations! All 12 monthly installments are completed. Your ₹1,000 bonus has been credited. Total eligible maturity balance: ₹13,000.',
                'BONUS_CREDITED',
                v_now
            );
        END IF;
    END IF;

    -- 14. Create standard payment notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        v_scheme.customer_id,
        v_attempt.scheme_id,
        'Installment Payment Received',
        'Online payment of ₹' || v_payment_amount || ' for installment #' || v_attempt.installment_number || ' has been recorded. Receipt: ' || v_receipt_number,
        'PAYMENT_RECORDED',
        v_now
    );

    -- 15. Append audit log
    PERFORM private.log_audit(
        NULL,
        'ONLINE_PAYMENT_RECONCILED',
        'payments',
        v_payment_id,
        NULL,
        pg_catalog.json_build_object(
            'receipt_number', v_receipt_number,
            'scheme_id', v_attempt.scheme_id,
            'installment_number', v_attempt.installment_number,
            'amount', v_payment_amount,
            'razorpay_payment_id', p_razorpay_payment_id,
            'payment_attempt_id', p_payment_attempt_id,
            'bonus_credited', v_bonus_credited,
            'paid_count', v_paid_count
        )::jsonb,
        pg_catalog.json_build_object('method', 'RAZORPAY', 'gateway', 'Razorpay')::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'receipt_number', v_receipt_number,
        'amount', v_payment_amount,
        'installment_number', v_attempt.installment_number,
        'bonus_credited', v_bonus_credited,
        'paid_count', v_paid_count
    );
END;
$$;

-- Secure grants for reconciliation RPC (Strictly service_role and postgres)
REVOKE ALL ON FUNCTION public.reconcile_online_payment(UUID, VARCHAR, INTEGER, VARCHAR, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_online_payment(UUID, VARCHAR, INTEGER, VARCHAR, INTEGER, TEXT) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 5. UPGRADE public.create_online_payment_attempt
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

    -- 2. MONTHLY SCHEME PAYMENT LIMIT: Pre-flight check
    IF EXISTS (
        SELECT 1 FROM public.payments
        WHERE scheme_id = p_scheme_id
          AND payment_status = 'SUCCESS'
          AND pg_catalog.date_trunc('month', (payment_date AT TIME ZONE 'Asia/Kolkata'))::DATE =
              pg_catalog.date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata'))::DATE
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

-- Secure grants for create_online_payment_attempt RPC (Strictly service_role and postgres)
REVOKE ALL ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 6. HARDEN public.switch_customer_profile_session PERMISSIONS
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) TO service_role, postgres;
