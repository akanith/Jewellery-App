-- Migration 012: Atomic RPC Functions with Concurrency Row-Locking & Strict Security Checks

-- 1. Atomic RPC: Record Installment Payment
CREATE OR REPLACE FUNCTION public.record_installment_payment(
    p_customer_scheme_id UUID,
    p_installment_id UUID,
    p_amount NUMERIC(12,2),
    p_payment_method TEXT,
    p_payment_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_payment_id UUID;
    v_paid_count INT;
    v_total_installments INT;
    v_installment_status TEXT;
    v_scheme_status TEXT;
BEGIN
    -- 1. Check Authentication & Authorization
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF public.get_current_user_role() NOT IN ('OWNER', 'ADMIN', 'STAFF') THEN
        RAISE EXCEPTION 'Access denied. Privileged role required.';
    END IF;

    -- 2. Validate Payment Amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    -- 3. Row Locking on Customer Scheme (FOR UPDATE prevents race conditions)
    SELECT customer_id, total_installments, status
    INTO v_customer_id, v_total_installments, v_scheme_status
    FROM public.customer_schemes
    WHERE id = p_customer_scheme_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer scheme record not found.';
    END IF;

    IF v_scheme_status NOT IN ('ACTIVE') THEN
        RAISE EXCEPTION 'Cannot record payment for a non-active scheme.';
    END IF;

    -- 4. Installment Validation & Row Locking (FOR UPDATE)
    SELECT status
    INTO v_installment_status
    FROM public.installments
    WHERE id = p_installment_id AND customer_scheme_id = p_customer_scheme_id
    FOR UPDATE;

    IF v_installment_status IS NULL THEN
        RAISE EXCEPTION 'Installment record not found for this customer scheme.';
    END IF;

    IF v_installment_status = 'PAID' THEN
        RAISE EXCEPTION 'This installment has already been paid.';
    END IF;

    -- 5. Update Installment Status
    UPDATE public.installments
    SET status = 'PAID',
        paid_amount = p_amount,
        payment_date = NOW(),
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        received_by = auth.uid()
    WHERE id = p_installment_id AND customer_scheme_id = p_customer_scheme_id;

    -- 6. Insert Financial Payment Record
    INSERT INTO public.payments (
        customer_scheme_id,
        installment_id,
        customer_id,
        amount,
        payment_method,
        payment_reference,
        received_by,
        notes
    ) VALUES (
        p_customer_scheme_id,
        p_installment_id,
        v_customer_id,
        p_amount,
        p_payment_method,
        p_payment_reference,
        auth.uid(),
        p_notes
    ) RETURNING id INTO v_payment_id;

    -- 7. Recalculate Customer Scheme Totals
    SELECT COUNT(*) INTO v_paid_count
    FROM public.installments
    WHERE customer_scheme_id = p_customer_scheme_id AND status = 'PAID';

    UPDATE public.customer_schemes
    SET paid_installments_count = v_paid_count,
        total_amount_paid = total_amount_paid + p_amount,
        status = CASE WHEN v_paid_count >= v_total_installments THEN 'COMPLETED' ELSE 'ACTIVE' END
    WHERE id = p_customer_scheme_id;

    -- 8. Create In-App Notifications
    INSERT INTO public.notifications (customer_id, title, message, type, metadata)
    VALUES (
        v_customer_id,
        'Payment Recorded',
        'Your installment payment of ₹' || p_amount::text || ' has been successfully recorded.',
        'PAYMENT',
        jsonb_build_object('payment_id', v_payment_id, 'amount', p_amount, 'customer_scheme_id', p_customer_scheme_id)
    );

    IF v_paid_count >= v_total_installments THEN
        INSERT INTO public.notifications (customer_id, title, message, type, metadata)
        VALUES (
            v_customer_id,
            'Scheme Completed!',
            'Congratulations! You have completed all installments for your savings scheme.',
            'SCHEME',
            jsonb_build_object('customer_scheme_id', p_customer_scheme_id)
        );
    END IF;

    -- 9. Record Audit Log
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (
        auth.uid(),
        'RECORD_PAYMENT',
        'payments',
        v_payment_id::text,
        jsonb_build_object(
            'customer_scheme_id', p_customer_scheme_id,
            'installment_id', p_installment_id,
            'amount', p_amount,
            'payment_method', p_payment_method
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'paid_installments_count', v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Atomic RPC: Process Scheme Redemption
CREATE OR REPLACE FUNCTION public.process_scheme_redemption(
    p_customer_scheme_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_customer_id UUID;
    v_total_paid NUMERIC(12,2);
    v_monthly_amount NUMERIC(12,2);
    v_bonus_amount NUMERIC(12,2);
    v_final_value NUMERIC(12,2);
    v_scheme_status TEXT;
    v_redemption_id UUID;
    v_paid_count INT;
    v_total_installments INT;
BEGIN
    -- 1. Check Authentication & Authorization
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF public.get_current_user_role() NOT IN ('OWNER', 'ADMIN') THEN
        RAISE EXCEPTION 'Access denied. Owner or Admin role required for redemption.';
    END IF;

    -- 2. Row Locking & Scheme Check
    SELECT customer_id, total_amount_paid, monthly_amount, status, paid_installments_count, total_installments
    INTO v_customer_id, v_total_paid, v_monthly_amount, v_scheme_status, v_paid_count, v_total_installments
    FROM public.customer_schemes
    WHERE id = p_customer_scheme_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer scheme record not found.';
    END IF;

    IF v_scheme_status = 'REDEEMED' THEN
        RAISE EXCEPTION 'This customer scheme has already been redeemed.';
    END IF;

    IF v_scheme_status NOT IN ('COMPLETED', 'ACTIVE') THEN
        RAISE EXCEPTION 'Scheme is not eligible for redemption in current status.';
    END IF;

    -- 3. Calculate Bonus (1 month bonus default for completed term)
    IF v_scheme_status = 'COMPLETED' OR v_paid_count >= v_total_installments THEN
        v_bonus_amount := v_monthly_amount;
    ELSE
        v_bonus_amount := 0.00;
    END IF;

    v_final_value := v_total_paid + v_bonus_amount;

    -- 4. Create Redemption Record
    INSERT INTO public.redemptions (
        customer_scheme_id,
        customer_id,
        total_paid_amount,
        bonus_amount,
        final_redeemed_value,
        status,
        approved_by,
        approved_at,
        notes
    ) VALUES (
        p_customer_scheme_id,
        v_customer_id,
        v_total_paid,
        v_bonus_amount,
        v_final_value,
        'APPROVED',
        auth.uid(),
        NOW(),
        p_notes
    ) RETURNING id INTO v_redemption_id;

    -- 5. Update Scheme Status
    UPDATE public.customer_schemes
    SET status = 'REDEEMED'
    WHERE id = p_customer_scheme_id;

    -- 6. Create In-App Notification
    INSERT INTO public.notifications (customer_id, title, message, type, metadata)
    VALUES (
        v_customer_id,
        'Scheme Redeemed',
        'Your scheme redemption of ₹' || v_final_value::text || ' has been completed successfully.',
        'REDEMPTION',
        jsonb_build_object('redemption_id', v_redemption_id, 'customer_scheme_id', p_customer_scheme_id, 'final_value', v_final_value)
    );

    -- 7. Record Audit Log
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (
        auth.uid(),
        'PROCESS_REDEMPTION',
        'redemptions',
        v_redemption_id::text,
        jsonb_build_object(
            'customer_scheme_id', p_customer_scheme_id,
            'final_redeemed_value', v_final_value
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'final_redeemed_value', v_final_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atomic RPC: Admin Dashboard Summary Statistics
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_customers INT;
    v_active_schemes INT;
    v_total_collections NUMERIC(12,2);
    v_pending_installments INT;
BEGIN
    -- 1. Authentication & Authorization Check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF public.get_current_user_role() NOT IN ('OWNER', 'ADMIN') THEN
        RAISE EXCEPTION 'Access denied. Owner or Admin role required.';
    END IF;

    -- 2. Aggregations
    SELECT COUNT(*) INTO v_total_customers FROM public.customers WHERE status = 'ACTIVE';
    SELECT COUNT(*) INTO v_active_schemes FROM public.customer_schemes WHERE status = 'ACTIVE';
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_collections FROM public.payments WHERE status = 'COMPLETED';
    SELECT COUNT(*) INTO v_pending_installments FROM public.installments WHERE status = 'PENDING';

    RETURN jsonb_build_object(
        'total_customers', v_total_customers,
        'active_schemes', v_active_schemes,
        'total_collections', v_total_collections,
        'pending_installments', v_pending_installments
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
