-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261002095500_fix_update_customer_profile_rpc_btrim.sql
-- Description: Replace invalid pg_catalog.trim calls with PostgreSQL-safe
--              pg_catalog.btrim in update_customer_profile RPC.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_customer_profile(
    p_customer_id UUID,
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15),
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL,
    p_pincode VARCHAR(10) DEFAULT NULL,
    p_nominee_name VARCHAR(100) DEFAULT NULL,
    p_nominee_relationship VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_clean_phone VARCHAR(15);
    v_clean_name VARCHAR(100);
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Authorization check
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- 2. Input validation
    v_clean_name := pg_catalog.btrim(p_full_name::text);
    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RAISE EXCEPTION 'Full name is required.';
    END IF;

    v_clean_phone := pg_catalog.regexp_replace(p_phone_number, '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) <> 10 THEN
        RAISE EXCEPTION 'Please enter a valid 10-digit mobile number.';
    END IF;

    -- 3. Verify target customer exists
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
        RAISE EXCEPTION 'Customer profile not found.';
    END IF;

    -- 4. Check for duplicate mobile number across other customers/profiles
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE phone_number = v_clean_phone AND id <> p_customer_id
    ) OR EXISTS (
        SELECT 1 FROM public.customers
        WHERE phone_number = v_clean_phone AND id <> p_customer_id
    ) THEN
        RAISE EXCEPTION 'A customer with this mobile number already exists.';
    END IF;

    -- 5. Atomic Update on profiles
    UPDATE public.profiles
    SET full_name = v_clean_name,
        phone_number = v_clean_phone,
        updated_at = v_now
    WHERE id = p_customer_id;

    -- 6. Atomic Update on customers
    UPDATE public.customers
    SET full_name = v_clean_name,
        phone_number = v_clean_phone,
        address = pg_catalog.nullif(pg_catalog.btrim(p_address), ''),
        city = pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_city::text), ''), 'Coimbatore'),
        pincode = pg_catalog.nullif(pg_catalog.btrim(p_pincode::text), ''),
        nominee_name = pg_catalog.nullif(pg_catalog.btrim(p_nominee_name::text), ''),
        nominee_relationship = pg_catalog.nullif(pg_catalog.btrim(p_nominee_relationship::text), ''),
        notes = pg_catalog.nullif(pg_catalog.btrim(p_notes), ''),
        updated_at = v_now
    WHERE id = p_customer_id;

    -- 7. Audit log entry
    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_UPDATED',
        'customers',
        p_customer_id,
        NULL,
        pg_catalog.json_build_object(
            'full_name', v_clean_name,
            'phone_number', v_clean_phone,
            'city', p_city
        )::jsonb,
        pg_catalog.json_build_object('admin_id', v_admin_id)::jsonb
    );

    RETURN pg_catalog.json_build_object(
        'success', true,
        'customer_id', p_customer_id,
        'full_name', v_clean_name,
        'phone_number', v_clean_phone
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;
