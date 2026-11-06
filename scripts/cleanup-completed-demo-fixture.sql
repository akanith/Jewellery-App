-- ==============================================================================
-- RAMYAS JEWELLER — CLEANUP COMPLETED PASSBOOK DEMO FIXTURE
-- Run this script to completely remove the demo customer and related test records.
-- ==============================================================================

DO $$
DECLARE
  v_cust_id UUID := 'dd000000-0000-0000-0000-000000000012';
  v_scheme_id UUID := 'ee000000-0000-0000-0000-000000000012';
BEGIN
  -- 1. Delete payments
  DELETE FROM public.payments WHERE customer_id = v_cust_id;

  -- 2. Delete installments
  DELETE FROM public.scheme_installments WHERE customer_id = v_cust_id;

  -- 3. Delete schemes
  DELETE FROM public.schemes WHERE id = v_scheme_id OR customer_id = v_cust_id;

  -- 4. Delete sessions
  DELETE FROM public.customer_sessions WHERE customer_id = v_cust_id OR authenticated_root_id = v_cust_id;

  -- 5. Delete customer_auth
  DELETE FROM public.customer_auth WHERE customer_id = v_cust_id;

  -- 6. Delete customers
  DELETE FROM public.customers WHERE id = v_cust_id;

  -- 7. Delete profiles
  DELETE FROM public.profiles WHERE id = v_cust_id;

  RAISE NOTICE 'Demo customer % and scheme % cleaned up completely.', v_cust_id, v_scheme_id;
END;
$$;
