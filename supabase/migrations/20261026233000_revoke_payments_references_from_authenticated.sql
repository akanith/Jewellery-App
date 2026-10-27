-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261026233000_revoke_payments_references_from_authenticated.sql
-- Description: Follow-up to MED-01 - Revoke REFERENCES privilege on public.payments
--              from the authenticated role, ensuring authenticated access is
--              strictly SELECT only.
-- =============================================================================

-- 1. Revoke REFERENCES privilege from authenticated role on public.payments
REVOKE REFERENCES ON TABLE public.payments FROM authenticated;

-- 2. Explicitly reaffirm that authenticated possesses SELECT only
GRANT SELECT ON TABLE public.payments TO authenticated;

-- 3. Reaffirm full access for backend service_role
GRANT ALL ON TABLE public.payments TO service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
