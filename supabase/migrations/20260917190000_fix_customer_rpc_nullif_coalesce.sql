-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260917190000_fix_customer_rpc_nullif_coalesce.sql
-- Description: Replace pg_catalog.nullif and pg_catalog.coalesce with standard
--              SQL constructs NULLIF and COALESCE in create_customer_with_scheme.
-- =============================================================================

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
    
    -- Scheme Variables
    v_scheme_id UUID := NULL;
    v_scheme_code VARCHAR(30) := NULL;
    v_start_date DATE;
    v_end_date DATE;
    v_curr_month DATE;
    v_due_date DATE;
    v_i INTEGER;
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can create customers.';
    END IF;

    -- 2. Input Validation & Phone Sanitization
    v_clean_phone := pg_catalog.regexp_replace(p_phone_number, '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    IF pg_catalog.length(pg_catalog.btrim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    -- 3. Duplicate Handling (Case A, B, C)
    -- CASE C: Phone is assigned to an administrator profile
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone 
          AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'This mobile number is already registered to an administrator.';
    END IF;

    -- CASE A: Phone belongs to an existing customer record
    IF EXISTS (
        SELECT 1 FROM public.customers 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
    ) THEN
        RAISE EXCEPTION 'A customer with this mobile number already exists.';
    END IF;

    -- CASE B: Orphan Customer profile check (profile exists without a matching customer row)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone 
          AND role = 'CUSTOMER'
          AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id = public.profiles.id)
    ) THEN
        -- Safely delete the incomplete orphan profile so atomic registration can succeed
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

    -- 4. Generate Identifiers
    v_customer_id := pg_catalog.gen_random_uuid();
    v_customer_code := 'RJ-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(v_customer_id::text), 1, 6));

    -- 5. Insert Profile Record (role = 'CUSTOMER')
    INSERT INTO public.profiles (
        id,
        role,
        phone_number,
        full_name,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_customer_id,
        'CUSTOMER',
        v_clean_phone,
        pg_catalog.btrim(p_full_name),
        TRUE,
        v_now,
        v_now
    );

    -- 6. Insert Customer Record
    INSERT INTO public.customers (
        id,
        customer_code,
        phone_number,
        full_name,
        address,
        city,
        pincode,
        alternate_phone,
        nominee_name,
        nominee_relationship,
        notes,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_customer_id,
        v_customer_code,
        v_clean_phone,
        pg_catalog.btrim(p_full_name),
        NULLIF(pg_catalog.btrim(p_address), ''),
        COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        NULLIF(pg_catalog.btrim(p_pincode), ''),
        v_clean_alt_phone,
        NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        NULLIF(pg_catalog.btrim(p_nominee_relationship), ''),
        NULLIF(pg_catalog.btrim(p_notes), ''),
        v_admin_id,
        v_now,
        v_now
    );

    -- 7. Audit Log for Customer Creation
    PERFORM private.log_audit(
        v_admin_id,
        'CREATE',
        'customers',
        v_customer_id,
        NULL,
        jsonb_build_object(
            'customer_id', v_customer_id,
            'customer_code', v_customer_code,
            'phone_number', v_clean_phone,
            'full_name', pg_catalog.btrim(p_full_name)
        ),
        jsonb_build_object('source', 'admin_web_registration')
    );

    -- 8. Optional Atomic Scheme Enrollment
    IF p_enroll_scheme IS TRUE THEN
        v_start_date := pg_catalog.date_trunc('month', COALESCE(p_start_month, v_now::date))::DATE;
        v_end_date := (v_start_date + INTERVAL '11 months')::DATE;
        v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));

        -- 8.1 Insert Scheme Record
        INSERT INTO public.schemes (
            customer_id,
            scheme_code,
            monthly_installment_amount,
            total_installments,
            target_contribution,
            bonus_amount,
            maturity_amount,
            start_month,
            end_month,
            status,
            enrolled_by,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_customer_id,
            v_scheme_code,
            1000.00,
            12,
            12000.00,
            1000.00,
            13000.00,
            v_start_date,
            v_end_date,
            'ACTIVE',
            v_admin_id,
            NULLIF(pg_catalog.btrim(p_notes), ''),
            v_now,
            v_now
        ) RETURNING id INTO v_scheme_id;

        -- 8.2 Generate all 12 Installments (using calendar_month & due_date matching 001_initial_schema.sql)
        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
            v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO public.scheme_installments (
                scheme_id,
                customer_id,
                installment_number,
                calendar_month,
                due_date,
                installment_amount,
                status,
                paid_amount,
                paid_date,
                created_at,
                updated_at
            ) VALUES (
                v_scheme_id,
                v_customer_id,
                v_i,
                v_curr_month,
                v_due_date,
                1000.00,
                'PENDING',
                0.00,
                NULL,
                v_now,
                v_now
            );
        END LOOP;

        -- 8.3 Generate Pending 12th Month Completion Bonus (matching 001_initial_schema.sql)
        INSERT INTO public.scheme_bonuses (
            scheme_id,
            customer_id,
            bonus_amount,
            is_eligible,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_scheme_id,
            v_customer_id,
            1000.00,
            FALSE,
            'PENDING',
            v_now,
            v_now
        );

        -- 8.4 Scheme Enrollment Notification
        INSERT INTO public.notifications (
            customer_id,
            scheme_id,
            title,
            message,
            notification_type,
            created_at
        ) VALUES (
            v_customer_id,
            v_scheme_id,
            'Welcome to Diwali Savings Scheme!',
            'You have successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || '). Deposit ₹1,000/month to earn your 100% 1-month bonus!',
            'GENERAL',
            v_now
        );

        -- 8.5 Scheme Enrollment Audit Log
        PERFORM private.log_audit(
            v_admin_id,
            'ENROLL_SCHEME',
            'schemes',
            v_scheme_id,
            NULL,
            jsonb_build_object(
                'scheme_id', v_scheme_id,
                'scheme_code', v_scheme_code,
                'customer_id', v_customer_id,
                'monthly_installment_amount', 1000.00,
                'total_installments', 12
            ),
            jsonb_build_object('source', 'admin_web_customer_registration')
        );
    END IF;

    -- 9. Return Structured JSON Result
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

-- Security & Permissions Lockdown
REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE) TO authenticated;
