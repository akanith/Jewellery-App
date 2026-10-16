-- =============================================================================
-- RAMYAS JEWELLER - Restrict Legacy Maintenance RPCs
-- Version: 20261014170000
-- Purpose: These maintenance-only SECURITY DEFINER procedures are not called by
-- the current Admin Web app or Playwright suite. Keep their owner/service-role
-- privileges intact, but remove direct authenticated-client invocation.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_e2e_test_data(BOOLEAN)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_pre_production_audit_logs(TIMESTAMPTZ, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_six_test_customers(BOOLEAN)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_customer_code_sequence()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.set_customer_initial_password(UUID)
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
