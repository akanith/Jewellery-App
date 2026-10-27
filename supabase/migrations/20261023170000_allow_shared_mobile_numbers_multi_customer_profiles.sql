-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20261023170000_allow_shared_mobile_numbers_multi_customer_profiles.sql
-- Description: Secure Multi-Customer Identity & Shared-Phone Authorization Architecture.
--              1. Drop global unique constraints on phone_number in customers and profiles.
--              2. Maintain partial unique index for administrator phone numbers.
--              3. Add non-unique lookup indexes on phone_number for fast lookups.
--              4. Ensure customer codes continue sequential concurrency-safe generation.
--              5. Create explicit customer_profile_authorizations table for verified profile sharing.
--              6. Create is_customer_authorized_for_profile helper to enforce explicit access control.
--              7. Enhance customer_sessions with authenticated_root_id anchor.
--              8. Upgrade customer_password_login to return only explicitly authorized profiles.
--              9. Upgrade switch_customer_profile_session to enforce strict explicit authorization.
--             10. Provide admin RPCs to link/unlink family profiles with showroom consent.
--             11. Upgrade create_customer_with_scheme to allow optional family linking.
--             12. Upgrade update_customer_profile and request_customer_password_reset.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DROP GLOBAL UNIQUE CONSTRAINTS ON PHONE NUMBERS
-- -----------------------------------------------------------------------------

-- Drop uniqueness constraint on customers.phone_number
ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS uq_customers_phone_number;

-- Drop uniqueness constraint on profiles.phone_number
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_phone_number_key;

-- -----------------------------------------------------------------------------
-- 2. RE-ADD NON-UNIQUE SUPPORTING INDEXES & ADMIN UNIQUE INDEX
-- -----------------------------------------------------------------------------

-- Customer phone lookup index
CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON public.customers (phone_number);

-- Profile phone lookup index
CREATE INDEX IF NOT EXISTS idx_profiles_phone
    ON public.profiles (phone_number);

-- Strict unique constraint for Administrator phone numbers only
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_admin_phone
    ON public.profiles (phone_number)
    WHERE role = 'ADMIN';

-- -----------------------------------------------------------------------------
-- 3. SYNCHRONIZE CUSTOMER CODE SEQUENCE TO HIGHEST EXISTING CODE
-- -----------------------------------------------------------------------------

SELECT setval(
    'public.customer_code_seq',
    GREATEST(
        COALESCE(
            (
                SELECT MAX(NULLIF(regexp_replace(customer_code, '^RJ\d{4}-', ''), ''))::bigint
                FROM public.customers
                WHERE customer_code ~ '^RJ\d{4}-\d+$'
            ),
            0
        ),
        1
    ),
    true
);

-- -----------------------------------------------------------------------------
-- 4. EXPLICIT CUSTOMER PROFILE AUTHORIZATIONS TABLE & ACCESS CONTROL
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_profile_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    grantee_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'FAMILY_MEMBER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    authorized_by VARCHAR(50) NOT NULL DEFAULT 'SHOWROOM_VERIFIED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_customer_profile_authorizations UNIQUE (grantor_customer_id, grantee_customer_id),
    CONSTRAINT chk_no_self_authorization CHECK (grantor_customer_id <> grantee_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_cust_prof_auth_grantee
    ON public.customer_profile_authorizations(grantee_customer_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cust_prof_auth_grantor
    ON public.customer_profile_authorizations(grantor_customer_id)
    WHERE is_active = TRUE;

-- Enable RLS and lock down permissions
ALTER TABLE public.customer_profile_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_profile_authorizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profile_authorizations TO service_role;

DROP POLICY IF EXISTS admin_all_customer_profile_authorizations ON public.customer_profile_authorizations;
CREATE POLICY admin_all_customer_profile_authorizations ON public.customer_profile_authorizations
    FOR ALL TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());

-- Helper Function: Check if authenticated identity is explicitly authorized for target profile
DROP FUNCTION IF EXISTS public.is_customer_authorized_for_profile(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_customer_authorized_for_profile(
    p_auth_customer_id UUID,
    p_target_customer_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (
        p_auth_customer_id = p_target_customer_id
        OR EXISTS (
            SELECT 1
            FROM public.customer_profile_authorizations a
            WHERE a.is_active = TRUE
              AND (
                  (a.grantee_customer_id = p_auth_customer_id AND a.grantor_customer_id = p_target_customer_id)
                  OR
                  (a.grantor_customer_id = p_auth_customer_id AND a.grantee_customer_id = p_target_customer_id)
              )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. ADMIN RPC: LINK / UNLINK FAMILY PROFILES
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.link_customer_family_profiles(UUID, UUID, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.link_customer_family_profiles(
    p_customer_id_1 UUID,
    p_customer_id_2 UUID,
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
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can link customer profiles.';
    END IF;

    IF p_customer_id_1 IS NULL OR p_customer_id_2 IS NULL OR p_customer_id_1 = p_customer_id_2 THEN
        RAISE EXCEPTION 'Two distinct customer IDs are required to establish family authorization.';
    END IF;

    SELECT phone_number INTO v_phone1 FROM public.customers WHERE id = p_customer_id_1;
    SELECT phone_number INTO v_phone2 FROM public.customers WHERE id = p_customer_id_2;

    IF v_phone1 IS NULL OR v_phone2 IS NULL THEN
        RAISE EXCEPTION 'One or both customer profiles do not exist.';
    END IF;

    -- Insert mutual authorization links
    INSERT INTO public.customer_profile_authorizations (
        grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by, notes
    ) VALUES
        (p_customer_id_1, p_customer_id_2, COALESCE(p_relationship, 'FAMILY_MEMBER'), TRUE, 'SHOWROOM_VERIFIED', p_notes),
        (p_customer_id_2, p_customer_id_1, COALESCE(p_relationship, 'FAMILY_MEMBER'), TRUE, 'SHOWROOM_VERIFIED', p_notes)
    ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
    SET is_active = TRUE,
        relationship_type = EXCLUDED.relationship_type,
        authorized_by = 'SHOWROOM_VERIFIED',
        updated_at = pg_catalog.clock_timestamp();

    PERFORM private.log_audit(
        v_admin_id, 'LINK_FAMILY_PROFILES', 'customer_profile_authorizations', p_customer_id_1, NULL,
        pg_catalog.jsonb_build_object('customer_id_1', p_customer_id_1, 'customer_id_2', p_customer_id_2, 'relationship', p_relationship), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'message', 'Customer profiles successfully linked for shared family management.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.link_customer_family_profiles(UUID, UUID, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_customer_family_profiles(UUID, UUID, VARCHAR, TEXT) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.unlink_customer_family_profiles(UUID, UUID);
CREATE OR REPLACE FUNCTION public.unlink_customer_family_profiles(
    p_customer_id_1 UUID,
    p_customer_id_2 UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can unlink customer profiles.';
    END IF;

    UPDATE public.customer_profile_authorizations
    SET is_active = FALSE,
        updated_at = pg_catalog.clock_timestamp()
    WHERE (grantor_customer_id = p_customer_id_1 AND grantee_customer_id = p_customer_id_2)
       OR (grantor_customer_id = p_customer_id_2 AND grantee_customer_id = p_customer_id_1);

    PERFORM private.log_audit(
        v_admin_id, 'UNLINK_FAMILY_PROFILES', 'customer_profile_authorizations', p_customer_id_1, NULL,
        pg_catalog.jsonb_build_object('customer_id_1', p_customer_id_1, 'customer_id_2', p_customer_id_2), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'message', 'Customer profile authorization link removed.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_customer_family_profiles(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlink_customer_family_profiles(UUID, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. ENHANCE CUSTOMER SESSIONS WITH AUTHENTICATED ROOT ANCHOR
-- -----------------------------------------------------------------------------

ALTER TABLE public.customer_sessions
    ADD COLUMN IF NOT EXISTS authenticated_root_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

UPDATE public.customer_sessions
SET authenticated_root_id = customer_id
WHERE authenticated_root_id IS NULL;

ALTER TABLE public.customer_sessions
    ALTER COLUMN authenticated_root_id SET NOT NULL;

-- Upgrade create_customer_session RPC
DROP FUNCTION IF EXISTS public.create_customer_session(UUID, VARCHAR, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.create_customer_session(UUID, VARCHAR, TIMESTAMPTZ, UUID);
CREATE OR REPLACE FUNCTION public.create_customer_session(
    p_customer_id UUID,
    p_token_hash VARCHAR(64),
    p_expires_at TIMESTAMPTZ,
    p_authenticated_root_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    authenticated_root_id UUID,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_new_session_id UUID;
    v_created_at TIMESTAMPTZ;
    v_active_session_count INTEGER;
    v_oldest_session_id UUID;
    v_root_id UUID := COALESCE(p_authenticated_root_id, p_customer_id);
BEGIN
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL.' USING ERRCODE = '22004';
    END IF;

    IF p_token_hash IS NULL OR pg_catalog.length(p_token_hash) <> 64 THEN
        RAISE EXCEPTION 'Invalid token hash format: must be 64-char hex string.' USING ERRCODE = '22023';
    END IF;

    IF p_expires_at IS NULL OR p_expires_at <= pg_catalog.clock_timestamp() THEN
        RAISE EXCEPTION 'Session expiration must be in the future.' USING ERRCODE = '22007';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE c.id = p_customer_id AND p.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Customer does not exist or profile is inactive.' USING ERRCODE = '28000';
    END IF;

    -- Concurrency & Session Limits: Max 5 concurrent active sessions
    SELECT COUNT(*) INTO v_active_session_count
    FROM public.customer_sessions
    WHERE customer_sessions.customer_id = p_customer_id
      AND customer_sessions.revoked_at IS NULL
      AND customer_sessions.expires_at > pg_catalog.clock_timestamp();

    IF v_active_session_count >= 5 THEN
        SELECT cs.id INTO v_oldest_session_id
        FROM public.customer_sessions cs
        WHERE cs.customer_id = p_customer_id
          AND cs.revoked_at IS NULL
          AND cs.expires_at > pg_catalog.clock_timestamp()
        ORDER BY cs.created_at ASC
        LIMIT 1;

        IF v_oldest_session_id IS NOT NULL THEN
            UPDATE public.customer_sessions
            SET revoked_at = pg_catalog.clock_timestamp()
            WHERE customer_sessions.id = v_oldest_session_id;
        END IF;
    END IF;

    v_created_at := pg_catalog.clock_timestamp();

    INSERT INTO public.customer_sessions (
        customer_id,
        authenticated_root_id,
        token_hash,
        expires_at,
        created_at,
        last_seen_at
    ) VALUES (
        p_customer_id,
        v_root_id,
        p_token_hash,
        p_expires_at,
        v_created_at,
        v_created_at
    )
    RETURNING customer_sessions.id INTO v_new_session_id;

    RETURN QUERY
    SELECT
        v_new_session_id AS id,
        p_customer_id AS customer_id,
        v_root_id AS authenticated_root_id,
        v_created_at AS created_at,
        p_expires_at AS expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_session(UUID, VARCHAR, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_session(UUID, VARCHAR, TIMESTAMPTZ, UUID) TO service_role;

-- Upgrade verify_customer_session RPC
DROP FUNCTION IF EXISTS public.verify_customer_session(VARCHAR);
CREATE OR REPLACE FUNCTION public.verify_customer_session(
    p_token_hash VARCHAR(64)
)
RETURNS TABLE (
    customer_id UUID,
    authenticated_root_id UUID,
    full_name VARCHAR(100),
    customer_code VARCHAR(30),
    expires_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_session_id UUID;
    v_customer_id UUID;
    v_root_id UUID;
    v_full_name VARCHAR(100);
    v_customer_code VARCHAR(30);
    v_current_expires TIMESTAMPTZ;
    v_new_expires TIMESTAMPTZ;
    v_last_seen TIMESTAMPTZ;
BEGIN
    IF p_token_hash IS NULL OR pg_catalog.length(p_token_hash) <> 64 THEN
        RETURN;
    END IF;

    SELECT
        s.id,
        s.customer_id,
        COALESCE(s.authenticated_root_id, s.customer_id),
        c.full_name,
        c.customer_code,
        s.expires_at
    INTO
        v_session_id,
        v_customer_id,
        v_root_id,
        v_full_name,
        v_customer_code,
        v_current_expires
    FROM public.customer_sessions s
    JOIN public.customers c ON c.id = s.customer_id
    JOIN public.profiles p ON p.id = c.id
    WHERE s.token_hash = p_token_hash
      AND s.revoked_at IS NULL
      AND s.expires_at > pg_catalog.clock_timestamp()
      AND p.is_active = TRUE;

    IF v_session_id IS NULL THEN
        RETURN;
    END IF;

    v_new_expires := v_current_expires;
    IF (v_current_expires - pg_catalog.clock_timestamp()) < INTERVAL '7 days' THEN
        v_new_expires := pg_catalog.clock_timestamp() + INTERVAL '30 days';
    END IF;

    v_last_seen := pg_catalog.clock_timestamp();

    UPDATE public.customer_sessions
    SET last_seen_at = v_last_seen,
        expires_at = v_new_expires
    WHERE customer_sessions.id = v_session_id;

    RETURN QUERY
    SELECT
        v_customer_id,
        v_root_id,
        v_full_name,
        v_customer_code,
        v_new_expires,
        v_last_seen;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_customer_session(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_customer_session(VARCHAR) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. UPGRADE create_customer_with_scheme RPC (ALLOW SHARED PHONE & OPTIONAL FAMILY LINK)
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
BEGIN
    -- 1. Authorization Verification
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

    -- 8. Optional Verified Family Linking
    IF p_link_family_customer_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.customers WHERE id = p_link_family_customer_id) THEN
            INSERT INTO public.customer_profile_authorizations (
                grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by
            ) VALUES
                (v_customer_id, p_link_family_customer_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
                (p_link_family_customer_id, v_customer_id, 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED')
            ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
            SET is_active = TRUE, updated_at = v_now;
        END IF;
    END IF;

    -- 9. Initialize Customer Auth
    v_init_hash := extensions.crypt(pg_catalog.right(v_clean_phone, 4), extensions.gen_salt('bf', 10));
    INSERT INTO public.customer_auth (
        customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
    ) VALUES (
        v_customer_id, v_init_hash, 'RESET_REQUIRED', 0, NULL, v_now, v_now
    ) ON CONFLICT (customer_id) DO NOTHING;

    -- 10. Audit Log
    PERFORM private.log_audit(
        v_admin_id, 'CREATE', 'customers', v_customer_id, NULL,
        pg_catalog.jsonb_build_object(
            'customer_id', v_customer_id,
            'customer_code', v_customer_code,
            'phone_number', v_clean_phone,
            'full_name', p_full_name,
            'linked_family_customer_id', p_link_family_customer_id
        ), '{}'
    );

    -- 11. Optional Scheme Enrollment
    IF p_enroll_scheme THEN
        IF p_start_month IS NOT NULL THEN
            v_start_date := date_trunc('month', p_start_month)::date;
        ELSE
            v_start_date := date_trunc('month', v_now)::date;
        END IF;

        v_end_date := (v_start_date + INTERVAL '12 months' - INTERVAL '1 day')::date;
        v_scheme_id := pg_catalog.gen_random_uuid();
        v_scheme_code := 'SCH-' || v_year || '-' || lpad(nextval('public.scheme_code_seq')::text, 4, '0');

        INSERT INTO public.schemes (
            id, scheme_code, customer_id, scheme_type, monthly_installment,
            total_installments, start_date, end_date, maturity_date,
            status, slot_number, notes, created_by, created_at, updated_at
        ) VALUES (
            v_scheme_id, v_scheme_code, v_customer_id, 'DIWALI_2026', 1000.00,
            12, v_start_date, v_end_date, v_end_date,
            'ACTIVE', 1, 'Auto-enrolled during customer registration', v_admin_id, v_now, v_now
        );

        FOR v_i IN 1..12 LOOP
            v_curr_month := (v_start_date + ((v_i - 1) || ' months')::interval)::date;
            v_due_date := (v_curr_month + INTERVAL '10 days')::date;

            INSERT INTO public.scheme_installments (
                id, scheme_id, customer_id, installment_number, calendar_month,
                due_date, amount, status, created_at, updated_at
            ) VALUES (
                pg_catalog.gen_random_uuid(), v_scheme_id, v_customer_id, v_i, v_curr_month,
                v_due_date, 1000.00, 'PENDING', v_now, v_now
            );
        END LOOP;

        INSERT INTO public.scheme_bonuses (
            id, scheme_id, customer_id, bonus_amount, status, created_at, updated_at
        ) VALUES (
            pg_catalog.gen_random_uuid(), v_scheme_id, v_customer_id, 1000.00, 'PENDING', v_now, v_now
        );

        INSERT INTO public.notifications (
            customer_id, title, message, type, metadata, created_at
        ) VALUES (
            v_customer_id,
            'Welcome to Ramyas Jeweller!',
            'You have been successfully enrolled in the 12-Month Diwali Savings Scheme (' || v_scheme_code || ').',
            'GENERAL',
            pg_catalog.jsonb_build_object('scheme_id', v_scheme_id, 'scheme_code', v_scheme_code),
            v_now
        );

        PERFORM private.log_audit(
            v_admin_id, 'ENROLL_SCHEME', 'schemes', v_scheme_id, NULL,
            pg_catalog.jsonb_build_object(
                'scheme_id', v_scheme_id,
                'customer_id', v_customer_id,
                'scheme_code', v_scheme_code,
                'slot_number', 1
            ), '{}'
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'full_name', p_full_name,
        'phone_number', v_clean_phone,
        'scheme_id', v_scheme_id,
        'scheme_code', v_scheme_code
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN, DATE, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8. UPGRADE update_customer_profile RPC (ALLOW SHARED PHONE NUMBERS)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR);

CREATE OR REPLACE FUNCTION public.update_customer_profile(
    p_customer_id UUID,
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15),
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR(50) DEFAULT 'Dindigul',
    p_pincode VARCHAR(10) DEFAULT NULL,
    p_nominee_name VARCHAR(100) DEFAULT NULL,
    p_nominee_relationship VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_alternate_phone VARCHAR(15) DEFAULT NULL
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
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_old_data JSONB;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can update customer profiles.';
    END IF;

    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL.';
    END IF;

    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RAISE EXCEPTION 'Invalid mobile number: must be exactly 10 digits.';
    END IF;

    IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_full_name, ''))) < 2 THEN
        RAISE EXCEPTION 'Full name is required (minimum 2 characters).';
    END IF;

    -- Block if phone belongs to an admin
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

    SELECT pg_catalog.to_jsonb(c) INTO v_old_data
    FROM public.customers c WHERE c.id = p_customer_id;

    IF v_old_data IS NULL THEN
        RAISE EXCEPTION 'Customer record not found.';
    END IF;

    UPDATE public.profiles
    SET full_name = pg_catalog.btrim(p_full_name),
        phone_number = v_clean_phone,
        updated_at = v_now
    WHERE id = p_customer_id;

    UPDATE public.customers
    SET full_name = pg_catalog.btrim(p_full_name),
        phone_number = v_clean_phone,
        address = NULLIF(pg_catalog.btrim(p_address), ''),
        city = COALESCE(NULLIF(pg_catalog.btrim(p_city), ''), 'Dindigul'),
        pincode = NULLIF(pg_catalog.btrim(p_pincode), ''),
        alternate_phone = v_clean_alt_phone,
        nominee_name = NULLIF(pg_catalog.btrim(p_nominee_name), ''),
        nominee_relationship = NULLIF(pg_catalog.btrim(p_nominee_relationship), ''),
        notes = NULLIF(pg_catalog.btrim(p_notes), ''),
        updated_at = v_now
    WHERE id = p_customer_id;

    PERFORM private.log_audit(
        v_admin_id, 'UPDATE', 'customers', p_customer_id, v_old_data,
        pg_catalog.jsonb_build_object(
            'customer_id', p_customer_id,
            'full_name', p_full_name,
            'phone_number', v_clean_phone
        ), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', p_customer_id,
        'full_name', pg_catalog.btrim(p_full_name),
        'phone_number', v_clean_phone
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9. UPGRADE customer_password_login RPC (STRICT EXPLICIT AUTHORIZATION)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.customer_password_login(VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.customer_password_login(
    p_phone_number VARCHAR(15),
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_matched_customer RECORD;
    v_authenticated_customer RECORD := NULL;
    v_profiles_json JSONB := '[]'::jsonb;
    v_temp_password TEXT;
    v_is_locked BOOLEAN := FALSE;
    v_active_customer_count INTEGER;
BEGIN
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Please enter a valid 10-digit mobile number.'
        );
    END IF;

    IF p_password IS NULL OR pg_catalog.length(p_password) = 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Password is required.'
        );
    END IF;

    -- Check if active customers exist for this phone
    SELECT COUNT(*) INTO v_active_customer_count
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
      AND p.is_active = TRUE;

    IF v_active_customer_count = 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    -- Check credential match across active customers under this phone
    FOR v_matched_customer IN
        SELECT c.id, c.full_name, c.customer_code, c.phone_number, ca.password_hash, ca.password_status, ca.failed_login_attempts, ca.locked_until
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
        ORDER BY c.created_at ASC
    LOOP
        -- Auto-initialize customer_auth if missing
        IF v_matched_customer.password_hash IS NULL THEN
            v_temp_password := pg_catalog.right(v_clean_phone, 4);
            v_matched_customer.password_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));

            INSERT INTO public.customer_auth (
                customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
            ) VALUES (
                v_matched_customer.id, v_matched_customer.password_hash, 'RESET_REQUIRED', 0, NULL, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()
            )
            ON CONFLICT (customer_id) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                password_status = 'RESET_REQUIRED',
                updated_at = pg_catalog.clock_timestamp();
        END IF;

        -- Check lock status on this profile
        IF v_matched_customer.locked_until IS NOT NULL AND v_matched_customer.locked_until > pg_catalog.clock_timestamp() THEN
            v_is_locked := TRUE;
            CONTINUE; -- Try next profile if shared
        END IF;

        -- Verify password
        IF extensions.crypt(p_password, v_matched_customer.password_hash) = v_matched_customer.password_hash THEN
            v_authenticated_customer := v_matched_customer;
            EXIT; -- Successfully authenticated as this customer
        END IF;
    END LOOP;

    -- If password failed for all profiles
    IF v_authenticated_customer IS NULL THEN
        IF v_is_locked THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', FALSE,
                'error', 'ACCOUNT_LOCKED',
                'status', 'LOCKED',
                'message', 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.'
            );
        END IF;

        -- Increment failed attempts on active profiles of this phone
        UPDATE public.customer_auth ca
        SET failed_login_attempts = ca.failed_login_attempts + 1,
            locked_until = CASE
                WHEN ca.failed_login_attempts + 1 >= 5 THEN pg_catalog.clock_timestamp() + INTERVAL '15 minutes'
                ELSE NULL
            END,
            password_status = CASE
                WHEN ca.failed_login_attempts + 1 >= 5 THEN 'LOCKED'
                ELSE ca.password_status
            END,
            updated_at = pg_catalog.clock_timestamp()
        FROM public.customers c
        WHERE ca.customer_id = c.id
          AND pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone;

        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    -- Successful authentication: reset failed attempts on authorized profile
    UPDATE public.customer_auth ca
    SET failed_login_attempts = 0,
        locked_until = NULL,
        password_status = CASE WHEN ca.password_status = 'LOCKED' THEN 'ACTIVE' ELSE ca.password_status END,
        updated_at = pg_catalog.clock_timestamp()
    WHERE ca.customer_id = v_authenticated_customer.id;

    -- STRICT AUTHORIZATION FILTER:
    -- Return ONLY the authenticated profile AND any profile explicitly linked in customer_profile_authorizations
    SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
            'customer_id', c.id,
            'customer_code', c.customer_code,
            'full_name', c.full_name,
            'phone_number', c.phone_number,
            'password_status', COALESCE(ca.password_status, 'RESET_REQUIRED'),
            'scheme_count', (
                SELECT COUNT(*)::integer
                FROM public.schemes s
                WHERE s.customer_id = c.id
                  AND s.status IN ('ACTIVE', 'COMPLETED', 'MATURED', 'PARTIALLY_REDEEMED')
            )
        )
        ORDER BY (CASE WHEN c.id = v_authenticated_customer.id THEN 0 ELSE 1 END), c.created_at ASC
    )
    INTO v_profiles_json
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
    WHERE p.is_active = TRUE
      AND (
          c.id = v_authenticated_customer.id
          OR public.is_customer_authorized_for_profile(v_authenticated_customer.id, c.id)
      );

    PERFORM private.log_audit(
        NULL, 'CUSTOMER_LOGIN_SUCCESS', 'customer_auth', v_authenticated_customer.id, NULL,
        pg_catalog.jsonb_build_object(
            'phone_number', v_clean_phone,
            'authenticated_customer_id', v_authenticated_customer.id,
            'authorized_profile_count', jsonb_array_length(v_profiles_json)
        ), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', v_authenticated_customer.id,
        'full_name', v_authenticated_customer.full_name,
        'customer_code', v_authenticated_customer.customer_code,
        'password_status', v_authenticated_customer.password_status,
        'profiles', v_profiles_json
    );
END;
$$;

REVOKE ALL ON FUNCTION public.customer_password_login(VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_password_login(VARCHAR, TEXT) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 10. SECURE SECURITY DEFINER RPC: switch_customer_profile_session
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.switch_customer_profile_session(VARCHAR, UUID);
CREATE OR REPLACE FUNCTION public.switch_customer_profile_session(
    p_token_hash VARCHAR(64),
    p_target_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_session_id UUID;
    v_current_customer_id UUID;
    v_root_customer_id UUID;
    v_verified_phone VARCHAR(15);
    v_target_phone VARCHAR(15);
    v_target_name VARCHAR(100);
    v_target_code VARCHAR(30);
    v_target_pwd_status VARCHAR(20);
BEGIN
    IF p_token_hash IS NULL OR pg_catalog.length(p_token_hash) <> 64 THEN
        RAISE EXCEPTION 'Invalid session token format.' USING ERRCODE = '22023';
    END IF;

    IF p_target_customer_id IS NULL THEN
        RAISE EXCEPTION 'Target customer ID is required.' USING ERRCODE = '22004';
    END IF;

    -- 1. Locate active session
    SELECT s.id, s.customer_id, COALESCE(s.authenticated_root_id, s.customer_id)
      INTO v_session_id, v_current_customer_id, v_root_customer_id
    FROM public.customer_sessions s
    WHERE s.token_hash = p_token_hash
      AND s.revoked_at IS NULL
      AND s.expires_at > pg_catalog.clock_timestamp();

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Session is invalid, expired, or revoked.' USING ERRCODE = '28000';
    END IF;

    -- 2. STRICT ACCESS CONTROL: Target profile MUST be explicitly authorized for the authenticated root identity
    IF NOT public.is_customer_authorized_for_profile(v_root_customer_id, p_target_customer_id) THEN
        RAISE EXCEPTION 'Security Violation: Unauthorized profile selection.' USING ERRCODE = '42501';
    END IF;

    -- 3. Retrieve target customer profile
    SELECT
        pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g'),
        c.full_name,
        c.customer_code,
        COALESCE(ca.password_status, 'RESET_REQUIRED')
      INTO v_target_phone, v_target_name, v_target_code, v_target_pwd_status
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
    WHERE c.id = p_target_customer_id
      AND p.is_active = TRUE;

    IF v_target_phone IS NULL THEN
        RAISE EXCEPTION 'Target customer profile not found or inactive.' USING ERRCODE = 'P0002';
    END IF;

    -- 4. Atomically update session customer_id (maintaining authenticated_root_id anchor)
    UPDATE public.customer_sessions
    SET customer_id = p_target_customer_id,
        last_seen_at = pg_catalog.clock_timestamp()
    WHERE customer_sessions.id = v_session_id;

    PERFORM private.log_audit(
        NULL, 'CUSTOMER_SESSION_SWITCHED_PROFILE', 'customer_sessions', v_session_id, NULL,
        pg_catalog.jsonb_build_object(
            'from_customer_id', v_current_customer_id,
            'to_customer_id', p_target_customer_id,
            'root_customer_id', v_root_customer_id
        ), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', p_target_customer_id,
        'customer_code', v_target_code,
        'full_name', v_target_name,
        'password_status', v_target_pwd_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 11. UPGRADE request_customer_password_reset RPC
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.request_customer_password_reset(VARCHAR);
CREATE OR REPLACE FUNCTION public.request_customer_password_reset(
    p_mobile_number VARCHAR(15)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_cust RECORD;
    v_request_count INTEGER := 0;
BEGIN
    v_clean_phone := pg_catalog.regexp_replace(COALESCE(p_mobile_number, ''), '\D', '', 'g');
    IF pg_catalog.length(v_clean_phone) != 10 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', TRUE,
            'message', 'If the mobile number is registered, a password reset request has been submitted.'
        );
    END IF;

    FOR v_cust IN
        SELECT c.id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
    LOOP
        INSERT INTO public.customer_password_reset_requests (
            customer_id, status, requested_at, created_at, updated_at
        ) VALUES (
            v_cust.id, 'PENDING', pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()
        )
        ON CONFLICT (customer_id) WHERE status = 'PENDING' DO NOTHING;

        v_request_count := v_request_count + 1;
    END LOOP;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'message', 'If the mobile number is registered, a password reset request has been submitted.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.request_customer_password_reset(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_customer_password_reset(VARCHAR) TO anon, authenticated, service_role;
