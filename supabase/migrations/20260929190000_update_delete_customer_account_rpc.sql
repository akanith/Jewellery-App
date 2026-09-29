-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260929190000_update_delete_customer_account_rpc.sql
-- Description: Update SECURITY DEFINER RPC public.delete_customer_account(p_customer_id uuid)
--              allowing authenticated administrators to permanently hard-delete a customer account
--              and all customer-owned dependent records (including financial history) in a single,
--              FK-safe transaction with audit logging.
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
        DELETE FROM public.emergency_refunds WHERE customer_id = p_customer_id;
    END IF;

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

-- Function Security Lockdown
REVOKE ALL ON FUNCTION public.delete_customer_account(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_account(UUID) TO authenticated;
