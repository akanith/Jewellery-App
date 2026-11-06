-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Migration: 20261029170000_harden_create_customer_family_link_authorization.sql
-- Description:
--   1. Separate customer registration from family linking.
--      create_customer_with_scheme strictly creates independent customer profiles
--      and initial schemes. It NEVER creates family authorization records.
--   2. Establish family authorization exclusively through the dedicated,
--      admin-authorized link_customer_family_profiles procedure.
--   3. Require explicit showroom in-person consent confirmation (p_consent_confirmed).
--      p_consent_confirmed BOOLEAN is mandatory and has no default value.
--      The function strictly rejects NULL or FALSE.
--   4. Strictly verify that both profiles exist, are active, belong to customers,
--      and share the exact same verified normalized 10-digit mobile number.
--   5. Record verification metadata (SHOWROOM_VERIFIED), acting admin, timestamp,
--      and outcome in both customer_profile_authorizations and the audit log.
--   6. Preserve independent credentials, failed login counts, and scoped lockouts.
--   7. Explicit grants: execute restricted to authenticated admin and service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPGRADE create_customer_with_scheme (STRICT PROFILE REGISTRATION ONLY)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE);
DROP FUNCTION IF EXISTS public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID);

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
    p_start_month DATE DEFAULT NULL,
    p_link_family_customer_id UUID DEFAULT NULL
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
    v_scheme_attempts INTEGER := 0;
    v_err_constraint TEXT;
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can create customers.';
    END IF;

    -- 2. Validate Mobile Number
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    -- 3. Validate Full Name
    IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_full_name, ''))) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    -- 4. Check if phone is registered to an administrator
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE pg_catalog.regexp_replace(phone_number, '\D', '', 'g') = v_clean_phone
          AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'This mobile number is already registered to an administrator.';
    END IF;

    IF p_alternate_phone IS NOT NULL THEN
        v_clean_alt_phone := NULLIF(pg_catalog.regexp_replace(p_alternate_phone, '\D', '', 'g'), '');
    ELSE
        v_clean_alt_phone := NULL;
    END IF;

    -- 5. Concurrency-Safe Sequential Customer Code Generation
    v_customer_id := pg_catalog.gen_random_uuid();
    LOOP
        v_customer_code := 'RJ' || v_year || '-' || lpad(nextval('public.customer_code_seq')::text, 3, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customers WHERE customer_code = v_customer_code);
    END LOOP;

    -- 6. Insert Profile
    INSERT INTO public.profiles (
        id, role, phone_number, full_name, is_active, created_at, updated_at
    ) VALUES (
        v_customer_id, 'CUSTOMER', v_clean_phone, pg_catalog.btrim(p_full_name), TRUE, v_now, v_now
    );

    -- 7. Insert Customer
    INSERT INTO public.customers (
        id, customer_code, phone_number, full_name, address, city, pincode,
        alternate_phone, nominee_name, nominee_relationship, notes, created_by, created_at, updated_at
    ) VALUES (
        v_customer_id, v_customer_code, v_clean_phone, pg_catalog.btrim(p_full_name),
        NULLIF(pg_catalog.btrim(p_address), ''), COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        NULLIF(pg_catalog.btrim(p_pincode), ''), v_clean_alt_phone, NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        NULLIF(pg_catalog.btrim(p_nominee_relationship), ''), NULLIF(pg_catalog.btrim(p_notes), ''), v_admin_id, v_now, v_now
    );

    -- 8. Independent Customer Auth Credentials
    v_init_hash := extensions.crypt(pg_catalog.right(v_clean_phone, 4), extensions.gen_salt('bf', 10));
    INSERT INTO public.customer_auth (
        customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
    ) VALUES (
        v_customer_id, v_init_hash, 'RESET_REQUIRED', 0, NULL, v_now, v_now
    ) ON CONFLICT (customer_id) DO NOTHING;

    -- 9. Customer Creation Audit Log
    PERFORM private.log_audit(
        v_admin_id, 'CREATE', 'customers', v_customer_id, NULL,
        pg_catalog.jsonb_build_object(
            'customer_id', v_customer_id,
            'customer_code', v_customer_code,
            'phone_number', v_clean_phone,
            'full_name', p_full_name
        ), '{}'
    );

    -- 10. Optional Scheme Enrollment (Using Canonical Collision-Resistant Scheme Code & Production Columns)
    IF p_enroll_scheme THEN
        v_start_date := pg_catalog.date_trunc('month', COALESCE(p_start_month, v_now::date))::DATE;
        v_end_date := (v_start_date + INTERVAL '11 months')::DATE;

        -- Bounded retry loop for concurrent scheme_code collisions
        v_scheme_attempts := 0;
        LOOP
            v_scheme_attempts := v_scheme_attempts + 1;
            IF v_scheme_attempts > 5 THEN
                RAISE EXCEPTION 'Failed to allocate unique scheme code after % attempts.', v_scheme_attempts - 1;
            END IF;

            LOOP
                v_scheme_code := 'RJ-SCH-' || v_year || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6));
                EXIT WHEN NOT EXISTS (SELECT 1 FROM public.schemes WHERE scheme_code = v_scheme_code);
            END LOOP;

            BEGIN
                INSERT INTO public.schemes (
                    customer_id, scheme_code, slot_number, monthly_installment_amount, total_installments, target_contribution,
                    bonus_amount, maturity_amount, start_month, end_month, status, enrolled_by, notes, created_at, updated_at
                ) VALUES (
                    v_customer_id, v_scheme_code, 1, 1000.00, 12, 12000.00, 1000.00, 13000.00,
                    v_start_date, v_end_date, 'ACTIVE', v_admin_id, NULLIF(pg_catalog.btrim(p_notes), ''), v_now, v_now
                ) RETURNING id INTO v_scheme_id;

                EXIT; -- Insert succeeded, exit retry loop
            EXCEPTION WHEN unique_violation THEN
                GET STACKED DIAGNOSTICS v_err_constraint = CONSTRAINT_NAME;
                IF v_err_constraint = 'schemes_scheme_code_key' THEN
                    CONTINUE;
                ELSE
                    RAISE;
                END IF;
            END;
        END LOOP;

        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::INTERVAL)::DATE;
            v_due_date := (pg_catalog.date_trunc('month', v_curr_month) + INTERVAL '1 month - 1 day')::DATE;

            INSERT INTO public.scheme_installments (
                scheme_id, customer_id, installment_number, calendar_month, due_date,
                installment_amount, status, paid_amount, paid_date, created_at, updated_at
            ) VALUES (
                v_scheme_id, v_customer_id, v_i, v_curr_month, v_due_date,
                1000.00, 'PENDING', 0.00, NULL, v_now, v_now
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
            v_customer_id, v_scheme_id, 'Welcome to Diwali Savings Scheme!',
            'You have successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || ', Slot #1). Deposit ₹1,000/month to earn your 100% 1-month bonus!',
            'GENERAL', v_now
        );

        PERFORM private.log_audit(
            v_admin_id, 'ENROLL_SCHEME', 'schemes', v_scheme_id, NULL,
            pg_catalog.jsonb_build_object(
                'scheme_id', v_scheme_id,
                'customer_id', v_customer_id,
                'scheme_code', v_scheme_code,
                'slot_number', 1,
                'monthly_installment_amount', 1000.00,
                'total_installments', 12
            ),
            pg_catalog.jsonb_build_object('source', 'admin_web_customer_registration')
        );
    END IF;

    -- NOTE: Registration strictly creates an independent customer profile.
    -- Family linking is not performed during registration; it must be executed
    -- via the dedicated link_customer_family_profiles workflow with explicit consent.
    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'full_name', pg_catalog.btrim(p_full_name),
        'phone_number', v_clean_phone,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code,
        'slot_number', CASE WHEN p_enroll_scheme IS TRUE THEN 1 ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. UPGRADE link_customer_family_profiles (MANDATORY CONSENT CONFIRMATION)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, VARCHAR, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR);
DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION public.link_customer_family_profiles(
    p_customer_id_1 UUID,
    p_customer_id_2 UUID,
    p_consent_confirmed BOOLEAN,
    p_relationship VARCHAR(50) DEFAULT 'FAMILY_MEMBER',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_phone1 VARCHAR(15);
    v_phone2 VARCHAR(15);
    v_role1 VARCHAR(20);
    v_role2 VARCHAR(20);
    v_is_active1 BOOLEAN;
    v_is_active2 BOOLEAN;
    v_clean_phone1 VARCHAR(15);
    v_clean_phone2 VARCHAR(15);
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    -- 1. Authorization Verification (Must be an authenticated administrator)
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can link customer profiles.';
    END IF;

    -- 2. Parameter Validation
    IF p_customer_id_1 IS NULL OR p_customer_id_2 IS NULL OR p_customer_id_1 = p_customer_id_2 THEN
        RAISE EXCEPTION 'Two distinct customer IDs are required to establish family authorization.';
    END IF;

    -- 3. Explicit In-Person Consent Confirmation Required (Mandatory, No Default, Must be TRUE)
    IF p_consent_confirmed IS NULL OR p_consent_confirmed IS NOT TRUE THEN
        RAISE EXCEPTION 'Showroom consent verification requires explicit confirmation (p_consent_confirmed must be true).';
    END IF;

    -- 4. Verify Both Profiles Exist and Retrieve Identity Details
    SELECT
        c1.phone_number, pr1.role, pr1.is_active,
        c2.phone_number, pr2.role, pr2.is_active
    INTO
        v_phone1, v_role1, v_is_active1,
        v_phone2, v_role2, v_is_active2
    FROM public.customers c1
    JOIN public.profiles pr1 ON pr1.id = c1.id
    CROSS JOIN public.customers c2
    JOIN public.profiles pr2 ON pr2.id = c2.id
    WHERE c1.id = p_customer_id_1 AND c2.id = p_customer_id_2;

    IF v_phone1 IS NULL OR v_phone2 IS NULL THEN
        RAISE EXCEPTION 'One or both customer records do not exist.';
    END IF;

    -- 5. Profiles Must Belong to Role 'CUSTOMER'
    IF v_role1 <> 'CUSTOMER' OR v_role2 <> 'CUSTOMER' THEN
        RAISE EXCEPTION 'Both profiles must belong to customers to establish family authorization.';
    END IF;

    -- 6. Both Profiles Must Be Active
    IF v_is_active1 IS NOT TRUE OR v_is_active2 IS NOT TRUE THEN
        RAISE EXCEPTION 'Both customer profiles must be active to establish family authorization.';
    END IF;

    -- 7. Both Profiles Must Share the Exact Same Verified Normalized Mobile Number
    v_clean_phone1 := pg_catalog.regexp_replace(v_phone1, '\D', '', 'g');
    v_clean_phone2 := pg_catalog.regexp_replace(v_phone2, '\D', '', 'g');

    IF v_clean_phone1 <> v_clean_phone2 THEN
        RAISE EXCEPTION 'Family link rejected: Both customer profiles must share the verified mobile number.';
    END IF;

    -- 8. Insert Bidirectional Authorization Records
    INSERT INTO public.customer_profile_authorizations (
        grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by, notes, created_at, updated_at
    ) VALUES
        (p_customer_id_1, p_customer_id_2, COALESCE(p_relationship, 'FAMILY_MEMBER'), TRUE, 'SHOWROOM_VERIFIED', COALESCE(p_notes, 'Showroom in-person consent verified by admin ' || v_admin_id::text), v_now, v_now),
        (p_customer_id_2, p_customer_id_1, COALESCE(p_relationship, 'FAMILY_MEMBER'), TRUE, 'SHOWROOM_VERIFIED', COALESCE(p_notes, 'Showroom in-person consent verified by admin ' || v_admin_id::text), v_now, v_now)
    ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
    SET is_active = TRUE,
        relationship_type = EXCLUDED.relationship_type,
        authorized_by = 'SHOWROOM_VERIFIED',
        notes = EXCLUDED.notes,
        updated_at = v_now;

    -- 9. Explicit Audit Log with Verification Confirmation & Acting Admin
    PERFORM private.log_audit(
        v_admin_id, 'LINK_FAMILY_PROFILES', 'customer_profile_authorizations', p_customer_id_1, NULL,
        pg_catalog.jsonb_build_object(
            'action', 'LINK_FAMILY_PROFILES',
            'grantor_customer_id', p_customer_id_1,
            'grantee_customer_id', p_customer_id_2,
            'phone_number', v_clean_phone1,
            'relationship', COALESCE(p_relationship, 'FAMILY_MEMBER'),
            'verification_type', 'SHOWROOM_VERIFIED',
            'consent_confirmed', TRUE,
            'acting_admin', v_admin_id,
            'timestamp', v_now,
            'outcome', 'MUTUAL_AUTHORIZATION_ESTABLISHED'
        ), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'message', 'Customer profiles successfully linked for shared family management with verified showroom consent.',
        'grantor_customer_id', p_customer_id_1,
        'grantee_customer_id', p_customer_id_2,
        'relationship', COALESCE(p_relationship, 'FAMILY_MEMBER'),
        'authorized_by', 'SHOWROOM_VERIFIED',
        'consent_confirmed', TRUE,
        'acting_admin', v_admin_id,
        'linked_at', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
