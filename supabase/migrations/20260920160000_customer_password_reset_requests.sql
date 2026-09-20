-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260920160000_customer_password_reset_requests.sql
-- Description: Create public.customer_password_reset_requests table,
--              anti-enumeration request RPC for customers, and admin RPCs
--              to retrieve, complete, and cancel customer reset requests.
-- =============================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.customer_password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    processed_at TIMESTAMPTZ NULL,
    processed_by UUID NULL REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    CONSTRAINT chk_reset_request_status CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reset_req_customer_id ON public.customer_password_reset_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reset_req_status_requested ON public.customer_password_reset_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_reset_req_pending ON public.customer_password_reset_requests(requested_at DESC) WHERE status = 'PENDING';

-- 2. RLS & Lockdown
ALTER TABLE public.customer_password_reset_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_password_reset_requests FROM PUBLIC, anon, authenticated;

-- 3. Customer Forgot Password Request RPC (Anti-Account Enumeration)
CREATE OR REPLACE FUNCTION public.request_customer_password_reset(
    p_mobile_number VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_customer_id UUID;
    v_pending_id UUID;
BEGIN
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_mobile_number, ''), '[^0-9]', '', 'g');

    -- Anti-account enumeration: process internally only if 10 digits
    IF pg_catalog.length(v_clean_phone) = 10 THEN
        -- Find customer ID for active profile
        SELECT c.id INTO v_customer_id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '[^0-9]', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
        LIMIT 1;

        IF v_customer_id IS NOT NULL THEN
            -- Check if a PENDING request already exists for this customer
            SELECT id INTO v_pending_id
            FROM public.customer_password_reset_requests
            WHERE customer_id = v_customer_id AND status = 'PENDING'
            LIMIT 1;

            IF v_pending_id IS NULL THEN
                -- Insert new PENDING request
                INSERT INTO public.customer_password_reset_requests (
                    customer_id,
                    status,
                    requested_at,
                    created_at,
                    updated_at
                ) VALUES (
                    v_customer_id,
                    'PENDING',
                    pg_catalog.clock_timestamp(),
                    pg_catalog.clock_timestamp(),
                    pg_catalog.clock_timestamp()
                );

                PERFORM private.log_audit(
                    NULL,
                    'CUSTOMER_PASSWORD_RESET_REQUESTED',
                    'customer_password_reset_requests',
                    v_customer_id,
                    NULL,
                    jsonb_build_object('status', 'PENDING'),
                    jsonb_build_object('source', 'customer_forgot_password_request')
                );
            ELSE
                -- Update updated_at timestamp on existing pending request
                UPDATE public.customer_password_reset_requests
                SET updated_at = pg_catalog.clock_timestamp()
                WHERE id = v_pending_id;
            END IF;
        END IF;
    END IF;

    -- Return identical generic success response to prevent account enumeration
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'If the mobile number is registered, a password reset request has been submitted.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.request_customer_password_reset(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_customer_password_reset(VARCHAR) TO anon, authenticated, service_role;

-- 4. Admin Retrieve Pending Requests RPC
CREATE OR REPLACE FUNCTION public.get_pending_customer_password_reset_requests()
RETURNS TABLE (
    request_id UUID,
    customer_id UUID,
    customer_name VARCHAR,
    customer_code VARCHAR,
    customer_mobile VARCHAR,
    requested_at TIMESTAMPTZ,
    status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can view password reset requests.';
    END IF;

    RETURN QUERY
    SELECT 
        r.id AS request_id,
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.customer_code AS customer_code,
        c.phone_number AS customer_mobile,
        r.requested_at,
        r.status
    FROM public.customer_password_reset_requests r
    JOIN public.customers c ON c.id = r.customer_id
    WHERE r.status = 'PENDING'
    ORDER BY r.requested_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pending_customer_password_reset_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_customer_password_reset_requests() TO authenticated;

-- 5. Admin Complete Reset Request RPC
CREATE OR REPLACE FUNCTION public.complete_customer_password_reset_request(
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_customer_id UUID;
    v_reset_result JSONB;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can complete password reset requests.';
    END IF;

    SELECT r.customer_id INTO v_customer_id
    FROM public.customer_password_reset_requests r
    WHERE r.id = p_request_id AND r.status = 'PENDING';

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Pending password reset request not found.';
    END IF;

    -- Delegate to existing admin reset RPC
    v_reset_result := public.admin_reset_customer_password(v_customer_id);

    -- Mark request COMPLETED
    UPDATE public.customer_password_reset_requests
    SET status = 'COMPLETED',
        processed_at = pg_catalog.clock_timestamp(),
        processed_by = v_admin_id,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_request_id;

    -- Audit log
    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_PASSWORD_RESET_REQUEST_COMPLETED',
        'customer_password_reset_requests',
        p_request_id,
        NULL,
        jsonb_build_object('status', 'COMPLETED', 'customer_id', v_customer_id),
        jsonb_build_object('source', 'admin_process_reset_request')
    );

    RETURN v_reset_result;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_customer_password_reset_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_customer_password_reset_request(UUID) TO authenticated;

-- 6. Admin Cancel Reset Request RPC
CREATE OR REPLACE FUNCTION public.cancel_customer_password_reset_request(
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_customer_id UUID;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can cancel password reset requests.';
    END IF;

    SELECT r.customer_id INTO v_customer_id
    FROM public.customer_password_reset_requests r
    WHERE r.id = p_request_id AND r.status = 'PENDING';

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Pending password reset request not found.';
    END IF;

    UPDATE public.customer_password_reset_requests
    SET status = 'CANCELLED',
        processed_at = pg_catalog.clock_timestamp(),
        processed_by = v_admin_id,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_request_id;

    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_PASSWORD_RESET_REQUEST_CANCELLED',
        'customer_password_reset_requests',
        p_request_id,
        NULL,
        jsonb_build_object('status', 'CANCELLED', 'customer_id', v_customer_id),
        jsonb_build_object('source', 'admin_cancel_reset_request')
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Password reset request cancelled successfully.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_customer_password_reset_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_customer_password_reset_request(UUID) TO authenticated;
