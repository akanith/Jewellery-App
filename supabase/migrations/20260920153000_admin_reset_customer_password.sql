-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260920153000_admin_reset_customer_password.sql
-- Description: Create SECURITY DEFINER RPC public.admin_reset_customer_password(p_customer_id uuid)
--              allowing authenticated administrators to reset a customer's password to
--              their temporary password (last 4 digits of phone) with status RESET_REQUIRED.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_customer_password(
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_phone TEXT;
    v_temp_password TEXT;
    v_hash TEXT;
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can reset customer passwords.';
    END IF;

    -- 2. Customer Lookup & Phone Normalization
    SELECT pg_catalog.regexp_replace(COALESCE(c.phone_number, ''), '[^0-9]', '', 'g')
      INTO v_phone
    FROM public.customers c
    WHERE c.id = p_customer_id;

    IF v_phone IS NULL OR pg_catalog.length(v_phone) != 10 THEN
        RAISE EXCEPTION 'Customer mobile number is invalid or customer not found.';
    END IF;

    -- 3. Generate Temporary Password & Bcrypt Hash
    v_temp_password := pg_catalog.right(v_phone, 4);
    v_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 12));

    -- 4. Upsert public.customer_auth
    INSERT INTO public.customer_auth (
        customer_id,
        password_hash,
        password_status,
        password_changed_at,
        failed_login_attempts,
        locked_until,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        v_hash,
        'RESET_REQUIRED',
        NULL,
        0,
        NULL,
        pg_catalog.clock_timestamp(),
        pg_catalog.clock_timestamp()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        password_status = 'RESET_REQUIRED',
        password_changed_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = pg_catalog.clock_timestamp();

    -- 5. Create Audit Log Entry
    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_PASSWORD_RESET',
        'customer_auth',
        p_customer_id,
        NULL,
        jsonb_build_object('password_status', 'RESET_REQUIRED'),
        jsonb_build_object('source', 'admin_customer_reset')
    );

    -- 6. Return Result JSON
    RETURN jsonb_build_object(
        'success', TRUE,
        'customer_id', p_customer_id,
        'password_status', 'RESET_REQUIRED',
        'temporary_password', v_temp_password
    );
END;
$$;

-- Security & Permissions Lockdown
REVOKE ALL ON FUNCTION public.admin_reset_customer_password(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_customer_password(UUID) TO authenticated;
