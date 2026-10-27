-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261023221000_lockdown_customer_auth_table_rls_and_grants.sql
-- Description: SEC-01 Remediation - Enable Row Level Security on public.customer_auth,
--              revoke all direct table privileges from PUBLIC, anon, and authenticated,
--              and grant required table access exclusively to service_role.
-- =============================================================================

-- 1. Enable Row Level Security on public.customer_auth
ALTER TABLE public.customer_auth ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all direct table privileges from PUBLIC, anon, and authenticated
REVOKE ALL ON TABLE public.customer_auth FROM PUBLIC, anon, authenticated;

-- 3. Grant required table permissions to backend service role only
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_auth TO service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
