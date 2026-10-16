-- =============================================================================
-- Supabase advisor remediation: FK indexes and redundant index cleanup
-- Production apply is gated on a fresh backup + isolated restore validation.
-- This migration has been exercised only through CI/local migrations until approved.
-- =============================================================================

BEGIN;

-- Fail rather than accidentally remove the only supporting index if schema drifted.
DO $$
DECLARE
  required_index TEXT;
BEGIN
  FOREACH required_index IN ARRAY ARRAY[
    'idx_payments_customer_rls',
    'idx_redemption_items_parent',
    'idx_redemptions_customer_rls',
    'idx_bonuses_customer_rls',
    'idx_installments_customer_rls',
    'idx_schemes_customer_rls',
    'uq_customers_phone_number',
    'schemes_scheme_code_key',
    'payments_receipt_number_key'
  ]
  LOOP
    IF pg_catalog.to_regclass('public.' || required_index) IS NULL THEN
      RAISE EXCEPTION 'Advisor remediation aborted: required retained index % is missing', required_index;
    END IF;
  END LOOP;
END;
$$;

-- Add indexes for foreign-key columns which currently lack a covering index.
CREATE INDEX IF NOT EXISTS idx_customer_password_reset_requests_processed_by
  ON public.customer_password_reset_requests (processed_by);

CREATE INDEX IF NOT EXISTS idx_customers_created_by
  ON public.customers (created_by);

CREATE INDEX IF NOT EXISTS idx_notifications_scheme_id
  ON public.notifications (scheme_id);

CREATE INDEX IF NOT EXISTS idx_payments_recorded_by
  ON public.payments (recorded_by);

CREATE INDEX IF NOT EXISTS idx_redemptions_recorded_by
  ON public.redemptions (recorded_by);

CREATE INDEX IF NOT EXISTS idx_scheme_bonuses_credited_by
  ON public.scheme_bonuses (credited_by);

CREATE INDEX IF NOT EXISTS idx_schemes_emergency_refund_by
  ON public.schemes (emergency_refund_by);

CREATE INDEX IF NOT EXISTS idx_schemes_enrolled_by
  ON public.schemes (enrolled_by);

-- Remove exact duplicates, retaining the versions observed with higher usage.
DROP INDEX IF EXISTS public.idx_payments_customer;
DROP INDEX IF EXISTS public.idx_redemption_items_redemption;
DROP INDEX IF EXISTS public.idx_redemptions_customer;
DROP INDEX IF EXISTS public.idx_scheme_bonuses_customer;
DROP INDEX IF EXISTS public.idx_scheme_installments_customer;
DROP INDEX IF EXISTS public.idx_schemes_customer;

-- Remove non-unique indexes whose exact key is already provided by a unique index.
-- The uniqueness constraints remain intact.
DROP INDEX IF EXISTS public.idx_customers_phone;
DROP INDEX IF EXISTS public.idx_schemes_code;
DROP INDEX IF EXISTS public.idx_payments_receipt;

COMMIT;
