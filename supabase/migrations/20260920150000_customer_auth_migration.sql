-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260920150000_customer_auth_migration.sql
-- Description: Move customer password authentication, initial reset state,
--              and lock protection to public.customer_auth table.
-- =============================================================================

-- 1. Backfill customer_auth records for existing customers if missing
DO $$
DECLARE
    r RECORD;
    v_phone TEXT;
    v_temp_password TEXT;
    v_hash TEXT;
BEGIN
    FOR r IN 
        SELECT c.id, c.phone_number
        FROM public.customers c
        LEFT JOIN public.customer_auth a ON c.id = a.customer_id
        WHERE a.customer_id IS NULL OR a.password_hash IS NULL
    LOOP
        v_phone := pg_catalog.regexp_replace(COALESCE(r.phone_number, ''), '\D', '', 'g');
        IF pg_catalog.length(v_phone) >= 4 THEN
            v_temp_password := pg_catalog.right(v_phone, 4);
            v_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));
            
            INSERT INTO public.customer_auth (
                customer_id,
                password_hash,
                password_status,
                failed_login_attempts,
                locked_until,
                created_at,
                updated_at
            ) VALUES (
                r.id,
                v_hash,
                'RESET_REQUIRED',
                0,
                NULL,
                pg_catalog.clock_timestamp(),
                pg_catalog.clock_timestamp()
            )
            ON CONFLICT (customer_id) DO UPDATE
            SET password_hash = COALESCE(public.customer_auth.password_hash, EXCLUDED.password_hash),
                password_status = COALESCE(public.customer_auth.password_status, 'RESET_REQUIRED'),
                updated_at = pg_catalog.clock_timestamp();
        END IF;
    END LOOP;
END $$;

-- 2. Update set_customer_initial_password to target public.customer_auth
CREATE OR REPLACE FUNCTION public.set_customer_initial_password(
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_phone TEXT;
    v_temp_password TEXT;
    v_hash TEXT;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT pg_catalog.regexp_replace(COALESCE(c.phone_number, ''), '\D', '', 'g')
      INTO v_phone
    FROM public.customers c
    WHERE c.id = p_customer_id;

    IF v_phone IS NULL OR pg_catalog.length(v_phone) != 10 THEN
        RAISE EXCEPTION 'Customer mobile number is invalid';
    END IF;

    v_temp_password := pg_catalog.right(v_phone, 4);
    v_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));

    INSERT INTO public.customer_auth (
        customer_id,
        password_hash,
        password_status,
        password_changed_at,
        failed_login_attempts,
        locked_until,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        v_hash,
        'RESET_REQUIRED',
        NULL,
        0,
        NULL,
        pg_catalog.clock_timestamp(),
        pg_catalog.clock_timestamp()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        password_status = 'RESET_REQUIRED',
        password_changed_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = pg_catalog.clock_timestamp();

    PERFORM private.log_audit(
        v_admin_id,
        'CUSTOMER_INITIAL_PASSWORD_SET',
        'customer_auth',
        p_customer_id,
        NULL,
        jsonb_build_object('password_status', 'RESET_REQUIRED'),
        jsonb_build_object('source', 'admin_initial_password')
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'customer_id', p_customer_id,
        'password_status', 'RESET_REQUIRED',
        'temporary_password', v_temp_password
    );
END;
$$;

-- Permissions for set_customer_initial_password
REVOKE ALL ON FUNCTION public.set_customer_initial_password(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_initial_password(UUID) TO authenticated;

-- Drop old customer_password_login signatures if exist
DROP FUNCTION IF EXISTS public.customer_password_login(VARCHAR, TEXT);

-- 3. Update customer_password_login to target public.customer_auth and return JSONB
CREATE OR REPLACE FUNCTION public.customer_password_login(
    p_phone_number VARCHAR,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer_id UUID;
    v_full_name VARCHAR;
    v_customer_code VARCHAR;
    v_password_hash TEXT;
    v_status VARCHAR;
    v_failed INTEGER;
    v_locked_until TIMESTAMPTZ;
    v_clean_phone VARCHAR(15);
    v_temp_password TEXT;
BEGIN
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');

    IF pg_catalog.length(v_clean_phone) != 10 OR COALESCE(p_password, '') = '' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    -- Look up customer details
    SELECT c.id, c.full_name, c.customer_code
      INTO v_customer_id, v_full_name, v_customer_code
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
      AND p.is_active = TRUE
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    -- Look up customer_auth record
    SELECT a.password_hash, a.password_status, a.failed_login_attempts, a.locked_until
      INTO v_password_hash, v_status, v_failed, v_locked_until
    FROM public.customer_auth a
    WHERE a.customer_id = v_customer_id;

    -- Auto-initialize customer_auth if missing or hash is null
    IF v_password_hash IS NULL THEN
        v_temp_password := pg_catalog.right(v_clean_phone, 4);
        v_password_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));
        v_status := COALESCE(v_status, 'RESET_REQUIRED');
        v_failed := COALESCE(v_failed, 0);

        INSERT INTO public.customer_auth (
            customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
        ) VALUES (
            v_customer_id, v_password_hash, v_status, 0, NULL, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()
        )
        ON CONFLICT (customer_id) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            password_status = EXCLUDED.password_status,
            updated_at = pg_catalog.clock_timestamp();
    END IF;

    -- Check if locked
    IF v_locked_until IS NOT NULL AND v_locked_until > pg_catalog.clock_timestamp() THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'ACCOUNT_LOCKED',
            'status', 'LOCKED',
            'message', 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.'
        );
    END IF;

    -- Check password match
    IF extensions.crypt(p_password, v_password_hash) <> v_password_hash THEN
        v_failed := COALESCE(v_failed, 0) + 1;
        IF v_failed >= 5 THEN
            UPDATE public.customer_auth ca
            SET failed_login_attempts = v_failed,
                locked_until = pg_catalog.clock_timestamp() + INTERVAL '15 minutes',
                password_status = 'LOCKED',
                updated_at = pg_catalog.clock_timestamp()
            WHERE ca.customer_id = v_customer_id;

            PERFORM private.log_audit(
                NULL, 'CUSTOMER_LOGIN_LOCKED', 'customer_auth', v_customer_id, NULL,
                jsonb_build_object('failed_login_attempts', v_failed, 'locked_minutes', 15), '{}'
            );

            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'ACCOUNT_LOCKED',
                'status', 'LOCKED',
                'message', 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.'
            );
        ELSE
            UPDATE public.customer_auth ca
            SET failed_login_attempts = v_failed,
                updated_at = pg_catalog.clock_timestamp()
            WHERE ca.customer_id = v_customer_id;

            PERFORM private.log_audit(
                NULL, 'CUSTOMER_LOGIN_FAILED', 'customer_auth', v_customer_id, NULL,
                jsonb_build_object('failed_login_attempts', v_failed), '{}'
            );

            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'INVALID_CREDENTIALS',
                'message', 'Invalid mobile number or password.'
            );
        END IF;
    END IF;

    -- Successful login: reset counters & clear lock
    UPDATE public.customer_auth ca
    SET failed_login_attempts = 0,
        locked_until = NULL,
        password_status = CASE WHEN ca.password_status = 'LOCKED' THEN 'ACTIVE' ELSE ca.password_status END,
        updated_at = pg_catalog.clock_timestamp()
    WHERE ca.customer_id = v_customer_id
    RETURNING ca.password_status INTO v_status;

    PERFORM private.log_audit(
        NULL, 'CUSTOMER_LOGIN_SUCCESS', 'customer_auth', v_customer_id, NULL,
        jsonb_build_object('password_status', v_status), '{}'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'full_name', v_full_name,
        'customer_code', v_customer_code,
        'password_status', v_status
    );
END;
$$;

-- Permissions for customer_password_login
REVOKE ALL ON FUNCTION public.customer_password_login(VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_password_login(VARCHAR, TEXT) TO anon, authenticated, service_role;

-- 4. Update customer_change_password to target public.customer_auth
CREATE OR REPLACE FUNCTION public.customer_change_password(
    p_customer_id UUID,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_hash TEXT;
    v_status VARCHAR;
    v_new_hash TEXT;
    v_phone TEXT;
    v_temp_password TEXT;
BEGIN
    SELECT a.password_hash, a.password_status
      INTO v_hash, v_status
    FROM public.customer_auth a
    WHERE a.customer_id = p_customer_id;

    IF NOT FOUND OR v_hash IS NULL THEN
        SELECT pg_catalog.regexp_replace(COALESCE(phone_number, ''), '\D', '', 'g')
          INTO v_phone
        FROM public.customers
        WHERE id = p_customer_id;

        IF v_phone IS NULL THEN
            RAISE EXCEPTION 'Customer not found';
        END IF;

        v_temp_password := pg_catalog.right(v_phone, 4);
        v_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));
        v_status := 'RESET_REQUIRED';

        INSERT INTO public.customer_auth (
            customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
        ) VALUES (
            p_customer_id, v_hash, 'RESET_REQUIRED', 0, NULL, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()
        )
        ON CONFLICT (customer_id) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, password_status = 'RESET_REQUIRED', updated_at = pg_catalog.clock_timestamp();
    END IF;

    IF p_new_password IS NULL
       OR pg_catalog.length(p_new_password) < 8
       OR p_new_password !~ '[A-Za-z]'
       OR p_new_password !~ '[0-9]' THEN
        RAISE EXCEPTION 'Password must contain at least 8 characters with a letter and a number';
    END IF;

    IF v_status = 'ACTIVE' THEN
        IF p_old_password IS NULL
           OR v_hash IS NULL
           OR extensions.crypt(p_old_password, v_hash) <> v_hash THEN
            RAISE EXCEPTION 'Current password is incorrect' USING ERRCODE = '28000';
        END IF;
    ELSIF v_status = 'RESET_REQUIRED' THEN
        IF p_old_password IS NOT NULL AND v_hash IS NOT NULL AND extensions.crypt(p_old_password, v_hash) = v_hash THEN
            NULL;
        ELSE
            SELECT pg_catalog.regexp_replace(COALESCE(phone_number, ''), '\D', '', 'g')
              INTO v_phone
            FROM public.customers WHERE id = p_customer_id;

            IF v_phone IS NOT NULL AND pg_catalog.right(v_phone, 4) = p_old_password THEN
                NULL;
            ELSE
                RAISE EXCEPTION 'Current password is incorrect' USING ERRCODE = '28000';
            END IF;
        END IF;
    ELSE
        RAISE EXCEPTION 'Password reset is not allowed in the current account state';
    END IF;

    v_new_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

    UPDATE public.customer_auth ca
    SET password_hash = v_new_hash,
        password_status = 'ACTIVE',
        password_changed_at = pg_catalog.clock_timestamp(),
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = pg_catalog.clock_timestamp()
    WHERE ca.customer_id = p_customer_id;

    PERFORM private.log_audit(
        NULL,
        'CUSTOMER_PASSWORD_CHANGED',
        'customer_auth',
        p_customer_id,
        NULL,
        jsonb_build_object('password_status', 'ACTIVE'),
        '{}'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'password_status', 'ACTIVE'
    );
END;
$$;

-- Permissions for customer_change_password
REVOKE ALL ON FUNCTION public.customer_change_password(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_change_password(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Update create_customer_with_scheme to initialize public.customer_auth
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
    v_customer_code := 'RJ-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(v_customer_id::text), 1, 6));

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
