-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260922170000_delete_customer_rpc.sql
-- Description: Create SECURITY DEFINER RPC public.delete_customer_account(p_customer_id uuid)
--              allowing authenticated administrators to safely delete eligible customer accounts
--              with strict financial history checks and audit logging.
-- =============================================================================

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
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can delete customer accounts.';
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

    -- 3. Financial History & Activity Eligibility Check
    -- Check Payments
    IF EXISTS (
        SELECT 1 FROM public.payments WHERE customer_id = p_customer_id
    ) THEN
        RAISE EXCEPTION 'Customer cannot be deleted because financial records are associated with this account.';
    END IF;

    -- Check Paid Installments
    IF EXISTS (
        SELECT 1 FROM public.scheme_installments
        WHERE customer_id = p_customer_id
          AND (status = 'PAID' OR paid_amount > 0 OR paid_date IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Customer cannot be deleted because financial records are associated with this account.';
    END IF;

    -- Check Credited Bonus
    IF EXISTS (
        SELECT 1 FROM public.scheme_bonuses
        WHERE customer_id = p_customer_id
          AND (status = 'CREDITED' OR credited_date IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Customer cannot be deleted because financial records are associated with this account.';
    END IF;

    -- Check Redemptions
    IF EXISTS (
        SELECT 1 FROM public.redemptions WHERE customer_id = p_customer_id
    ) THEN
        RAISE EXCEPTION 'Customer cannot be deleted because financial records are associated with this account.';
    END IF;

    -- Check Emergency Refund or Completed/Matured Schemes
    IF EXISTS (
        SELECT 1 FROM public.schemes
        WHERE customer_id = p_customer_id
          AND (emergency_refund_amount IS NOT NULL OR emergency_refund_date IS NOT NULL OR status IN ('COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED', 'FULLY_REDEEMED', 'EMERGENCY_REFUNDED'))
    ) THEN
        RAISE EXCEPTION 'Customer cannot be deleted because financial records are associated with this account.';
    END IF;

    -- 4. Audit Log Entry BEFORE deletion
    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_DELETED',
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

    -- 5. Safe Order Deletion of Non-Financial Associated Records
    DELETE FROM public.customer_password_reset_requests WHERE customer_id = p_customer_id;
    DELETE FROM public.customer_sessions WHERE customer_id = p_customer_id;
    DELETE FROM public.customer_auth WHERE customer_id = p_customer_id;
    DELETE FROM public.notifications WHERE customer_id = p_customer_id;
    DELETE FROM public.scheme_bonuses WHERE customer_id = p_customer_id;
    DELETE FROM public.scheme_installments WHERE customer_id = p_customer_id;
    DELETE FROM public.schemes WHERE customer_id = p_customer_id;
    DELETE FROM public.customers WHERE id = p_customer_id;
    DELETE FROM public.profiles WHERE id = p_customer_id;

    RETURN pg_catalog.json_build_object(
        'success', true,
        'message', 'Customer account successfully deleted.',
        'customer_id', p_customer_id,
        'customer_code', v_customer.customer_code
    );
END;
$$;

-- Function Security Lockdown
REVOKE ALL ON FUNCTION public.delete_customer_account(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_account(UUID) TO authenticated;
