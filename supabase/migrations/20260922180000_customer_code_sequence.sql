-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260922180000_customer_code_sequence.sql
-- Description: Create sequence public.customer_code_seq for sequential customer codes
--              in the format RJ2026-001, RJ2026-002, etc.
-- =============================================================================

-- 1. Create Customer Code Sequence
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq START WITH 1 INCREMENT BY 1;
GRANT USAGE, SELECT ON SEQUENCE public.customer_code_seq TO authenticated;

-- 2. Update create_customer_with_scheme RPC to use sequential customer codes
CREATE OR REPLACE FUNCTION public.create_customer_with_scheme(
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15),
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(50) DEFAULT 'Dindigul',
    p_pincode VARCHAR(10) DEFAULT NULL,
    p_alternate_phone VARCHAR(15) DEFAULT NULL,
    p_nominee_name VARCHAR(100) DEFAULT NULL,
    p_nominee_relationship VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_enroll_scheme BOOLEAN DEFAULT TRUE,
    p_start_month DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_clean_phone VARCHAR(15);
    v_clean_alt_phone VARCHAR(15);
    v_customer_id UUID;
    v_customer_code VARCHAR(30);
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_year VARCHAR(4) := pg_catalog.to_char(v_now, 'YYYY');
    v_init_hash TEXT;
    
    -- Scheme Variables
    v_scheme_id UUID := NULL;
    v_scheme_code VARCHAR(30) := NULL;
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can create customers.';
    END IF;

    v_clean_phone := pg_catalog.regexp_replace(p_phone_number, '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    IF pg_catalog.length(pg_catalog.btrim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone 
          AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'This mobile number is already registered to an administrator.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.customers 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
    ) THEN
        RAISE EXCEPTION 'A customer with this mobile number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone 
          AND role = 'CUSTOMER'
          AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id = public.profiles.id)
    ) THEN
        DELETE FROM public.profiles 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone 
          AND role = 'CUSTOMER' 
          AND NOT EXISTS (
              SELECT 1 FROM public.customers WHERE id = public.profiles.id
          );
    END IF;

    IF p_alternate_phone IS NOT NULL THEN
        v_clean_alt_phone := NULLIF(pg_catalog.regexp_replace(p_alternate_phone, '\D', '', 'g'), '');
    ELSE
        v_clean_alt_phone := NULL;
    END IF;

    v_customer_id := pg_catalog.gen_random_uuid();
    v_customer_code := 'RJ' || v_year || '-' || lpad(nextval('public.customer_code_seq')::text, 3, '0');

    INSERT INTO public.profiles (
        id, role, phone_number, full_name, is_active, created_at, updated_at
    ) VALUES (
        v_customer_id, 'CUSTOMER', v_clean_phone, pg_catalog.btrim(p_full_name), TRUE, v_now, v_now
    );

    INSERT INTO public.customers (
        id, customer_code, phone_number, full_name, address, city, pincode,
        alternate_phone, nominee_name, nominee_relationship, notes, created_by, created_at, updated_at
    ) VALUES (
        v_customer_id, v_customer_code, v_clean_phone, pg_catalog.btrim(p_full_name),
        NULLIF(pg_catalog.btrim(p_address), ''), COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        NULLIF(pg_catalog.btrim(p_pincode), ''), v_clean_alt_phone, NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        NULLIF(pg_catalog.btrim(p_nominee_relationship), ''), NULLIF(pg_catalog.btrim(p_notes), ''), v_admin_id, v_now, v_now
    );

    -- Initialize customer_auth entry
    v_init_hash := extensions.crypt(pg_catalog.right(v_clean_phone, 4), extensions.gen_salt('bf', 10));
    INSERT INTO public.customer_auth (
        customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
    ) VALUES (
        v_customer_id, v_init_hash, 'RESET_REQUIRED', 0, NULL, v_now, v_now
    ) ON CONFLICT (customer_id) DO NOTHING;

    PERFORM private.log_audit(
        v_admin_id, 'CREATE', 'customers', v_customer_id, NULL,
        jsonb_build_object('customer_id', v_customer_id, 'customer_code', v_customer_code, 'phone_number', v_clean_phone, 'full_name', pg_catalog.btrim(p_full_name)),
        jsonb_build_object('source', 'admin_web_registration')
    );

    IF p_enroll_scheme IS TRUE THEN
        v_start_date := pg_catalog.date_trunc('month', COALESCE(p_start_month, v_now::date))::DATE;
        v_end_date := (v_start_date + INTERVAL '11 months')::DATE;
        v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

        INSERT INTO public.schemes (
            customer_id, scheme_code, monthly_installment_amount, total_installments, target_contribution,
            bonus_amount, maturity_amount, start_month, end_month, status, enrolled_by, notes, created_at, updated_at
        ) VALUES (
            v_customer_id, v_scheme_code, 1000.00, 12, 12000.00, 1000.00, 13000.00, v_start_date, v_end_date, 'ACTIVE', v_admin_id, NULLIF(pg_catalog.btrim(p_notes), ''), v_now, v_now
        ) RETURNING id INTO v_scheme_id;

        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
            v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO public.scheme_installments (
                scheme_id, customer_id, installment_number, calendar_month, due_date, installment_amount, status, paid_amount, paid_date, created_at, updated_at
            ) VALUES (
                v_scheme_id, v_customer_id, v_i, v_curr_month, v_due_date, 1000.00, 'PENDING', 0.00, NULL, v_now, v_now
            );
        END LOOP;

        INSERT INTO public.scheme_bonuses (
            scheme_id, customer_id, bonus_amount, is_eligible, status, created_at, updated_at
        ) VALUES (
            v_scheme_id, v_customer_id, 1000.00, FALSE, 'PENDING', v_now, v_now
        );

        INSERT INTO public.notifications (
            customer_id, scheme_id, title, message, notification_type, created_at
        ) VALUES (
            v_customer_id, v_scheme_id, 'Welcome to Diwali Savings Scheme!', 'You have successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || '). Deposit ₹1,000/month to earn your 100% 1-month bonus!', 'GENERAL', v_now
        );

        PERFORM private.log_audit(
            v_admin_id, 'ENROLL_SCHEME', 'schemes', v_scheme_id, NULL,
            jsonb_build_object('scheme_id', v_scheme_id, 'scheme_code', v_scheme_code, 'customer_id', v_customer_id, 'monthly_installment_amount', 1000.00, 'total_installments', 12),
            jsonb_build_object('source', 'admin_web_customer_registration')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'full_name', pg_catalog.btrim(p_full_name),
        'phone_number', v_clean_phone,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code
    );
END;
$$;

-- Permissions for create_customer_with_scheme
REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) TO authenticated;
