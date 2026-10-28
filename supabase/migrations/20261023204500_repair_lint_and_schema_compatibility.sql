-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261023204500_repair_lint_and_schema_compatibility.sql
-- Description: Targeted repair migration resolving database lint errors:
--              1. Fix standard SQL COALESCE syntax in process_emergency_refund.
--              2. Use dynamic SQL for optional emergency_refunds table in
--                 admin_cleanup_six_test_customers and delete_customer_account.
--              3. Align create_customer_with_scheme to canonical RJ-SCH-YYYY-XXXXXX
--                 scheme code generation and verified schema columns.
--              4. Add partial unique index on customer_password_reset_requests
--                 to support ON CONFLICT (customer_id) WHERE status = 'PENDING'.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PARTIAL UNIQUE INDEX FOR PENDING PASSWORD RESET REQUESTS
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_password_reset_pending_cust
    ON public.customer_password_reset_requests (customer_id)
    WHERE status = 'PENDING';

-- -----------------------------------------------------------------------------
-- 2. REPAIR process_emergency_refund (STANDARD SQL COALESCE SYNTAX)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_emergency_refund(
    p_scheme_id UUID,
    p_refund_amount NUMERIC(12, 2),
    p_refund_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_scheme RECORD;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_total_redeemed NUMERIC(12, 2) := 0.00;
    v_refundable_balance NUMERIC(12, 2) := 0.00;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Verify super-admin authorization
    IF NOT private.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators (Store Owner) can execute emergency refunds.';
    END IF;

    -- 2. Validate refund amount
    IF p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be strictly positive.';
    END IF;

    -- 3. Lock scheme record for concurrency protection
    SELECT * INTO v_scheme
    FROM public.schemes
    WHERE id = p_scheme_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme enrollment with ID % not found.', p_scheme_id;
    END IF;

    IF v_scheme.status IN ('EMERGENCY_REFUNDED', 'CANCELLED', 'FULLY_REDEEMED') THEN
        RAISE EXCEPTION 'Scheme cannot be refunded in current status (%).', v_scheme.status;
    END IF;

    -- 4. Calculate total contributions paid using standard SQL COALESCE
    SELECT COALESCE(pg_catalog.sum(paid_amount), 0.00) INTO v_total_paid
    FROM public.scheme_installments
    WHERE scheme_id = p_scheme_id AND status = 'PAID';

    SELECT COALESCE(pg_catalog.sum(scheme_amount_used), 0.00) INTO v_total_redeemed
    FROM public.redemptions
    WHERE scheme_id = p_scheme_id AND status = 'COMPLETED';

    v_refundable_balance := v_total_paid - v_total_redeemed;

    IF p_refund_amount > v_refundable_balance THEN
        RAISE EXCEPTION 'Refund amount (₹%) cannot exceed net unredeemed paid contribution (₹%).', p_refund_amount, v_refundable_balance;
    END IF;

    -- 5. Update scheme record
    UPDATE public.schemes
    SET status = 'EMERGENCY_REFUNDED',
        emergency_refund_amount = p_refund_amount,
        emergency_refund_date = v_now,
        emergency_refund_by = v_admin_id,
        emergency_refund_notes = p_refund_notes,
        updated_at = v_now
    WHERE id = p_scheme_id;

    -- 6. Forfeit any pending bonus
    UPDATE public.scheme_bonuses
    SET status = 'FORFEITED',
        is_eligible = FALSE,
        notes = 'Forfeited due to emergency refund authorization.',
        updated_at = v_now
    WHERE scheme_id = p_scheme_id AND status = 'PENDING';

    -- 7. Insert notification
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
        'Emergency Refund Processed',
        'An emergency manual refund of ₹' || p_refund_amount || ' has been processed by store administration.',
        'SHOP_UPDATE',
        v_now
    );

    -- 8. Append audit log
    PERFORM private.log_audit(
        v_admin_id,
        'EMERGENCY_REFUND_EXECUTED',
        'schemes',
        p_scheme_id,
        pg_catalog.json_build_object('status', v_scheme.status)::jsonb,
        pg_catalog.json_build_object(
            'status', 'EMERGENCY_REFUNDED',
            'refund_amount', p_refund_amount,
            'refund_notes', p_refund_notes
        )::jsonb,
        pg_catalog.json_build_object('total_paid', v_total_paid, 'total_redeemed', v_total_redeemed)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'scheme_id', p_scheme_id,
        'refund_amount', p_refund_amount,
        'status', 'EMERGENCY_REFUNDED'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.process_emergency_refund(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_emergency_refund(UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. REPAIR delete_customer_account (DYNAMIC SQL FOR OPTIONAL EMERGENCY_REFUNDS)
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

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_refunds') THEN
        EXECUTE 'DELETE FROM public.emergency_refunds WHERE customer_id = $1' USING p_customer_id;
    END IF;

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
-- 4. REPAIR admin_cleanup_six_test_customers (DYNAMIC SQL FOR OPTIONAL EMERGENCY_REFUNDS)
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

    -- Count dependent records
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

    -- Emergency Refund Guard: Inspect actual scheme refund status and refund amounts on public.schemes
    SELECT COUNT(*) INTO v_target_emergency_refund_count
    FROM public.schemes
    WHERE customer_id = ANY(v_target_ids)
      AND (
          status = 'EMERGENCY_REFUNDED'
          OR COALESCE(emergency_refund_amount, 0) > 0
          OR emergency_refund_date IS NOT NULL
      );

    -- Also inspect optional legacy emergency_refunds table via dynamic SQL if present
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_refunds') THEN
        DECLARE
            v_tbl_refund_count INTEGER := 0;
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM public.emergency_refunds WHERE customer_id = ANY($1)'
            INTO v_tbl_refund_count
            USING v_target_ids;
            v_target_emergency_refund_count := v_target_emergency_refund_count + v_tbl_refund_count;
        END;
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

    -- 7. Sequence Inspection
    BEGIN
        SELECT last_value INTO v_seq_last_val FROM public.customer_code_seq;
    EXCEPTION WHEN OTHERS THEN
        v_seq_last_val := NULL;
    END;

    -- 8. Return Dry-Run Report if p_execute IS NOT TRUE (fails closed on FALSE and NULL)
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

    -- 9. Execution Safety Guard: Strictly block destructive execution if database is not in the exact 12-test-customer state
    IF (SELECT COUNT(*) FROM public.customers) <> 12 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Database contains % customers. Cleanup procedure is only authorized for the specific 12-test-customer fixture.', (SELECT COUNT(*) FROM public.customers);
    END IF;

    -- Strictly block destructive execution if any target customer has an emergency refund
    IF v_target_emergency_refund_count > 0 THEN
        RAISE EXCEPTION 'Cleanup guard failure: Target test customers contain % emergency refund records across schemes/refund tables.', v_target_emergency_refund_count;
    END IF;

    -- 10. Destructive Execution Steps (Order enforced by Foreign Keys)
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

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_refunds') THEN
        EXECUTE 'DELETE FROM public.emergency_refunds WHERE customer_id = ANY($1)' USING v_target_ids;
    END IF;

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

-- -----------------------------------------------------------------------------
-- 5. REPAIR create_customer_with_scheme (CANONICAL RJ-SCH-YYYY-XXXXXX GENERATION & SCHEMA COLUMNS)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE);
DROP FUNCTION IF EXISTS public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID);

CREATE OR REPLACE FUNCTION public.create_customer_with_scheme(
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15),
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(50) DEFAULT 'Dindigul',
    p_pincode VARCHAR(10) DEFAULT NULL,
    p_alternate_phone VARCHAR(15) DEFAULT NULL,
    p_nominee_name VARCHAR(100) DEFAULT NULL,
    p_nominee_relationship VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_enroll_scheme BOOLEAN DEFAULT TRUE,
    p_start_month DATE DEFAULT NULL,
    p_link_family_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_clean_phone VARCHAR(15);
    v_clean_alt_phone VARCHAR(15);
    v_customer_id UUID;
    v_customer_code VARCHAR(30);
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_init_hash TEXT;

    -- Scheme Variables
    v_scheme_id UUID := NULL;
    v_scheme_code VARCHAR(30) := NULL;
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
    v_scheme_attempts INTEGER := 0;
    v_err_constraint TEXT;
BEGIN
    -- 1. Authorization Verification
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can create customers.';
    END IF;

    -- 2. Validate Mobile Number
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    -- 3. Validate Full Name
    IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_full_name, ''))) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    -- 4. Check if phone is registered to an administrator
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
          AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'This mobile number is already registered to an administrator.';
    END IF;

    IF p_alternate_phone IS NOT NULL THEN
        v_clean_alt_phone := NULLIF(pg_catalog.regexp_replace(p_alternate_phone, '\D', '', 'g'), '');
    ELSE
        v_clean_alt_phone := NULL;
    END IF;

    -- 5. Concurrency-Safe Sequential Customer Code Generation
    v_customer_id := pg_catalog.gen_random_uuid();
    LOOP
        v_customer_code := 'RJ' || v_year || '-' || lpad(nextval('public.customer_code_seq')::text, 3, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customers WHERE customer_code = v_customer_code);
    END LOOP;

    -- 6. Insert Profile
    INSERT INTO public.profiles (
        id, role, phone_number, full_name, is_active, created_at, updated_at
    ) VALUES (
        v_customer_id, 'CUSTOMER', v_clean_phone, pg_catalog.btrim(p_full_name), TRUE, v_now, v_now
    );

    -- 7. Insert Customer
    INSERT INTO public.customers (
        id, customer_code, phone_number, full_name, address, city, pincode,
        alternate_phone, nominee_name, nominee_relationship, notes, created_by, created_at, updated_at
    ) VALUES (
        v_customer_id, v_customer_code, v_clean_phone, pg_catalog.btrim(p_full_name),
        NULLIF(pg_catalog.btrim(p_address), ''), COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        NULLIF(pg_catalog.btrim(p_pincode), ''), v_clean_alt_phone, NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        NULLIF(pg_catalog.btrim(p_nominee_relationship), ''), NULLIF(pg_catalog.btrim(p_notes), ''), v_admin_id, v_now, v_now
    );

    -- 8. Optional Verified Family Linking
    IF p_link_family_customer_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.customers WHERE id = p_link_family_customer_id) THEN
            INSERT INTO public.customer_profile_authorizations (
                grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by
            ) VALUES
                (v_customer_id, p_link_family_customer_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
                (p_link_family_customer_id, v_customer_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED')
            ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
            SET is_active = TRUE, updated_at = v_now;
        END IF;
    END IF;

    -- 9. Initialize Customer Auth
    v_init_hash := extensions.crypt(pg_catalog.right(v_clean_phone, 4), extensions.gen_salt('bf', 10));
    INSERT INTO public.customer_auth (
        customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
    ) VALUES (
        v_customer_id, v_init_hash, 'RESET_REQUIRED', 0, NULL, v_now, v_now
    ) ON CONFLICT (customer_id) DO NOTHING;

    -- 10. Audit Log
    PERFORM private.log_audit(
        v_admin_id, 'CREATE', 'customers', v_customer_id, NULL,
        pg_catalog.jsonb_build_object(
            'customer_id', v_customer_id,
            'customer_code', v_customer_code,
            'phone_number', v_clean_phone,
            'full_name', p_full_name,
            'linked_family_customer_id', p_link_family_customer_id
        ), '{}'
    );

    -- 11. Optional Scheme Enrollment (Using Canonical Collision-Resistant Scheme Code & Production Columns)
    IF p_enroll_scheme THEN
        v_start_date := pg_catalog.date_trunc('month', COALESCE(p_start_month, v_now::date))::DATE;
        v_end_date := (v_start_date + INTERVAL '11 months')::DATE;

        -- Bounded retry loop for concurrent scheme_code collisions
        v_scheme_attempts := 0;
        LOOP
            v_scheme_attempts := v_scheme_attempts + 1;
            IF v_scheme_attempts > 5 THEN
                RAISE EXCEPTION 'Failed to allocate unique scheme code after % attempts.', v_scheme_attempts - 1;
            END IF;

            LOOP
                v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));
                EXIT WHEN NOT EXISTS (SELECT 1 FROM public.schemes WHERE scheme_code = v_scheme_code);
            END LOOP;

            BEGIN
                INSERT INTO public.schemes (
                    customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution,
                    bonus_amount, maturity_amount, start_month, end_month, status, enrolled_by, notes, created_at, updated_at
                ) VALUES (
                    v_customer_id, v_scheme_code, 1, 1000.00, 12, 12000.00, 1000.00, 13000.00,
                    v_start_date, v_end_date, 'ACTIVE', v_admin_id, NULLIF(pg_catalog.btrim(p_notes), ''), v_now, v_now
                ) RETURNING id INTO v_scheme_id;

                EXIT; -- Insert succeeded, exit retry loop
            EXCEPTION WHEN unique_violation THEN
                GET STACKED DIAGNOSTICS v_err_constraint = CONSTRAINT_NAME;
                IF v_err_constraint = 'schemes_scheme_code_key' THEN
                    -- Specific scheme_code collision occurred under concurrent insert; retry with newly generated code
                    CONTINUE;
                ELSE
                    -- Re-raise any unrelated unique violation (e.g. uq_schemes_customer_open_slot)
                    RAISE;
                END IF;
            END;
        END LOOP;

        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
            v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO public.scheme_installments (
                scheme_id, customer_id, installment_number, calendar_month, due_date,
                installment_amount, status, paid_amount, paid_date, created_at, updated_at
            ) VALUES (
                v_scheme_id, v_customer_id, v_i, v_curr_month, v_due_date,
                1000.00, 'PENDING', 0.00, NULL, v_now, v_now
            );
        END LOOP;

        INSERT INTO public.scheme_bonuses (
            scheme_id, customer_id, bonus_amount, is_eligible, status, created_at, updated_at
        ) VALUES (
            v_scheme_id, v_customer_id, 1000.00, FALSE, 'PENDING', v_now, v_now
        );

        INSERT INTO public.notifications (
            customer_id, scheme_id, title, message, notification_type, created_at
        ) VALUES (
            v_customer_id, v_scheme_id, 'Welcome to Diwali Savings Scheme!',
            'You have successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || ', Slot #1). Deposit ₹1,000/month to earn your 100% 1-month bonus!',
            'GENERAL', v_now
        );

        PERFORM private.log_audit(
            v_admin_id, 'ENROLL_SCHEME', 'schemes', v_scheme_id, NULL,
            pg_catalog.jsonb_build_object(
                'scheme_id', v_scheme_id,
                'customer_id', v_customer_id,
                'scheme_code', v_scheme_code,
                'slot_number', 1,
                'monthly_installment_amount', 1000.00,
                'total_installments', 12
            ),
            pg_catalog.jsonb_build_object('source', 'admin_web_customer_registration')
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'full_name', pg_catalog.btrim(p_full_name),
        'phone_number', v_clean_phone,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'slot_number', CASE WHEN p_enroll_scheme IS TRUE THEN 1 ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) TO authenticated, service_role;
