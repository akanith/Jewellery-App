-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261023214500_remove_obsolete_emergency_refunds_table_references.sql
-- Description: Targeted repair migration resolving database lint errors in
--              delete_customer_account and admin_cleanup_six_test_customers by
--              removing all obsolete references to the non-existent standalone
--              table public.emergency_refunds (including dynamic SQL).
--
-- Business Architecture Note:
--              Emergency refunds in Ramyas Jeweller are tracked directly on
--              public.schemes via status = 'EMERGENCY_REFUNDED' and the columns
--              emergency_refund_amount, emergency_refund_date, emergency_refund_by,
--              and emergency_refund_notes. The standalone table emergency_refunds
--              does not exist in the schema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. REPAIR delete_customer_account (REMOVE OBSOLETE EMERGENCY_REFUNDS REFERENCE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_customer_account(
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_customer RECORD;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF COALESCE(private.is_admin(), FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can delete customer accounts.';
    END IF;

    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL.' USING ERRCODE = '22004';
    END IF;

    -- 2. Customer Lookup & Concurrency Protection
    SELECT c.id, c.customer_code, c.full_name, c.phone_number
      INTO v_customer
    FROM public.customers c
    WHERE c.id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found.';
    END IF;

    -- 3. Safety Protection: Prevent deletion of Admin users
    IF EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = p_customer_id
    ) THEN
        RAISE EXCEPTION 'Safety Violation: Cannot delete administrator account using customer deletion procedure.';
    END IF;

    -- 4. Audit Log Entry BEFORE deletion
    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_PERMANENTLY_DELETED',
        'customers',
        p_customer_id,
        pg_catalog.json_build_object(
            'customer_code', v_customer.customer_code,
            'full_name', v_customer.full_name,
            'phone_number', v_customer.phone_number
        )::jsonb,
        NULL,
        pg_catalog.json_build_object(
            'deleted_by', v_admin_id,
            'deleted_at', v_now
        )::jsonb
    );

    -- 5. FK-Safe Order Deletion of All Customer-Owned Dependent Records
    DELETE FROM public.customer_password_reset_requests WHERE customer_id = p_customer_id;
    DELETE FROM public.customer_sessions WHERE customer_id = p_customer_id;
    DELETE FROM public.customer_auth WHERE customer_id = p_customer_id;
    DELETE FROM public.notifications WHERE customer_id = p_customer_id;

    DELETE FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions WHERE customer_id = p_customer_id
    );
    DELETE FROM public.redemptions WHERE customer_id = p_customer_id;

    DELETE FROM public.payments WHERE customer_id = p_customer_id;

    DELETE FROM public.scheme_bonuses
    WHERE customer_id = p_customer_id OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = p_customer_id);

    DELETE FROM public.scheme_installments
    WHERE customer_id = p_customer_id OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = p_customer_id);

    DELETE FROM public.customer_profile_authorizations
    WHERE grantor_customer_id = p_customer_id OR grantee_customer_id = p_customer_id;

    DELETE FROM public.schemes WHERE customer_id = p_customer_id;
    DELETE FROM public.customers WHERE id = p_customer_id;
    DELETE FROM public.profiles WHERE id = p_customer_id;

    RETURN pg_catalog.json_build_object(
        'success', true,
        'message', 'Customer account and all associated data permanently deleted.',
        'customer_id', p_customer_id,
        'customer_code', v_customer.customer_code
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_customer_account(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_account(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. REPAIR admin_cleanup_six_test_customers (SCHEME-LEVEL REFUND GUARD ONLY)
-- -----------------------------------------------------------------------------
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
    v_target_codes TEXT[] := ARRAY['RJ2026-001', 'RJ2026-002', 'RJ2026-003', 'RJ2026-005', 'RJ2026-006', 'RJ2026-007'];
    v_protected_codes TEXT[] := ARRAY['RJ2026-004', 'RJ2026-008', 'RJ2026-009', 'RJ2026-010', 'RJ2026-011', 'RJ2026-012'];
    v_target_ids UUID[];
    v_protected_ids UUID[];
    v_target_count INTEGER;
    v_protected_count INTEGER;
    v_target_payments_count INTEGER;
    v_target_payments_amount NUMERIC(12, 2);
    v_target_paid_installments_count INTEGER;
    v_target_total_installments_count INTEGER;
    v_target_bonus_count INTEGER;
    v_target_redemptions_count INTEGER;
    v_target_redemption_items_count INTEGER;
    v_target_emergency_refund_count INTEGER := 0;
    v_seq_last_val BIGINT;
    v_rem_customer_count INTEGER;
    v_rem_payments_count INTEGER;
    v_rem_payments_amount NUMERIC(12, 2);
    v_rem_paid_installments_count INTEGER;
    v_rem_total_installments_count INTEGER;
    v_rem_bonus_count INTEGER;
    v_rem_redemptions_count INTEGER;
    v_rem_redemption_items_count INTEGER;
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
    IF COALESCE(private.is_admin(), FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can execute cleanup procedures.';
    END IF;

    -- 2. Target and Protected Account Identification
    SELECT array_agg(id) INTO v_target_ids
    FROM public.customers
    WHERE customer_code = ANY(v_target_codes);

    v_target_count := COALESCE(array_length(v_target_ids, 1), 0);

    SELECT array_agg(id) INTO v_protected_ids
    FROM public.customers
    WHERE customer_code = ANY(v_protected_codes);

    v_protected_count := COALESCE(array_length(v_protected_ids, 1), 0);

    IF v_target_count = 0 THEN
        RETURN pg_catalog.json_build_object(
            'success', true,
            'message', 'No target test customer accounts found. Database is already clean.',
            'target_customer_count', 0,
            'protected_customer_count', v_protected_count
        );
    END IF;

    -- 3. Count dependent records for target accounts
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_target_payments_count, v_target_payments_amount
    FROM public.payments
    WHERE customer_id = ANY(v_target_ids);

    SELECT COUNT(*) INTO v_target_paid_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids) AND status = 'PAID';

    SELECT COUNT(*) INTO v_target_total_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids);

    SELECT COUNT(*) INTO v_target_bonus_count
    FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_target_ids);

    SELECT COUNT(*) INTO v_target_redemptions_count
    FROM public.redemptions
    WHERE customer_id = ANY(v_target_ids);

    SELECT COUNT(*) INTO v_target_redemption_items_count
    FROM public.redemption_items ri
    JOIN public.redemptions r ON ri.redemption_id = r.id
    WHERE r.customer_id = ANY(v_target_ids);

    -- 4. Emergency Refund Guard: Inspect actual scheme refund status and refund amounts on public.schemes
    SELECT COUNT(*) INTO v_target_emergency_refund_count
    FROM public.schemes
    WHERE customer_id = ANY(v_target_ids)
      AND (
          status = 'EMERGENCY_REFUNDED'
          OR COALESCE(emergency_refund_amount, 0) > 0
          OR emergency_refund_date IS NOT NULL
      );

    -- 5. Calculate Expected Remaining Totals for Genuine Accounts
    SELECT COUNT(*) INTO v_rem_customer_count
    FROM public.customers
    WHERE customer_code = ANY(v_protected_codes);

    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_rem_payments_count, v_rem_payments_amount
    FROM public.payments
    WHERE customer_id = ANY(v_protected_ids);

    SELECT COUNT(*) INTO v_rem_paid_installments_count
    FROM public.scheme_installments
    WHERE customer_id = ANY(v_protected_ids) AND status = 'PAID';

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

    -- 6. Sequence Inspection
    BEGIN
        SELECT last_value INTO v_seq_last_val FROM public.customer_code_seq;
    EXCEPTION WHEN OTHERS THEN
        v_seq_last_val := NULL;
    END;

    -- 7. Return Dry-Run Report if p_execute IS NOT TRUE (fails closed on FALSE and NULL)
    IF COALESCE(p_execute, FALSE) IS NOT TRUE THEN
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

    -- 8. Execution Safety Guard: Strictly block destructive execution if database is not in the exact 12-test-customer state
    IF (SELECT COUNT(*) FROM public.customers) <> 12 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Database contains % customers. Cleanup procedure is only authorized for the specific 12-test-customer fixture.', (SELECT COUNT(*) FROM public.customers);
    END IF;

    -- Strictly block destructive execution if any target customer has an emergency refund
    IF v_target_emergency_refund_count > 0 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Target test customers contain % emergency refund records on schemes.', v_target_emergency_refund_count;
    END IF;

    -- 9. Destructive Execution Steps (Order enforced by Foreign Keys)
    DELETE FROM public.customer_password_reset_requests WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_pw_requests = ROW_COUNT;

    DELETE FROM public.customer_sessions WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

    DELETE FROM public.customer_auth WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;

    DELETE FROM public.notifications WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

    DELETE FROM public.redemption_items
    WHERE redemption_id IN (
        SELECT id FROM public.redemptions WHERE customer_id = ANY(v_target_ids)
    );
    GET DIAGNOSTICS v_deleted_redemption_items = ROW_COUNT;

    DELETE FROM public.redemptions WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_redemptions = ROW_COUNT;

    DELETE FROM public.payments WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    DELETE FROM public.scheme_bonuses
    WHERE customer_id = ANY(v_target_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_target_ids));
    GET DIAGNOSTICS v_deleted_bonuses = ROW_COUNT;

    DELETE FROM public.scheme_installments
    WHERE customer_id = ANY(v_target_ids) OR scheme_id IN (SELECT id FROM public.schemes WHERE customer_id = ANY(v_target_ids));
    GET DIAGNOSTICS v_deleted_installments = ROW_COUNT;

    DELETE FROM public.customer_profile_authorizations
    WHERE grantor_customer_id = ANY(v_target_ids) OR grantee_customer_id = ANY(v_target_ids);

    DELETE FROM public.schemes WHERE customer_id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_schemes = ROW_COUNT;

    DELETE FROM public.customers WHERE id = ANY(v_target_ids);
    GET DIAGNOSTICS v_deleted_customers = ROW_COUNT;

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

REVOKE ALL ON FUNCTION public.admin_cleanup_six_test_customers(BOOLEAN) FROM PUBLIC, anon, authenticated;
