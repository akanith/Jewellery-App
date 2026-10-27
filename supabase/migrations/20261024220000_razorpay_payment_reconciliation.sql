-- =============================================================================
-- RAMYAS JEWELLER — RAZORPAY PAYMENT RECONCILIATION MIGRATION
-- Migration: 20261024220000_razorpay_payment_reconciliation.sql
--
-- Objectives:
-- 1. Enable automated online payment recording by relaxing NOT NULL on recorded_by
--    in public.payments (NULL indicates automated online gateway reconciliation).
-- 2. Update payment_method check constraint on public.payments to include 'RAZORPAY'.
-- 3. Add unique constraint on public.payments(transaction_reference) for gateway IDs.
-- 4. Create public.payment_attempts table to correlate internal attempts,
--    customer UUID, scheme UUID, installment, and Razorpay payment link / payment IDs.
-- 5. Create atomic SECURITY DEFINER procedure public.reconcile_online_payment()
--    to idempotently record verified online payments into the canonical ledger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADAPT PUBLIC.PAYMENTS SCHEMA
-- -----------------------------------------------------------------------------

-- 1.1. Allow recorded_by to be NULL for online automated gateway payments
ALTER TABLE public.payments ALTER COLUMN recorded_by DROP NOT NULL;
COMMENT ON COLUMN public.payments.recorded_by IS 'Admin user who recorded the payment; NULL indicates automated online payment gateway (e.g. Razorpay).';

-- 1.2. Update payment_method check constraint to support 'RAZORPAY'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
    CHECK (payment_method IN ('CASH', 'GPAY', 'PHONEPE', 'BANK_TRANSFER', 'UPI', 'CARD', 'RAZORPAY', 'OTHER'));

-- 1.3. Unique index on Razorpay transaction references (guarantees Razorpay pay_... cannot be recorded twice)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_reference_unique
    ON public.payments (transaction_reference)
    WHERE payment_method = 'RAZORPAY' AND transaction_reference IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. CREATE PAYMENT_ATTEMPTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES public.scheme_installments(id) ON DELETE RESTRICT,
    installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (amount = 1000.00),
    amount_paise INTEGER NOT NULL DEFAULT 100000 CHECK (amount_paise = 100000),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    razorpay_payment_link_id VARCHAR(100) UNIQUE,
    razorpay_payment_link_url TEXT,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED', 'PAID', 'EXPIRED', 'FAILED', 'RECONCILED')),
    reconciliation_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexes for fast correlation and webhook resolution
CREATE INDEX IF NOT EXISTS idx_payment_attempts_customer ON public.payment_attempts (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_scheme_inst ON public.payment_attempts (scheme_id, installment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_link_id ON public.payment_attempts (razorpay_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON public.payment_attempts (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts (status);

-- Updated at trigger
DROP TRIGGER IF EXISTS set_payment_attempts_updated_at ON public.payment_attempts;
CREATE TRIGGER set_payment_attempts_updated_at
    BEFORE UPDATE ON public.payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Security on payment_attempts
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon, public;

DROP POLICY IF EXISTS admin_select_payment_attempts ON public.payment_attempts;
CREATE POLICY admin_select_payment_attempts ON public.payment_attempts
    FOR SELECT TO authenticated
    USING (private.is_admin());

-- -----------------------------------------------------------------------------
-- 3. ATOMIC RECONCILIATION PROCEDURE
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

    -- 5. Verify captured amount strictly matches expected installment amount (100000 paise = ₹1,000.00)
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

    -- 7. Lock and verify installment record
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

    -- 8. Generate Unique Canonical Receipt Number (RJ-RCP-YYYY-XXXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 9. Insert payment into canonical ledger (public.payments)
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
        1000.00,
        v_now,
        COALESCE(p_payment_method, 'RAZORPAY'),
        p_razorpay_payment_id,
        'SUCCESS',
        NULL,
        COALESCE(p_notes, 'Online Payment via Razorpay (' || p_razorpay_payment_id || ')'),
        v_now,
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 10. Update installment status to PAID
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = 1000.00,
        paid_date = v_now,
        notes = COALESCE(notes || ' | ', '') || 'Paid online via Razorpay (' || p_razorpay_payment_id || ')',
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 11. Update payment attempt status to PAID
    UPDATE public.payment_attempts
    SET status = 'PAID',
        razorpay_payment_id = p_razorpay_payment_id,
        reconciliation_notes = 'Reconciled successfully with receipt ' || v_receipt_number,
        updated_at = v_now
    WHERE id = p_payment_attempt_id;

    -- 12. Check total paid installments count for bonus & maturity triggering
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

    -- 13. Create standard payment notification
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
        'Online payment of ₹1,000 for installment #' || v_attempt.installment_number || ' has been recorded. Receipt: ' || v_receipt_number,
        'PAYMENT_RECORDED',
        v_now
    );

    -- 14. Append audit log
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
            'amount', 1000.00,
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
        'amount', 1000.00,
        'installment_number', v_attempt.installment_number,
        'bonus_credited', v_bonus_credited,
        'paid_count', v_paid_count
    );
END;
$$;

-- Secure grants for reconciliation RPC
REVOKE ALL ON FUNCTION public.reconcile_online_payment(UUID, VARCHAR, INTEGER, VARCHAR, INTEGER, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reconcile_online_payment(UUID, VARCHAR, INTEGER, VARCHAR, INTEGER, TEXT) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 4. SECURE HELPER RPC: CREATE PAYMENT ATTEMPT
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
    v_existing_paid RECORD;
    v_existing_attempt RECORD;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Validate customer and scheme ownership
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id AND customer_id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme % not found or does not belong to customer %.', p_scheme_id, p_customer_id;
    END IF;

    -- 2. Validate installment
    SELECT * INTO v_installment
    FROM public.scheme_installments
    WHERE id = p_installment_id AND scheme_id = p_scheme_id AND installment_number = p_installment_number;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment % not found for scheme %.', p_installment_number, p_scheme_id;
    END IF;

    IF v_installment.status = 'PAID' THEN
        RAISE EXCEPTION 'Installment % is already paid.', p_installment_number;
    END IF;

    -- 3. Check if an active attempt with a valid payment link already exists (created in last 20 minutes)
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

    -- 4. Insert new attempt record
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
        1000.00,
        COALESCE(p_amount_paise, 100000),
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

REVOKE ALL ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_online_payment_attempt(UUID, UUID, UUID, INTEGER, INTEGER, VARCHAR, VARCHAR, TEXT, JSONB) TO service_role, postgres;
