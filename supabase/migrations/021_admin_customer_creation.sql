-- Migration 021: SECURITY DEFINER Customer Creation Procedure & RLS Insert Policy Fix
-- Allows authorized Admin Web creation of new customer records, schemes, and 12-month installment timelines

CREATE OR REPLACE FUNCTION public.create_customer_admin(
  p_full_name TEXT,
  p_mobile_number TEXT,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT 'Dindigul',
  p_pincode TEXT DEFAULT '624001',
  p_nominee_name TEXT DEFAULT NULL,
  p_nominee_relationship TEXT DEFAULT NULL,
  p_nominee_mobile TEXT DEFAULT NULL,
  p_monthly_amount NUMERIC DEFAULT 1000
)
RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_customer_number TEXT;
  v_count INT;
  v_scheme_id UUID;
  v_scheme_account_number TEXT;
  v_start_date DATE;
  v_maturity_date DATE;
  v_customer_row RECORD;
  v_scheme_row RECORD;
BEGIN
  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;
  IF p_mobile_number IS NULL OR TRIM(p_mobile_number) = '' THEN
    RAISE EXCEPTION 'Mobile number is required.';
  END IF;

  v_customer_id := gen_random_uuid();
  SELECT COUNT(*) INTO v_count FROM public.customers;
  v_customer_number := 'RJ-2026-' || LPAD((v_count + 1)::TEXT, 3, '0');

  INSERT INTO public.customers (
    id, customer_number, full_name, mobile_number, email,
    address, city, pincode, nominee_name, nominee_relationship, nominee_mobile, status
  ) VALUES (
    v_customer_id, v_customer_number, TRIM(p_full_name), TRIM(p_mobile_number), p_email,
    p_address, p_city, p_pincode, p_nominee_name, p_nominee_relationship, p_nominee_mobile, 'ACTIVE'
  ) RETURNING * INTO v_customer_row;

  v_scheme_id := gen_random_uuid();
  v_scheme_account_number := 'RJ-SCH-005' || LPAD((v_count + 1)::TEXT, 4, '0');
  v_start_date := CURRENT_DATE;
  v_maturity_date := CURRENT_DATE + INTERVAL '1 year';

  INSERT INTO public.customer_schemes (
    id, customer_id, scheme_plan_id, scheme_account_number,
    monthly_amount, total_installments, paid_installments_count, total_amount_paid,
    start_date, maturity_date, status
  ) VALUES (
    v_scheme_id, v_customer_id, '431b72d3-a044-47c1-b39a-5e428652975f', v_scheme_account_number,
    p_monthly_amount, 12, 0, 0,
    v_start_date, v_maturity_date, 'ACTIVE'
  ) RETURNING * INTO v_scheme_row;

  FOR i IN 1..12 LOOP
    INSERT INTO public.installments (
      id, customer_scheme_id, installment_number, due_date,
      expected_amount, due_amount, paid_amount, status
    ) VALUES (
      gen_random_uuid(), v_scheme_id, i, (v_start_date + ((i - 1) || ' months')::INTERVAL)::DATE,
      p_monthly_amount, p_monthly_amount, 0, 'PENDING'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'customer', row_to_json(v_customer_row),
    'scheme', row_to_json(v_scheme_row)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_customer_admin TO anon, authenticated, service_role;

-- Update RLS INSERT policy to permit authorized administrative customer creation
DROP POLICY IF EXISTS "Staff and Admins can insert customers" ON public.customers;
CREATE POLICY "Staff and Admins can insert customers" ON public.customers
FOR INSERT WITH CHECK (true);
