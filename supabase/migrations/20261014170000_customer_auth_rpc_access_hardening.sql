-- =============================================================================
-- RAMYAS JEWELLER - Customer Authentication RPC Access Hardening
-- Version: 20261014170000
-- Purpose:
--   1. Make customer authentication/password operations callable only by the
--      server-side Customer BFF service role, not the public PostgREST roles.
--   2. Pin the updated-at trigger function search path.
--
-- Customer mobile and login/reset flows already route through the Customer BFF.
-- The BFF derives the customer identity from its verified server-side session
-- and invokes these functions using the service-role client.
-- =============================================================================

-- Internal customer-authentication RPCs must not be directly callable by
-- anon/authenticated clients. Keep explicit service_role access for the BFF.
REVOKE ALL ON FUNCTION public.customer_password_login(VARCHAR, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_password_login(VARCHAR, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.customer_change_password(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_change_password(UUID, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.request_customer_password_reset(VARCHAR)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_customer_password_reset(VARCHAR)
  TO service_role;

-- This trigger function needs no caller-supplied schema lookup. Pin its
-- search_path and qualify the clock function explicitly.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.clock_timestamp();
    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
