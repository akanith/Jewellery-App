-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260929143000_admin_cleanup_e2e_test_data_rpc_211.sql
-- Description: Update SECURITY DEFINER RPC public.admin_cleanup_e2e_test_data(p_execute boolean DEFAULT false)
--              to target the current reconciled 211 candidate customers set while preserving all
--              12 protected customer records, dry-run functionality, fail-closed assertions, and audit logs.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_cleanup_e2e_test_data(
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
    
    -- Protected Customer Codes list (12 Protected Records)
    v_protected_codes TEXT[] := ARRAY[
        'RJ-2026-471178',
        'RJ-2026-BF44A6',
        'RJ-2026-724F85',
        'RJ-2026-464E9E',
        'RJ-2026-544FDC',
        'RJ-2026-7E735B',
        'RJ-2026-7AA9CC',
        'RJ-2026-2B6D7F',
        'RJ-2026-E15662',
        'RJ-2026-C6B5E8',
        'RJ2026-276',
        'RJ2026-279'
    ];
    
    -- Candidate Customer UUIDs
    v_candidate_ids UUID[];
    v_candidate_count INTEGER;
    v_protected_count INTEGER;
    v_total_customer_count INTEGER;
    
    -- Candidate Financial Totals
    v_cand_payments_count INTEGER;
    v_cand_payments_amount NUMERIC;
    v_cand_paid_installments_count INTEGER;
    v_cand_total_installments_count INTEGER;
    v_cand_bonus_count INTEGER;
    v_cand_redemptions_count INTEGER;
    v_cand_redemption_items_count INTEGER;
    v_cand_emergency_refund_count INTEGER;
    
    -- Expected Remaining Totals
    v_rem_customer_count INTEGER;
    v_rem_payments_count INTEGER;
    v_rem_payments_amount NUMERIC;
    v_rem_paid_installments_count INTEGER;
    v_rem_total_installments_count INTEGER;
    v_rem_bonus_count INTEGER;
    v_rem_redemptions_count INTEGER;
    v_rem_redemption_items_count INTEGER;
    v_rem_emergency_refund_count INTEGER;
    
    -- Sequence & Suffix metrics
    v_seq_last_val BIGINT := NULL;
    v_max_numeric_suffix INTEGER := 0;
    
    -- Execution deletion tracking
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
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can invoke E2E cleanup.';
    END IF;

    -- 2. Identify Total & Protected Counts
    SELECT COUNT(*) INTO v_total_customer_count FROM public.customers;
    SELECT COUNT(*) INTO v_protected_count FROM public.customers WHERE customer_code = ANY(v_protected_codes);
    
    -- 3. Identify & Lock Candidate Customers Set
    SELECT ARRAY_AGG(id) INTO v_candidate_ids
    FROM public.customers
    WHERE customer_code NOT IN (SELECT UNNEST(v_protected_codes));
    
    v_candidate_count := ARRAY_LENGTH(v_candidate_ids, 1);
    IF v_candidate_count IS NULL THEN
        v_candidate_count := 0;
    END IF;

    -- 4. Fail-Closed Validation Assertions
    IF v_protected_count <> 12 THEN
        RAISE EXCEPTION 'Cleanup aborted: Expected exactly 12 protected customer records, found %.', v_protected_count;
    END IF;

    IF v_candidate_count <> 211 THEN
        RAISE EXCEPTION 'Cleanup aborted: Expected exactly 211 candidate customer records, found %.', v_candidate_count;
    END IF;

    -- Check that NO candidate customer matches any protected customer code
    IF EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = ANY(v_candidate_ids)
          AND customer_code = ANY(v_protected_codes)
    ) THEN
        RAISE EXCEPTION 'Cleanup aborted: Candidate set contains a protected customer record.';
    END IF;

    -- Check that NO candidate customer has emergency refunds
    SELECT COUNT(*) INTO v_cand_emergency_refund_count
    FROM public.schemes
    WHERE customer_id = ANY(v_candidate_ids)
      AND (emergency_refund_amount IS NOT NULL OR emergency_refund_date IS NOT NULL OR status = 'EMERGENCY_REFUNDED');

    IF v_cand_emergency_refund_count > 0 THEN
        RAISE EXCEPTION 'Cleanup aborted: Candidate set contains emergency refund records.';
    END IF;

    -- 5. Calculate Candidate Financial Totals
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_cand_payments_count, v_cand_payments_amount
    FROM public.payments
    WHERE customer_id = ANY(v_candidate_ids)
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));

    SELECT COUNT(*) INTO v_cand_paid_installments_count
    FROM public.scheme_installments
    WHERE (customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids)))
      AND status = 'PAID';

    SELECT COUNT(*) INTO v_cand_total_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));

    SELECT COUNT(*) INTO v_cand_bonus_count
    FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));

    SELECT COUNT(*) INTO v_cand_redemptions_count
    FROM public.redemptions
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));

    SELECT COUNT(*) INTO v_cand_redemption_items_count
    FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions
        WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids))
    );

    -- 6. Calculate Expected Post-Cleanup Remaining Production Totals
    SELECT COUNT(*) INTO v_rem_customer_count FROM public.customers WHERE customer_code = ANY(v_protected_codes);
    
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_rem_payments_count, v_rem_payments_amount
    FROM public.payments
    WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes)));

    SELECT COUNT(*) INTO v_rem_paid_installments_count
    FROM public.scheme_installments
    WHERE (customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))))
      AND status = 'PAID';

    SELECT COUNT(*) INTO v_rem_total_installments_count
    FROM public.scheme_installments
    WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes)));

    SELECT COUNT(*) INTO v_rem_bonus_count
    FROM public.scheme_bonuses
    WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes)));

    SELECT COUNT(*) INTO v_rem_redemptions_count
    FROM public.redemptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
       OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes)));

    SELECT COUNT(*) INTO v_rem_redemption_items_count
    FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions
        WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes))
           OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id IN (SELECT id FROM public.customers WHERE customer_code = ANY(v_protected_codes)))
    );

    -- 7. Inspect Sequence State & Maximum Numeric Suffix
    BEGIN
        SELECT last_value INTO v_seq_last_val FROM public.customer_code_seq;
    EXCEPTION WHEN OTHERS THEN
        v_seq_last_val := NULL;
    END;

    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(customer_code, '\D', '', 'g') AS INTEGER)), 0)
      INTO v_max_numeric_suffix
    FROM public.customers;

    -- 8. If DRY RUN MODE (p_execute = false): Return Structured JSON Report without modifying data
    IF NOT p_execute THEN
        RETURN pg_catalog.json_build_object(
            'mode', 'DRY_RUN',
            'executed', false,
            'candidate_count', v_candidate_count,
            'protected_count', v_protected_count,
            'payment_count', v_cand_payments_count,
            'payment_amount', v_cand_payments_amount,
            'paid_installment_count', v_cand_paid_installments_count,
            'total_installment_count', v_cand_total_installments_count,
            'bonus_count', v_cand_bonus_count,
            'redemption_count', v_cand_redemptions_count,
            'redemption_item_count', v_cand_redemption_items_count,
            'emergency_refund_count', v_cand_emergency_refund_count,
            'expected_remaining_customer_count', v_rem_customer_count,
            'expected_remaining_payment_count', v_rem_payments_count,
            'expected_remaining_payment_amount', v_rem_payments_amount,
            'expected_remaining_paid_installments', v_rem_paid_installments_count,
            'expected_remaining_total_installments', v_rem_total_installments_count,
            'expected_remaining_bonus_count', v_rem_bonus_count,
            'expected_remaining_redemption_count', v_rem_redemptions_count,
            'expected_remaining_redemption_item_count', v_rem_redemption_items_count,
            'sequence_last_value', v_seq_last_val,
            'max_numeric_suffix', v_max_numeric_suffix
        );
    END IF;

    -- 9. EXECUTION MODE (p_execute = true): Perform Dependency-Safe Atomic Deletion
    -- Deletion Step 1: customer_password_reset_requests
    DELETE FROM public.customer_password_reset_requests WHERE customer_id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_pw_requests = ROW_COUNT;

    -- Deletion Step 2: customer_sessions
    DELETE FROM public.customer_sessions WHERE customer_id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

    -- Deletion Step 3: customer_auth
    DELETE FROM public.customer_auth WHERE customer_id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;

    -- Deletion Step 4: notifications
    DELETE FROM public.notifications WHERE customer_id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

    -- Deletion Step 5: redemption_items
    DELETE FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions
        WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids))
    );
    GET DIAGNOSTICS v_deleted_redemption_items = ROW_COUNT;

    -- Deletion Step 6: redemptions
    DELETE FROM public.redemptions
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));
    GET DIAGNOSTICS v_deleted_redemptions = ROW_COUNT;

    -- Deletion Step 7: payments
    DELETE FROM public.payments
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    -- Deletion Step 8: scheme_bonuses
    DELETE FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));
    GET DIAGNOSTICS v_deleted_bonuses = ROW_COUNT;

    -- Deletion Step 9: scheme_installments
    DELETE FROM public.scheme_installments
    WHERE customer_id = ANY(v_candidate_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_candidate_ids));
    GET DIAGNOSTICS v_deleted_installments = ROW_COUNT;

    -- Deletion Step 10: schemes
    DELETE FROM public.schemes WHERE customer_id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_schemes = ROW_COUNT;

    -- Deletion Step 11: customers
    DELETE FROM public.customers WHERE id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_customers = ROW_COUNT;

    -- Deletion Step 12: profiles
    DELETE FROM public.profiles WHERE id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

    -- 10. Post-Delete Assertions
    IF (SELECT COUNT(*) FROM public.customers) <> 12 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining customers count is not 12.';
    END IF;

    IF (SELECT COUNT(*) FROM public.payments) <> 23 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining payments count is not 23.';
    END IF;

    IF (SELECT COALESCE(SUM(amount), 0) FROM public.payments) <> 23000 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining payment amount is not 23,000.';
    END IF;

    IF (SELECT COUNT(*) FROM public.redemptions) <> 1 THEN
        RAISE EXCEPTION 'Post-deletion assertion failed: Remaining redemptions count is not 1.';
    END IF;

    -- 11. Audit Logging BEFORE Transaction Commit
    PERFORM private.log_audit(
        v_admin_id,
        'E2E_TEST_DATA_PURGED',
        'customers',
        COALESCE(v_admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
        pg_catalog.json_build_object(
            'purged_candidate_customers', v_deleted_customers,
            'purged_payments_count', v_deleted_payments,
            'purged_payment_amount', v_cand_payments_amount,
            'purged_installments_count', v_deleted_installments,
            'purged_bonuses_count', v_deleted_bonuses,
            'purged_redemptions_count', v_deleted_redemptions,
            'purged_redemption_items_count', v_deleted_redemption_items
        )::jsonb,
        NULL,
        pg_catalog.json_build_object(
            'executed_by', v_admin_id,
            'executed_at', v_now
        )::jsonb
    );

    -- 12. Return Execution Report
    RETURN pg_catalog.json_build_object(
        'mode', 'EXECUTED',
        'executed', true,
        'deleted_customer_count', v_deleted_customers,
        'deleted_payment_count', v_deleted_payments,
        'deleted_payment_amount', v_cand_payments_amount,
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
REVOKE ALL ON FUNCTION public.admin_cleanup_e2e_test_data(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_e2e_test_data(BOOLEAN) TO authenticated;
