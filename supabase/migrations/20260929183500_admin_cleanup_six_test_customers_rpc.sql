-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260929183500_admin_cleanup_six_test_customers_rpc.sql
-- Description: Create SECURITY DEFINER RPC public.admin_cleanup_six_test_customers(p_execute boolean DEFAULT false)
--              to safely purge the 6 verified test/E2E customer records while explicitly preserving all
--              6 genuine production customer accounts, dry-run support, strict fail-closed guards, and audit logs.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_cleanup_six_test_customers(
    p_execute BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();

    -- Protected Genuine Customer Codes (6 Genuine Records)
    v_protected_codes TEXT[] := ARRAY[
        'RJ-2026-724F85',
        'RJ-2026-464E9E',
        'RJ-2026-544FDC',
        'RJ-2026-7E735B',
        'RJ-2026-7AA9CC',
        'RJ2026-279'
    ];

    -- Target Test Customer Codes (6 Confirmed Test Records)
    v_target_codes TEXT[] := ARRAY[
        'RJ-2026-471178',
        'RJ-2026-BF44A6',
        'RJ-2026-2B6D7F',
        'RJ-2026-E15662',
        'RJ2026-276',
        'RJ-2026-C6B5E8'
    ];

    -- ID Arrays & Counts
    v_protected_ids UUID[];
    v_target_ids UUID[];
    v_total_customer_count INTEGER;
    v_protected_count INTEGER;
    v_target_count INTEGER;

    -- Target Financial Metrics
    v_target_payments_count INTEGER;
    v_target_payments_amount NUMERIC;
    v_target_paid_installments_count INTEGER;
    v_target_total_installments_count INTEGER;
    v_target_bonus_count INTEGER;
    v_target_redemptions_count INTEGER;
    v_target_redemption_items_count INTEGER;
    v_target_emergency_refund_count INTEGER;

    -- Expected Remaining Metrics
    v_rem_customer_count INTEGER;
    v_rem_payments_count INTEGER;
    v_rem_payments_amount NUMERIC;
    v_rem_paid_installments_count INTEGER;
    v_rem_total_installments_count INTEGER;
    v_rem_bonus_count INTEGER;
    v_rem_redemptions_count INTEGER;
    v_rem_redemption_items_count INTEGER;
    v_rem_emergency_refund_count INTEGER;

    -- Sequence audit metrics
    v_seq_last_val BIGINT := NULL;
    v_max_numeric_suffix INTEGER := 0;

    -- Execution deletion counters
    v_deleted_pw_requests INTEGER := 0;
    v_deleted_sessions INTEGER := 0;
    v_deleted_auth INTEGER := 0;
    v_deleted_notifications INTEGER := 0;
    v_deleted_redemption_items INTEGER := 0;
    v_deleted_redemptions INTEGER := 0;
    v_deleted_payments INTEGER := 0;
    v_deleted_bonuses INTEGER := 0;
    v_deleted_installments INTEGER := 0;
    v_deleted_schemes INTEGER := 0;
    v_deleted_customers INTEGER := 0;
    v_deleted_profiles INTEGER := 0;
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can invoke test customer cleanup.';
    END IF;

    -- 2. Total & Protected Customer Verification
    SELECT COUNT(*) INTO v_total_customer_count FROM public.customers;

    SELECT ARRAY_AGG(id) INTO v_protected_ids
    FROM public.customers
    WHERE customer_code = ANY(v_protected_codes);

    v_protected_count := ARRAY_LENGTH(v_protected_ids, 1);
    IF v_protected_count IS NULL THEN
        v_protected_count := 0;
    END IF;

    IF v_protected_count <> 6 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Expected exactly 6 protected genuine customer records, found %.', v_protected_count;
    END IF;

    -- 3. Identify & Lock Target Test Customer Accounts
    SELECT ARRAY_AGG(id) INTO v_target_ids
    FROM public.customers
    WHERE customer_code = ANY(v_target_codes);

    v_target_count := ARRAY_LENGTH(v_target_ids, 1);
    IF v_target_count IS NULL THEN
        v_target_count := 0;
    END IF;

    IF v_target_count <> 6 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Expected exactly 6 target test customer records, found %.', v_target_count;
    END IF;

    -- 4. Overlap & Integrity Protection Check
    IF EXISTS (
        SELECT 1 FROM UNNEST(v_protected_ids) pid
        JOIN UNNEST(v_target_ids) tid ON pid = tid
    ) THEN
        RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Overlap detected between protected customer IDs and target test customer IDs!';
    END IF;

    -- 5. Calculate Scope for Target Customers
    -- Payments
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_target_payments_count, v_target_payments_amount
    FROM public.payments
    WHERE customer_id = ANY(v_target_ids);

    -- Paid Installments
    SELECT COUNT(*) INTO v_target_paid_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids)
      AND (status = 'PAID' OR paid_amount > 0 OR paid_date IS NOT NULL);

    -- Total Installments
    SELECT COUNT(*) INTO v_target_total_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids);

    -- Bonuses
    SELECT COUNT(*) INTO v_target_bonus_count
    FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_target_ids);

    -- Redemptions
    SELECT COUNT(*) INTO v_target_redemptions_count
    FROM public.redemptions
    WHERE customer_id = ANY(v_target_ids);

    -- Redemption Items
    SELECT COUNT(*) INTO v_target_redemption_items_count
    FROM public.redemption_items ri
    JOIN public.redemptions r ON ri.redemption_id = r.id
    WHERE r.customer_id = ANY(v_target_ids);

    -- Emergency Refunds
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_refunds') THEN
        SELECT COUNT(*) INTO v_target_emergency_refund_count
        FROM public.emergency_refunds
        WHERE customer_id = ANY(v_target_ids);
    ELSE
        v_target_emergency_refund_count := 0;
    END IF;

    -- Emergency Refund Guard
    IF v_target_emergency_refund_count > 0 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Target test customers contain % emergency refund records.', v_target_emergency_refund_count;
    END IF;

    -- 6. Calculate Expected Remaining Totals for Genuine Accounts
    SELECT COUNT(*) INTO v_rem_customer_count
    FROM public.customers
    WHERE customer_code = ANY(v_protected_codes);

    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_rem_payments_count, v_rem_payments_amount
    FROM public.payments
    WHERE customer_id = ANY(v_protected_ids);

    SELECT COUNT(*) INTO v_rem_paid_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_protected_ids)
      AND (status = 'PAID' OR paid_amount > 0 OR paid_date IS NOT NULL);

    SELECT COUNT(*) INTO v_rem_total_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_protected_ids);

    SELECT COUNT(*) INTO v_rem_bonus_count
    FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_protected_ids);

    SELECT COUNT(*) INTO v_rem_redemptions_count
    FROM public.redemptions
    WHERE customer_id = ANY(v_protected_ids);

    SELECT COUNT(*) INTO v_rem_redemption_items_count
    FROM public.redemption_items ri
    JOIN public.redemptions r ON ri.redemption_id = r.id
    WHERE r.customer_id = ANY(v_protected_ids);

    -- 7. Sequence Inspection
    BEGIN
        SELECT last_value INTO v_seq_last_val FROM public.customer_code_seq;
    EXCEPTION WHEN OTHERS THEN
        v_seq_last_val := NULL;
    END;

    -- 8. Return Dry-Run Report if p_execute IS FALSE
    IF NOT p_execute THEN
        RETURN pg_catalog.json_build_object(
            'mode', 'DRY_RUN',
            'executed', false,
            'target_customer_count', v_target_count,
            'protected_customer_count', v_protected_count,
            'target_payments_count', v_target_payments_count,
            'target_payments_amount', v_target_payments_amount,
            'target_paid_installment_count', v_target_paid_installments_count,
            'target_total_installment_count', v_target_total_installments_count,
            'target_bonus_count', v_target_bonus_count,
            'target_redemption_count', v_target_redemptions_count,
            'target_redemption_item_count', v_target_redemption_items_count,
            'target_emergency_refund_count', v_target_emergency_refund_count,
            'sequence_last_value', v_seq_last_val,
            'expected_remaining_customer_count', v_rem_customer_count,
            'expected_remaining_payment_count', v_rem_payments_count,
            'expected_remaining_payment_amount', v_rem_payments_amount,
            'expected_remaining_paid_installments', v_rem_paid_installments_count,
            'expected_remaining_total_installments', v_rem_total_installments_count,
            'expected_remaining_bonus_count', v_rem_bonus_count,
            'expected_remaining_redemption_count', v_rem_redemptions_count,
            'expected_remaining_redemption_item_count', v_rem_redemption_items_count
        );
    END IF;

    -- 9. DESTRUCTIVE EXECUTION STEPS (Order enforced by Foreign Keys)
    
    -- Step 1: customer_password_reset_requests
    DELETE FROM public.customer_password_reset_requests WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_pw_requests = ROW_COUNT;

    -- Step 2: customer_sessions
    DELETE FROM public.customer_sessions WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

    -- Step 3: customer_auth
    DELETE FROM public.customer_auth WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;

    -- Step 4: notifications
    DELETE FROM public.notifications WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

    -- Step 5: redemption_items
    DELETE FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions WHERE customer_id = ANY(v_target_ids)
    );
    GET DIAGNOSTICS v_deleted_redemption_items = ROW_COUNT;

    -- Step 6: redemptions
    DELETE FROM public.redemptions WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_redemptions = ROW_COUNT;

    -- Step 7: payments
    DELETE FROM public.payments WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    -- Step 8: scheme_bonuses
    DELETE FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_target_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_target_ids));
    GET DIAGNOSTICS v_deleted_bonuses = ROW_COUNT;

    -- Step 9: scheme_installments
    DELETE FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_target_ids));
    GET DIAGNOSTICS v_deleted_installments = ROW_COUNT;

    -- Step 10: schemes
    DELETE FROM public.schemes WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_schemes = ROW_COUNT;

    -- Step 11: customers
    DELETE FROM public.customers WHERE id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_customers = ROW_COUNT;

    -- Step 12: profiles
    DELETE FROM public.profiles WHERE id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

    -- 10. Post-Delete Assertions
    IF (SELECT COUNT(*) FROM public.customers) <> 6 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining customers count is not 6.';
    END IF;

    IF (SELECT COUNT(*) FROM public.payments) <> 6 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining payments count is not 6.';
    END IF;

    IF (SELECT COALESCE(SUM(amount), 0) FROM public.payments) <> 6000 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining payment amount is not 6,000.';
    END IF;

    IF (SELECT COUNT(*) FROM public.redemptions) <> 0 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining redemptions count is not 0.';
    END IF;

    -- 11. Audit Logging BEFORE Transaction Commit
    PERFORM private.log_audit(
        v_admin_id,
        'SIX_TEST_CUSTOMERS_PURGED',
        'customers',
        COALESCE(v_admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
        pg_catalog.json_build_object(
            'purged_target_customers', v_deleted_customers,
            'purged_payments_count', v_deleted_payments,
            'purged_payment_amount', v_target_payments_amount,
            'purged_installments_count', v_deleted_installments,
            'purged_bonuses_count', v_deleted_bonuses,
            'purged_redemptions_count', v_deleted_redemptions,
            'purged_redemption_items_count', v_deleted_redemption_items
        )::jsonb,
        NULL,
        pg_catalog.json_build_object(
            'executed_by', v_admin_id,
            'executed_at', v_now,
            'protected_customers_count', v_rem_customer_count
        )::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'mode', 'EXECUTED',
        'executed', true,
        'deleted_customer_count', v_deleted_customers,
        'deleted_payment_count', v_deleted_payments,
        'deleted_payment_amount', v_target_payments_amount,
        'deleted_installment_count', v_deleted_installments,
        'deleted_bonus_count', v_deleted_bonuses,
        'deleted_redemption_count', v_deleted_redemptions,
        'deleted_redemption_item_count', v_deleted_redemption_items,
        'remaining_customer_count', (SELECT COUNT(*) FROM public.customers),
        'remaining_payment_count', (SELECT COUNT(*) FROM public.payments),
        'remaining_payment_amount', (SELECT COALESCE(SUM(amount), 0) FROM public.payments),
        'remaining_paid_installment_count', (SELECT COUNT(*) FROM public.scheme_installments WHERE status = 'PAID'),
        'remaining_bonus_count', (SELECT COUNT(*) FROM public.scheme_bonuses),
        'remaining_redemption_count', (SELECT COUNT(*) FROM public.redemptions),
        'remaining_redemption_item_count', (SELECT COUNT(*) FROM public.redemption_items)
    );
END;
$$;

-- Function Security Lockdown
REVOKE ALL ON FUNCTION public.admin_cleanup_six_test_customers(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_six_test_customers(BOOLEAN) TO authenticated;
