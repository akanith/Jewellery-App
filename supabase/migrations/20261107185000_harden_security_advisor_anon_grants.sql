-- ==============================================================================
-- MIGRATION: 20261107185000_harden_security_advisor_anon_grants.sql
-- Description: Resolve Supabase Security Advisor warnings by revoking anonymous
--              execute permissions on SECURITY DEFINER functions and enforcing
--              explicit table privilege denial on schema public for role 'anon'.
-- ==============================================================================

\set ON_ERROR_STOP on

SET ROLE postgres;

BEGIN;

-- 1. Revoke public/anon execute privilege on SECURITY DEFINER helper function
REVOKE ALL ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) TO service_role;

-- 2. Defense-in-depth: Revoke all table and sequence privileges from anon on schema public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Ensure future tables/sequences created by postgres or supabase_admin don't grant to anon by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

COMMIT;
