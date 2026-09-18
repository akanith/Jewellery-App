REVOKE EXECUTE ON FUNCTION public.create_customer_with_scheme(character varying, character varying, text, character varying, character varying, character varying, character varying, character varying, text, boolean, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enroll_customer_scheme(uuid, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_installment_payment(uuid, integer, character varying, character varying, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_scheme_redemption(uuid, numeric, numeric, character varying, jsonb, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_emergency_refund(uuid, numeric, text) FROM anon, public;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

NOTIFY pgrst, 'reload schema';
