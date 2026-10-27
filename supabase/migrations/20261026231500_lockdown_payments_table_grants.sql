-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261026231500_lockdown_payments_table_grants.sql
-- Description: MED-01 Remediation - Production Defense-in-Depth Table Lockdown
--              1. Revoke all direct table privileges from PUBLIC and anon on public.payments.
--              2. Revoke direct INSERT, UPDATE, DELETE, TRUNCATE, and TRIGGER privileges
--                 from authenticated on public.payments.
--              3. Explicitly grant SELECT on public.payments to authenticated (strictly
--                 governed by RLS policy admin_select_payments for Admin Web).
--              4. Explicitly grant all privileges on public.payments to service_role.
--              5. Notify PostgREST schema cache to reload immediately.
-- =============================================================================

-- 1. Ensure Row Level Security remains active on public.payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all table-level privileges from PUBLIC and anon
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon;

-- 3. Revoke direct mutation and DDL-like privileges from authenticated
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.payments FROM authenticated;

-- 4. Preserve required SELECT access for authenticated admin users (protected by RLS)
GRANT SELECT ON TABLE public.payments TO authenticated;

-- 5. Guarantee full access for internal service_role
GRANT ALL ON TABLE public.payments TO service_role;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
