-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261001104000_harden_financial_rpcs_admin_auth.sql
-- Description: Hardens core financial RPCs (enroll_customer_scheme,
--              record_installment_payment, record_scheme_redemption)
--              with explicit private.is_admin() defense-in-depth authorization check.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENROLL CUSTOMER SCHEME (Admin Defense-in-Depth Guarded)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_customer_scheme(
    p_customer_id UUID,
    p_start_month DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_customer RECORD;
    v_scheme_id UUID;
    v_scheme_code VARCHAR(30);
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
BEGIN
    -- 1. Authorization check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- 2. Verify customer exists
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found.', p_customer_id;
    END IF;

    -- 3. Normalize calendar boundary
    v_start_date := pg_catalog.date_trunc('month', p_start_month)::DATE;
    v_end_date := (v_start_date + INTERVAL '11 months')::DATE;

    -- 4. Generate unique scheme code (RJ-SCH-YYYY-XXXXX)
    v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 5. Insert scheme enrollment
    INSERT INTO public.schemes (
        customer_id,
        scheme_code,
        monthly_installment_amount,
        total_installments,
        target_contribution,
        bonus_amount,
        maturity_amount,
        start_month,
        end_month,
        status,
        enrolled_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        v_scheme_code,
        1000.00,
        12,
        12000.00,
        1000.00,
        13000.00,
        v_start_date,
        v_end_date,
        'ACTIVE',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_scheme_id;

    -- 6. Pre-generate all 12 monthly installment slots
    FOR v_i IN 1..12 LOOP
        v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
        v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

        INSERT INTO public.scheme_installments (
            scheme_id,
            customer_id,
            installment_number,
            calendar_month,
            due_date,
            installment_amount,
            status,
            paid_amount,
            paid_date,
            created_at,
            updated_at
        ) VALUES (
            v_scheme_id,
            p_customer_id,
            v_i,
            v_curr_month,
            v_due_date,
            1000.00,
            'PENDING',
            0.00,
            NULL,
            v_now,
            v_now
        );
    END LOOP;

    -- 7. Initialize scheme bonus record in PENDING state
    INSERT INTO public.scheme_bonuses (
        scheme_id,
        customer_id,
        bonus_amount,
        is_eligible,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_scheme_id,
        p_customer_id,
        1000.00,
        FALSE,
        'PENDING',
        v_now,
        v_now
    );

    -- 8. Send welcome notification
    INSERT INTO public.notifications (
        customer_id,
        scheme_id,
        title,
        message,
        notification_type,
        created_at
    ) VALUES (
        p_customer_id,
        v_scheme_id,
        'Savings Scheme Enrolled',
        'Welcome to Ramyas Jeweller Savings Scheme! Scheme code: ' || v_scheme_code || '. 12 monthly installments of ₹1,000.',
        'GENERAL',
        v_now
    );

    -- 9. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'SCHEME_ENROLLED',
        'schemes',
        v_scheme_id,
        NULL,
        pg_catalog.json_build_object(
            'scheme_code', v_scheme_code,
            'customer_id', p_customer_id,
            'start_month', v_start_date,
            'end_month', v_end_date,
            'monthly_amount', 1000.00,
            'total_installments', 12
        )::jsonb,
        pg_catalog.json_build_object('customer_name', v_customer.full_name)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'start_month', v_start_date,
        'end_month', v_end_date
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. RECORD INSTALLMENT PAYMENT (Admin Defense-in-Depth Guarded)
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
    IF p_payment_method NOT IN ('CASH', 'GPAY', 'PHONEPE', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER') THEN
        RAISE EXCEPTION 'Invalid payment method %. Supported methods: CASH, GPAY, PHONEPE, BANK_TRANSFER, UPI, CARD, OTHER.', p_payment_method;
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

    IF v_installment.calendar_month > pg_catalog.date_trunc('month', v_now)::DATE THEN
        RAISE EXCEPTION 'Installment % for calendar month % cannot be paid before that month begins.', p_installment_number, v_installment.calendar_month;
    END IF;

    -- 6. Generate unique receipt number (RJ-RCP-YYYY-XXXXX)
    v_receipt_number := 'RJ-RCP-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 7. Insert payment record (strictly ₹1,000.00)
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
        1000.00,
        v_now,
        p_payment_method,
        p_transaction_reference,
        'SUCCESS',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_payment_id;

    -- 8. Update installment status
    UPDATE public.scheme_installments
    SET status = 'PAID',
        paid_amount = 1000.00,
        paid_date = v_now,
        updated_at = v_now
    WHERE id = v_installment.id;

    -- 9. Audit total paid installments for completion & bonus triggering
    SELECT pg_catalog.count(*) INTO v_paid_count
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 10. Bonus Guarantee on 12th completed installment
    IF v_paid_count = 12 THEN
        -- Atomic UPSERT ensures exactly one credited bonus row exists
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

        -- Verify bonus row state explicitly
        SELECT * INTO v_bonus
        FROM public.scheme_bonuses
        WHERE scheme_id = p_scheme_id;

        IF FOUND AND v_bonus.status = 'CREDITED' AND v_bonus.bonus_amount = 1000.00 AND v_bonus.is_eligible = TRUE THEN
            v_bonus_credited := TRUE;

            -- Transition scheme status to MATURED
            UPDATE public.schemes
            SET status = 'MATURED',
                updated_at = v_now
            WHERE id = p_scheme_id;

            -- Create maturity notification
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

    -- 11. Create standard payment notification
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
        'Payment of ₹1,000 for installment #' || p_installment_number || ' has been recorded. Receipt: ' || v_receipt_number,
        'PAYMENT_RECORDED',
        v_now
    );

    -- 12. Append audit log
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
            'amount', 1000.00,
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

-- -----------------------------------------------------------------------------
-- 3. RECORD SCHEME REDEMPTION (Admin Defense-in-Depth Guarded)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_scheme_redemption(
    p_scheme_id UUID,
    p_scheme_amount_used NUMERIC(12, 2),
    p_purchase_total NUMERIC(12, 2),
    p_invoice_number VARCHAR(50),
    p_items JSONB,
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
    v_bonus RECORD;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_bonus_amount NUMERIC(12, 2) := 0.00;
    v_total_redeemed NUMERIC(12, 2) := 0.00;
    v_available_balance NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2) := 0.00;
    v_customer_paid_balance NUMERIC(12, 2) := 0.00;
    v_redemption_id UUID;
    v_redemption_code VARCHAR(30);
    v_item RECORD;
    v_items_sum NUMERIC(12, 2) := 0.00;
    v_item_final NUMERIC(12, 2) := 0.00;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_new_scheme_status VARCHAR(25);
BEGIN
    -- 1. Authorization check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- 2. Validate basic input parameters
    IF p_scheme_amount_used IS NULL OR p_scheme_amount_used <= 0 THEN
        RAISE EXCEPTION 'Scheme amount used must be strictly positive.';
    END IF;

    IF p_purchase_total IS NULL OR p_purchase_total < p_scheme_amount_used THEN
        RAISE EXCEPTION 'Purchase total (₹%) cannot be less than scheme amount used (₹%).', p_purchase_total, p_scheme_amount_used;
    END IF;

    IF p_items IS NULL OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Redemption must contain at least one item breakdown.';
    END IF;

    -- 3. Reconcile Itemized Breakdown Against Purchase Total
    FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS (
        item_description VARCHAR(255),
        category VARCHAR(30),
        quantity NUMERIC(8, 3),
        product_amount NUMERIC(12, 2),
        making_charges NUMERIC(12, 2),
        wastage_charges NUMERIC(12, 2),
        stone_charges NUMERIC(12, 2),
        other_charges NUMERIC(12, 2)
    )
    LOOP
        -- Validate item fields
        IF v_item.item_description IS NULL OR trim(v_item.item_description) = '' THEN
            RAISE EXCEPTION 'Item description cannot be empty.';
        END IF;

        IF v_item.category NOT IN ('GOLD', 'SILVER', 'OTHER') THEN
            RAISE EXCEPTION 'Invalid item category %. Must be GOLD, SILVER, or OTHER.', v_item.category;
        END IF;

        IF v_item.quantity IS NOT NULL AND v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be strictly positive.';
        END IF;

        IF coalesce(v_item.product_amount, 0) < 0 OR
           coalesce(v_item.making_charges, 0) < 0 OR
           coalesce(v_item.wastage_charges, 0) < 0 OR
           coalesce(v_item.stone_charges, 0) < 0 OR
           coalesce(v_item.other_charges, 0) < 0 THEN
            RAISE EXCEPTION 'Item charges and product amounts cannot be negative.';
        END IF;

        v_item_final := coalesce(v_item.product_amount, 0.00) +
                        coalesce(v_item.making_charges, 0.00) +
                        coalesce(v_item.wastage_charges, 0.00) +
                        coalesce(v_item.stone_charges, 0.00) +
                        coalesce(v_item.other_charges, 0.00);

        v_items_sum := v_items_sum + v_item_final;
    END LOOP;

    -- Strict reconciliation check: Sum of item lines MUST match p_purchase_total
    IF v_items_sum <> p_purchase_total THEN
        RAISE EXCEPTION 'Itemized total (₹%) does not match purchase total (₹%).', v_items_sum, p_purchase_total;
    END IF;

    -- 4. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status NOT IN ('MATURED', 'PARTIALLY_REDEEMED') THEN
        RAISE EXCEPTION 'Scheme status is %. Redemptions are only permitted on MATURED or PARTIALLY_REDEEMED schemes.', v_scheme.status;
    END IF;

    -- 5. Calculate total contributions paid
    SELECT coalesce(pg_catalog.sum(paid_amount), 0.00) INTO v_total_paid
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    -- 6. Calculate credited bonus
    SELECT * INTO v_bonus
    FROM public.scheme_bonuses
    WHERE scheme_id = p_scheme_id;

    IF FOUND AND v_bonus.status = 'CREDITED' THEN
        v_bonus_amount := v_bonus.bonus_amount;
    END IF;

    -- 7. Calculate total scheme amounts already redeemed
    SELECT coalesce(pg_catalog.sum(scheme_amount_used), 0.00) INTO v_total_redeemed
    FROM public.redemptions
    WHERE scheme_id = p_scheme_id AND status = 'COMPLETED';

    -- 8. Compute available balance & verify sufficiency
    v_available_balance := (v_total_paid + v_bonus_amount) - v_total_redeemed;

    IF p_scheme_amount_used > v_available_balance THEN
        RAISE EXCEPTION 'Redemption amount ₹% exceeds available scheme balance of ₹%.', p_scheme_amount_used, v_available_balance;
    END IF;

    v_new_balance := v_available_balance - p_scheme_amount_used;
    v_customer_paid_balance := p_purchase_total - p_scheme_amount_used;

    -- 9. Generate unique redemption code (RJ-RED-YYYY-XXXXX)
    v_redemption_code := 'RJ-RED-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    -- 10. Insert redemption transaction
    INSERT INTO public.redemptions (
        redemption_code,
        customer_id,
        scheme_id,
        redemption_date,
        scheme_balance_before,
        scheme_amount_used,
        scheme_balance_after,
        purchase_total,
        customer_paid_balance,
        invoice_number,
        status,
        recorded_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_redemption_code,
        v_scheme.customer_id,
        p_scheme_id,
        v_now,
        v_available_balance,
        p_scheme_amount_used,
        v_new_balance,
        p_purchase_total,
        v_customer_paid_balance,
        p_invoice_number,
        'COMPLETED',
        v_admin_id,
        p_notes,
        v_now,
        v_now
    ) RETURNING id INTO v_redemption_id;

    -- 11. Insert itemized purchase lines
    FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS (
        item_description VARCHAR(255),
        category VARCHAR(30),
        quantity NUMERIC(8, 3),
        product_amount NUMERIC(12, 2),
        making_charges NUMERIC(12, 2),
        wastage_charges NUMERIC(12, 2),
        stone_charges NUMERIC(12, 2),
        other_charges NUMERIC(12, 2)
    )
    LOOP
        INSERT INTO public.redemption_items (
            redemption_id,
            item_description,
            category,
            quantity,
            product_amount,
            making_charges,
            wastage_charges,
            stone_charges,
            other_charges,
            final_item_amount,
            created_at
        ) VALUES (
            v_redemption_id,
            v_item.item_description,
            v_item.category,
            coalesce(v_item.quantity, 1.000),
            coalesce(v_item.product_amount, 0.00),
            coalesce(v_item.making_charges, 0.00),
            coalesce(v_item.wastage_charges, 0.00),
            coalesce(v_item.stone_charges, 0.00),
            coalesce(v_item.other_charges, 0.00),
            (
                coalesce(v_item.product_amount, 0.00) +
                coalesce(v_item.making_charges, 0.00) +
                coalesce(v_item.wastage_charges, 0.00) +
                coalesce(v_item.stone_charges, 0.00) +
                coalesce(v_item.other_charges, 0.00)
            ),
            v_now
        );
    END LOOP;

    -- 12. Update scheme status (PARTIALLY_REDEEMED vs FULLY_REDEEMED)
    IF v_new_balance = 0.00 THEN
        v_new_scheme_status := 'FULLY_REDEEMED';
    ELSE
        v_new_scheme_status := 'PARTIALLY_REDEEMED';
    END IF;

    UPDATE public.schemes
    SET status = v_new_scheme_status,
        updated_at = v_now
    WHERE id = p_scheme_id;

    -- 13. Create customer notification
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
        'Scheme Redemption Processed',
        'Redemption of ₹' || p_scheme_amount_used || ' applied against invoice #' || coalesce(p_invoice_number, 'N/A') || '. Remaining scheme balance: ₹' || v_new_balance || ' (Lifetime Validity).',
        'REDEMPTION_UPDATE',
        v_now
    );

    -- 14. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'REDEMPTION_PROCESSED',
        'redemptions',
        v_redemption_id,
        NULL,
        pg_catalog.json_build_object(
            'redemption_code', v_redemption_code,
            'scheme_id', p_scheme_id,
            'scheme_amount_used', p_scheme_amount_used,
            'purchase_total', p_purchase_total,
            'customer_paid_balance', v_customer_paid_balance,
            'scheme_balance_after', v_new_balance,
            'status', v_new_scheme_status
        )::jsonb,
        pg_catalog.json_build_object('invoice_number', p_invoice_number)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'redemption_code', v_redemption_code,
        'scheme_amount_used', p_scheme_amount_used,
        'customer_paid_balance', v_customer_paid_balance,
        'remaining_scheme_balance', v_new_balance,
        'scheme_status', v_new_scheme_status
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. GRANTS AND PRIVILEGES
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_customer_scheme(UUID, DATE, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_installment_payment(UUID, INTEGER, VARCHAR, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_scheme_redemption(UUID, NUMERIC, NUMERIC, VARCHAR, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_scheme_redemption(UUID, NUMERIC, NUMERIC, VARCHAR, JSONB, TEXT) TO authenticated;
