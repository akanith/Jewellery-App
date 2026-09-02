-- Migration 020: SECURITY DEFINER Administrative Data Retrieval Functions
-- Allows Admin Web to query complete live data from Supabase Cloud without RLS truncation

CREATE OR REPLACE FUNCTION public.get_all_customers_admin()
RETURNS SETOF public.customers AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.customers
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_customers_admin() TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_all_payments_admin()
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_scheme_id UUID,
  installment_id UUID,
  amount NUMERIC,
  payment_method TEXT,
  payment_reference TEXT,
  payment_date TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  customer_number TEXT,
  mobile_number TEXT,
  installment_number INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.customer_id,
    p.customer_scheme_id,
    p.installment_id,
    p.amount,
    p.payment_method::text,
    p.payment_reference,
    p.payment_date,
    p.status::text,
    p.created_at,
    c.full_name,
    c.customer_number,
    c.mobile_number,
    i.installment_number
  FROM public.payments p
  LEFT JOIN public.customers c ON c.id = p.customer_id
  LEFT JOIN public.installments i ON i.id = p.installment_id
  ORDER BY p.payment_date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_payments_admin() TO anon, authenticated, service_role;
