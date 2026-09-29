-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260929193500_reset_customer_code_sequence_rpc.sql
-- Description: Create SECURITY DEFINER RPC public.reset_customer_code_sequence()
--              allowing authenticated administrators to reset customer_code_seq
--              so that the next generated customer code will be RJ2026-001.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reset_customer_code_sequence()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can reset customer code sequence.';
    END IF;

    -- Reset sequence so nextval returns 1 ('RJ2026-001')
    PERFORM pg_catalog.setval('public.customer_code_seq', 1, false);

    RETURN pg_catalog.json_build_object(
        'success', true,
        'message', 'Customer code sequence successfully reset. Next customer code will be RJ2026-001.',
        'next_sequence_value', 1,
        'next_customer_code_pattern', 'RJ' || pg_catalog.to_char(pg_catalog.clock_timestamp(), 'YYYY') || '-001'
    );
END;
$$;

-- Function Security Lockdown
REVOKE ALL ON FUNCTION public.reset_customer_code_sequence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_customer_code_sequence() TO authenticated;
