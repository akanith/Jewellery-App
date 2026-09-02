-- Migration 022: Fix Admin Web Data Access, Notifications Table & Customer Scheme Lookup RPC
-- Ensures public.notifications table exists and provides single-query customer scheme RPC

-- 1. Ensure public.notifications table exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PAYMENT', 'SCHEME', 'REMINDER', 'REDEMPTION', 'ANNOUNCEMENT')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read relevant notifications" ON public.notifications;
CREATE POLICY "Users can read relevant notifications" ON public.notifications
FOR SELECT USING (true);

-- 2. Single-query Customer Scheme & Installment Details RPC for Admin Web
CREATE OR REPLACE FUNCTION public.get_customer_scheme_details_admin(p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_scheme RECORD;
  v_installments JSONB;
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifier is required');
  END IF;

  -- Match by UUID, customer_number, or mobile_number
  SELECT * INTO v_customer
  FROM public.customers
  WHERE id::text = p_identifier
     OR customer_number = p_identifier
     OR mobile_number = p_identifier
  LIMIT 1;

  IF v_customer.id IS NULL THEN
    -- Try matching scheme ID or scheme account number
    SELECT c.* INTO v_customer
    FROM public.customer_schemes cs
    JOIN public.customers c ON c.id = cs.customer_id
    WHERE cs.id::text = p_identifier
       OR cs.scheme_account_number = p_identifier
    LIMIT 1;
  END IF;

  IF v_customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Get active/latest customer scheme
  SELECT * INTO v_scheme
  FROM public.customer_schemes
  WHERE customer_id = v_customer.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_scheme.id IS NOT NULL THEN
    SELECT jsonb_agg(row_to_json(i) ORDER BY i.installment_number ASC) INTO v_installments
    FROM public.installments i
    WHERE i.customer_scheme_id = v_scheme.id;
  ELSE
    v_installments := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer', row_to_json(v_customer),
    'scheme', CASE WHEN v_scheme.id IS NOT NULL THEN row_to_json(v_scheme) ELSE NULL END,
    'installments', COALESCE(v_installments, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_customer_scheme_details_admin(TEXT) TO anon, authenticated, service_role;
