-- =============================================================================
-- Migration: 20261028160000_enforce_strict_family_profile_authorization.sql
-- Description:
--   1. Revert implicit mobile-group authorization in is_customer_authorized_for_profile.
--      Sharing a mobile number alone must NEVER grant access to another customer's profile.
--      Strictly require identity equality OR active record in customer_profile_authorizations.
--   2. Upgrade customer_password_login to:
--      - Authenticate specific customer profiles by password verification.
--      - Support optional customer identifier (customer_code or UUID) to disambiguate.
--      - Scope failed attempts and account lockouts strictly to the intended customer profile,
--        preventing cross-account lockouts and denial-of-service across shared numbers.
--      - Return ONLY the authenticated profile and any explicitly showroom-authorized family profiles.
--   3. Upgrade switch_customer_profile_session to enforce strict explicit showroom authorization.
--   4. Ensure synthetic test family accounts (test1 <-> test2) have verified mutual authorization.
-- =============================================================================

-- 1. RESTORE STRICT is_customer_authorized_for_profile
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
            -- Strict explicit family authorization link only
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

-- 2. UPGRADE customer_password_login
DROP FUNCTION IF EXISTS public.customer_password_login(VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.customer_password_login(VARCHAR, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.customer_password_login(
    p_phone_number VARCHAR(15),
    p_password TEXT,
    p_customer_identifier TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_clean_identifier TEXT := NULLIF(pg_catalog.btrim(COALESCE(p_customer_identifier, '')), '');
    v_candidate RECORD;
    v_authenticated_customer RECORD := NULL;
    v_locked_candidate RECORD := NULL;
    v_profiles_json JSONB := '[]'::jsonb;
    v_temp_password TEXT;
    v_active_customer_count INTEGER := 0;
    v_target_customer_id UUID := NULL;
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

    -- Count active customer accounts under this phone number
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

    -- If a specific customer identifier (customer_code or UUID) was provided, locate it
    IF v_clean_identifier IS NOT NULL THEN
        SELECT c.id INTO v_target_customer_id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
          AND (c.customer_code = v_clean_identifier OR c.id::text = v_clean_identifier)
        LIMIT 1;

        IF v_target_customer_id IS NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', FALSE,
                'error', 'INVALID_CREDENTIALS',
                'message', 'Invalid mobile number or password.'
            );
        END IF;
    ELSIF v_active_customer_count = 1 THEN
        -- Unambiguous single customer under this mobile number
        SELECT c.id INTO v_target_customer_id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
        LIMIT 1;
    END IF;

    -- Check credentials against matching active customers
    FOR v_candidate IN
        SELECT c.id, c.full_name, c.customer_code, c.phone_number,
               ca.password_hash, ca.password_status, ca.failed_login_attempts, ca.locked_until
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
        WHERE pg_catalog.regexp_replace(c.phone_number, '\D', '', 'g') = v_clean_phone
          AND p.is_active = TRUE
          AND (v_target_customer_id IS NULL OR c.id = v_target_customer_id)
        ORDER BY c.created_at ASC
    LOOP
        -- Auto-initialize customer_auth if missing
        IF v_candidate.password_hash IS NULL THEN
            v_temp_password := pg_catalog.right(v_clean_phone, 4);
            v_candidate.password_hash := extensions.crypt(v_temp_password, extensions.gen_salt('bf', 10));

            INSERT INTO public.customer_auth (
                customer_id, password_hash, password_status, failed_login_attempts, locked_until, created_at, updated_at
            ) VALUES (
                v_candidate.id, v_candidate.password_hash, 'RESET_REQUIRED', 0, NULL, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp()
            )
            ON CONFLICT (customer_id) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                password_status = 'RESET_REQUIRED',
                updated_at = pg_catalog.clock_timestamp();
        END IF;

        -- Verify password
        IF extensions.crypt(p_password, v_candidate.password_hash) = v_candidate.password_hash THEN
            -- Check lock status on the matching account
            IF v_candidate.locked_until IS NOT NULL AND v_candidate.locked_until > pg_catalog.clock_timestamp() THEN
                v_locked_candidate := v_candidate;
                EXIT;
            END IF;

            v_authenticated_customer := v_candidate;
            EXIT;
        END IF;
    END LOOP;

    -- Handle account lock
    IF v_locked_candidate IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'ACCOUNT_LOCKED',
            'status', 'LOCKED',
            'message', 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.'
        );
    END IF;

    -- If password verification failed
    IF v_authenticated_customer IS NULL THEN
        -- SCOPED LOCKOUT: Increment failed attempts ONLY on the identified target customer
        IF v_target_customer_id IS NOT NULL THEN
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
            WHERE ca.customer_id = v_target_customer_id;
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    -- Successful authentication: reset failed attempts ONLY on the authenticated account
    UPDATE public.customer_auth ca
    SET failed_login_attempts = 0,
        locked_until = NULL,
        password_status = CASE WHEN ca.password_status = 'LOCKED' THEN 'ACTIVE' ELSE ca.password_status END,
        updated_at = pg_catalog.clock_timestamp()
    WHERE ca.customer_id = v_authenticated_customer.id;

    -- Return ONLY authenticated customer + explicitly showroom-verified authorized profiles
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

REVOKE ALL ON FUNCTION public.customer_password_login(VARCHAR, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_password_login(VARCHAR, TEXT, TEXT) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.request_customer_password_reset(VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_customer_password_reset(VARCHAR) TO service_role, postgres;

-- 3. UPGRADE switch_customer_profile_session
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

    -- 2. ACCESS CONTROL: Target profile MUST be explicitly authorized or self
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

REVOKE ALL ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) TO service_role, postgres;

-- 4. ESTABLISH MUTUAL SHOWROOM AUTHORIZATION FOR SYNTHETIC TEST ACCOUNTS test1 <-> test2
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.customers WHERE id = '99c224b7-0257-457f-a7b0-7d4515844975')
       AND EXISTS (SELECT 1 FROM public.customers WHERE id = '5d886889-6605-48bc-8e14-547c78293d23') THEN
        INSERT INTO public.customer_profile_authorizations (
            grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by
        ) VALUES
            ('99c224b7-0257-457f-a7b0-7d4515844975', '5d886889-6605-48bc-8e14-547c78293d23', 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED'),
            ('5d886889-6605-48bc-8e14-547c78293d23', '99c224b7-0257-457f-a7b0-7d4515844975', 'FAMILY_MEMBER', TRUE, 'SHOWROOM_VERIFIED')
        ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
        SET is_active = TRUE, updated_at = clock_timestamp();
    END IF;
END $$;

