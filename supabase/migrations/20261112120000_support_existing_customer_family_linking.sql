-- =============================================================================
-- Migration: 20261112120000_support_existing_customer_family_linking.sql
-- Description:
--   Support explicit post-registration family linking for existing customers
--   who share a normalized 10-digit mobile number (e.g., after updating a
--   customer's mobile number to match a family member), while preserving all
--   customer IDs, schemes, installments, payments, and credentials.
--
--   Security & Consistency Hardening:
--   1. Consistent 10-digit Indian mobile normalization (handles +91 / 91 / 0).
--   2. Reject duplicate active family links cleanly (SQLSTATE 23505).
--   3. Prevent inconsistent cross-phone multi-member family group bridging.
--   4. Require active CUSTOMER role on both profiles in authorization checks.
--   5. Enforce authorization parity in verify_customer_session and reset switched
--      sessions to authenticated_root_id immediately on unlink.
--   6. Include target phone_number in switch_customer_profile_session response
--      so customer-app session.mobileNumber stays synchronized across switches.
--   7. Add admin-only get_customer_family_context RPC to inspect linked
--      family profiles (even after later phone changes) and unlinked shared-
--      phone candidates without ever auto-linking.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Helper: Normalize Indian 10-digit mobile numbers consistently
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.normalize_mobile_number(
    p_phone TEXT
)
RETURNS VARCHAR(15)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    v_digits TEXT;
BEGIN
    v_digits := pg_catalog.regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF pg_catalog.length(v_digits) = 12 AND pg_catalog.left(v_digits, 2) = '91' THEN
        v_digits := pg_catalog.substr(v_digits, 3);
    ELSIF pg_catalog.length(v_digits) = 11 AND pg_catalog.left(v_digits, 1) = '0' THEN
        v_digits := pg_catalog.substr(v_digits, 2);
    END IF;
    RETURN v_digits::VARCHAR(15);
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_mobile_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.normalize_mobile_number(TEXT) TO authenticated, service_role, postgres;

-- -----------------------------------------------------------------------------
-- 2. Harden is_customer_authorized_for_profile
--    Requires both auth and target profiles to be active CUSTOMER accounts,
--    and strictly requires identity equality or an active explicit link.
-- -----------------------------------------------------------------------------
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
        p_auth_customer_id IS NOT NULL
        AND p_target_customer_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles p_auth
            WHERE p_auth.id = p_auth_customer_id
              AND p_auth.role = 'CUSTOMER'
              AND p_auth.is_active = TRUE
        )
        AND EXISTS (
            SELECT 1
            FROM public.profiles p_target
            WHERE p_target.id = p_target_customer_id
              AND p_target.role = 'CUSTOMER'
              AND p_target.is_active = TRUE
        )
        AND (
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
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_customer_authorized_for_profile(UUID, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Harden link_customer_family_profiles
--    - Preserves mandatory admin role, distinct IDs, active CUSTOMER checks,
--      explicit showroom consent, and shared normalized mobile verification.
--    - Rejects duplicate active bidirectional links (SQLSTATE 23505).
--    - Rejects linking if either profile holds active links to another member
--      with a conflicting mobile number (prevents split-phone bridging).
-- -----------------------------------------------------------------------------
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
    v_relationship VARCHAR(50);
    v_clean_notes TEXT;
    v_conflict_code VARCHAR(30);
    v_conflict_name VARCHAR(100);
    v_conflict_phone VARCHAR(15);
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

    -- 3. Explicit Consent Confirmation Required
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

    -- 7. Both Profiles Must Share the Exact Same Verified Normalized 10-Digit Mobile Number
    v_clean_phone1 := private.normalize_mobile_number(v_phone1);
    v_clean_phone2 := private.normalize_mobile_number(v_phone2);

    IF pg_catalog.length(v_clean_phone1) <> 10 OR pg_catalog.length(v_clean_phone2) <> 10 THEN
        RAISE EXCEPTION 'Family link rejected: Both customer profiles must have valid 10-digit mobile numbers.';
    END IF;

    IF v_clean_phone1 <> v_clean_phone2 THEN
        RAISE EXCEPTION 'Family link rejected: Both customer profiles must share the verified mobile number.';
    END IF;

    -- 8. Reject Duplicate Active Family Link
    IF EXISTS (
        SELECT 1
        FROM public.customer_profile_authorizations a
        WHERE a.grantor_customer_id = p_customer_id_1
          AND a.grantee_customer_id = p_customer_id_2
          AND a.is_active = TRUE
    ) AND EXISTS (
        SELECT 1
        FROM public.customer_profile_authorizations a
        WHERE a.grantor_customer_id = p_customer_id_2
          AND a.grantee_customer_id = p_customer_id_1
          AND a.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Duplicate link rejected: These customer profiles are already linked as family members.'
            USING ERRCODE = '23505';
    END IF;

    -- 9. Prevent Inconsistent Cross-Phone Multi-Member Group Bridging
    --    If either customer already has an active family link to a third customer whose
    --    current normalized phone differs from this shared mobile number, require resolving
    --    or unlinking that conflicting cross-phone link first rather than mixing clusters.
    SELECT
        c_other.customer_code,
        c_other.full_name,
        private.normalize_mobile_number(c_other.phone_number)
    INTO
        v_conflict_code,
        v_conflict_name,
        v_conflict_phone
    FROM public.customer_profile_authorizations a
    JOIN public.customers c_other
      ON c_other.id = CASE
          WHEN a.grantor_customer_id IN (p_customer_id_1, p_customer_id_2) THEN a.grantee_customer_id
          ELSE a.grantor_customer_id
      END
    JOIN public.profiles p_other ON p_other.id = c_other.id
    WHERE a.is_active = TRUE
      AND p_other.is_active = TRUE
      AND (
          a.grantor_customer_id IN (p_customer_id_1, p_customer_id_2)
          OR a.grantee_customer_id IN (p_customer_id_1, p_customer_id_2)
      )
      AND c_other.id NOT IN (p_customer_id_1, p_customer_id_2)
      AND private.normalize_mobile_number(c_other.phone_number) <> v_clean_phone1
    LIMIT 1;

    IF v_conflict_code IS NOT NULL THEN
        RAISE EXCEPTION 'Family link rejected: Existing family link with % (%) uses a different mobile number (%). Unlink conflicting cross-phone links first.',
            v_conflict_name, v_conflict_code, COALESCE(v_conflict_phone, 'unknown');
    END IF;

    v_relationship := pg_catalog.left(
        COALESCE(NULLIF(pg_catalog.btrim(p_relationship), ''), 'FAMILY_MEMBER'),
        50
    );
    v_clean_notes := NULLIF(pg_catalog.btrim(COALESCE(p_notes, '')), '');

    -- 10. Insert or Reactivate Bidirectional Authorization Records
    INSERT INTO public.customer_profile_authorizations (
        grantor_customer_id, grantee_customer_id, relationship_type, is_active, authorized_by, notes, created_at, updated_at
    ) VALUES
        (
            p_customer_id_1,
            p_customer_id_2,
            v_relationship,
            TRUE,
            'SHOWROOM_VERIFIED',
            COALESCE(v_clean_notes, 'Showroom in-person consent verified by admin ' || COALESCE(v_admin_id::text, 'system')),
            v_now,
            v_now
        ),
        (
            p_customer_id_2,
            p_customer_id_1,
            v_relationship,
            TRUE,
            'SHOWROOM_VERIFIED',
            COALESCE(v_clean_notes, 'Showroom in-person consent verified by admin ' || COALESCE(v_admin_id::text, 'system')),
            v_now,
            v_now
        )
    ON CONFLICT (grantor_customer_id, grantee_customer_id) DO UPDATE
    SET is_active = TRUE,
        relationship_type = EXCLUDED.relationship_type,
        authorized_by = 'SHOWROOM_VERIFIED',
        notes = EXCLUDED.notes,
        updated_at = v_now;

    -- 11. Explicit Audit Log
    PERFORM private.log_audit(
        v_admin_id, 'LINK_FAMILY_PROFILES', 'customer_profile_authorizations', p_customer_id_1, NULL,
        pg_catalog.jsonb_build_object(
            'action', 'LINK_FAMILY_PROFILES',
            'grantor_customer_id', p_customer_id_1,
            'grantee_customer_id', p_customer_id_2,
            'phone_number', v_clean_phone1,
            'relationship', v_relationship,
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
        'relationship', v_relationship,
        'authorized_by', 'SHOWROOM_VERIFIED',
        'consent_confirmed', TRUE,
        'acting_admin', v_admin_id,
        'linked_at', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_customer_family_profiles(UUID, UUID, BOOLEAN, VARCHAR, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Harden unlink_customer_family_profiles
--    - Deactivates both directions cleanly.
--    - Snaps any active switched session between the unlinked pair back to its
--      authenticated_root_id so an active mobile session immediately loses
--      cross-profile access without invalidating the root user's own session.
-- -----------------------------------------------------------------------------
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
    v_unlinked_rows INTEGER := 0;
    v_now TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can unlink customer profiles.';
    END IF;

    IF p_customer_id_1 IS NULL OR p_customer_id_2 IS NULL OR p_customer_id_1 = p_customer_id_2 THEN
        RAISE EXCEPTION 'Two distinct customer IDs are required to unlink family authorization.';
    END IF;

    UPDATE public.customer_profile_authorizations
    SET is_active = FALSE,
        updated_at = v_now
    WHERE (
        (grantor_customer_id = p_customer_id_1 AND grantee_customer_id = p_customer_id_2)
        OR
        (grantor_customer_id = p_customer_id_2 AND grantee_customer_id = p_customer_id_1)
    )
    AND is_active = TRUE;

    GET DIAGNOSTICS v_unlinked_rows = ROW_COUNT;

    -- Immediately revert any open session switched to the unlinked partner back to its root customer
    UPDATE public.customer_sessions
    SET customer_id = authenticated_root_id,
        last_seen_at = v_now
    WHERE revoked_at IS NULL
      AND expires_at > v_now
      AND authenticated_root_id IS NOT NULL
      AND (
          (authenticated_root_id = p_customer_id_1 AND customer_id = p_customer_id_2)
          OR
          (authenticated_root_id = p_customer_id_2 AND customer_id = p_customer_id_1)
      );

    PERFORM private.log_audit(
        v_admin_id, 'UNLINK_FAMILY_PROFILES', 'customer_profile_authorizations', p_customer_id_1, NULL,
        pg_catalog.jsonb_build_object(
            'customer_id_1', p_customer_id_1,
            'customer_id_2', p_customer_id_2,
            'unlinked_rows', v_unlinked_rows,
            'acting_admin', v_admin_id,
            'timestamp', v_now
        ), '{}'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'unlinked_rows', v_unlinked_rows,
        'message', 'Customer profile authorization link removed.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_customer_family_profiles(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlink_customer_family_profiles(UUID, UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Add Admin Read RPC: get_customer_family_context
--    Returns:
--      - normalized_phone for the viewed customer
--      - linked_members: active linked family profiles (by UUID, preserved even
--        if either customer's mobile number changes later)
--      - shared_phone_candidates: unlinked active CUSTOMER accounts sharing the
--        same normalized 10-digit mobile number (never auto-linked)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_family_context(
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_linked_json JSONB;
    v_candidates_json JSONB;
BEGIN
    IF NOT private.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only registered administrators can view customer family links.';
    END IF;

    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID is required.';
    END IF;

    SELECT private.normalize_mobile_number(c.phone_number)
      INTO v_clean_phone
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    WHERE c.id = p_customer_id;

    IF v_clean_phone IS NULL THEN
        RAISE EXCEPTION 'Customer record not found.';
    END IF;

    -- Linked family members (looked up strictly by authorization relationship, independent of current phone)
    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'customer_id', m.id,
                'customer_code', m.customer_code,
                'full_name', m.full_name,
                'phone_number', m.phone_number,
                'normalized_phone', m.norm_phone,
                'city', m.city,
                'relationship_type', m.relationship_type,
                'authorized_by', m.authorized_by,
                'notes', m.notes,
                'linked_at', m.linked_at,
                'shares_current_phone', (m.norm_phone = v_clean_phone),
                'is_bidirectional', m.is_bidirectional
            )
            ORDER BY m.linked_at ASC, m.customer_code ASC
        ),
        '[]'::jsonb
    )
    INTO v_linked_json
    FROM (
        SELECT DISTINCT ON (c_other.id)
            c_other.id,
            c_other.customer_code,
            c_other.full_name,
            c_other.phone_number,
            private.normalize_mobile_number(c_other.phone_number) AS norm_phone,
            c_other.city,
            a.relationship_type,
            a.authorized_by,
            a.notes,
            a.updated_at AS linked_at,
            (
                EXISTS (
                    SELECT 1 FROM public.customer_profile_authorizations a1
                    WHERE a1.grantor_customer_id = p_customer_id
                      AND a1.grantee_customer_id = c_other.id
                      AND a1.is_active = TRUE
                )
                AND EXISTS (
                    SELECT 1 FROM public.customer_profile_authorizations a2
                    WHERE a2.grantor_customer_id = c_other.id
                      AND a2.grantee_customer_id = p_customer_id
                      AND a2.is_active = TRUE
                )
            ) AS is_bidirectional
        FROM public.customer_profile_authorizations a
        JOIN public.customers c_other
          ON c_other.id = CASE
              WHEN a.grantor_customer_id = p_customer_id THEN a.grantee_customer_id
              ELSE a.grantor_customer_id
          END
        JOIN public.profiles p_other ON p_other.id = c_other.id
        WHERE a.is_active = TRUE
          AND p_other.is_active = TRUE
          AND p_other.role = 'CUSTOMER'
          AND (a.grantor_customer_id = p_customer_id OR a.grantee_customer_id = p_customer_id)
        ORDER BY c_other.id, a.updated_at DESC
    ) m;

    -- Unlinked active CUSTOMER candidates sharing the same normalized mobile number
    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'customer_id', c_cand.id,
                'customer_code', c_cand.customer_code,
                'full_name', c_cand.full_name,
                'phone_number', c_cand.phone_number,
                'normalized_phone', private.normalize_mobile_number(c_cand.phone_number),
                'city', c_cand.city,
                'created_at', c_cand.created_at,
                'has_conflicting_cross_phone_link', EXISTS (
                    SELECT 1
                    FROM public.customer_profile_authorizations a_ext
                    JOIN public.customers c_ext
                      ON c_ext.id = CASE
                          WHEN a_ext.grantor_customer_id = c_cand.id THEN a_ext.grantee_customer_id
                          ELSE a_ext.grantor_customer_id
                      END
                    JOIN public.profiles p_ext ON p_ext.id = c_ext.id
                    WHERE a_ext.is_active = TRUE
                      AND p_ext.is_active = TRUE
                      AND (a_ext.grantor_customer_id = c_cand.id OR a_ext.grantee_customer_id = c_cand.id)
                      AND private.normalize_mobile_number(c_ext.phone_number) <> v_clean_phone
                )
            )
            ORDER BY c_cand.created_at ASC, c_cand.customer_code ASC
        ),
        '[]'::jsonb
    )
    INTO v_candidates_json
    FROM public.customers c_cand
    JOIN public.profiles p_cand ON p_cand.id = c_cand.id
    WHERE c_cand.id <> p_customer_id
      AND p_cand.is_active = TRUE
      AND p_cand.role = 'CUSTOMER'
      AND pg_catalog.length(v_clean_phone) = 10
      AND private.normalize_mobile_number(c_cand.phone_number) = v_clean_phone
      AND NOT EXISTS (
          SELECT 1
          FROM public.customer_profile_authorizations a_link
          WHERE a_link.is_active = TRUE
            AND (
                (a_link.grantor_customer_id = p_customer_id AND a_link.grantee_customer_id = c_cand.id)
                OR
                (a_link.grantor_customer_id = c_cand.id AND a_link.grantee_customer_id = p_customer_id)
            )
      );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'customer_id', p_customer_id,
        'normalized_phone', v_clean_phone,
        'linked_members', v_linked_json,
        'shared_phone_candidates', v_candidates_json
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_family_context(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_family_context(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Harden verify_customer_session to verify ongoing authorization between
--    authenticated_root_id and active session customer_id
-- -----------------------------------------------------------------------------
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
      AND p.is_active = TRUE
      AND p.role = 'CUSTOMER'
      AND public.is_customer_authorized_for_profile(
          COALESCE(s.authenticated_root_id, s.customer_id),
          s.customer_id
      );

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

REVOKE ALL ON FUNCTION public.verify_customer_session(VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_customer_session(VARCHAR) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 7. Upgrade switch_customer_profile_session to return normalized target phone
--    (plus active_customer_id alias for test compatibility)
-- -----------------------------------------------------------------------------
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
        private.normalize_mobile_number(c.phone_number),
        c.full_name,
        c.customer_code,
        COALESCE(ca.password_status, 'RESET_REQUIRED')
      INTO v_target_phone, v_target_name, v_target_code, v_target_pwd_status
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
    WHERE c.id = p_target_customer_id
      AND p.is_active = TRUE
      AND p.role = 'CUSTOMER';

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
        'active_customer_id', p_target_customer_id,
        'customer_code', v_target_code,
        'full_name', v_target_name,
        'mobile_number', v_target_phone,
        'phone_number', v_target_phone,
        'password_status', v_target_pwd_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.switch_customer_profile_session(VARCHAR, UUID) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 8. Upgrade customer_password_login to normalize phone comparisons consistently
--    and require role = 'CUSTOMER' alongside is_active = TRUE
-- -----------------------------------------------------------------------------
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
    v_clean_phone := private.normalize_mobile_number(p_phone_number);
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

    -- Count active customer accounts currently assigned to this normalized phone number
    SELECT COUNT(*) INTO v_active_customer_count
    FROM public.customers c
    JOIN public.profiles p ON p.id = c.id
    WHERE private.normalize_mobile_number(c.phone_number) = v_clean_phone
      AND p.is_active = TRUE
      AND p.role = 'CUSTOMER';

    IF v_active_customer_count = 0 THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Invalid mobile number or password.'
        );
    END IF;

    IF v_clean_identifier IS NOT NULL THEN
        SELECT c.id INTO v_target_customer_id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE private.normalize_mobile_number(c.phone_number) = v_clean_phone
          AND p.is_active = TRUE
          AND p.role = 'CUSTOMER'
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
        SELECT c.id INTO v_target_customer_id
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE private.normalize_mobile_number(c.phone_number) = v_clean_phone
          AND p.is_active = TRUE
          AND p.role = 'CUSTOMER'
        LIMIT 1;
    END IF;

    -- Check credentials strictly against matching active customers
    FOR v_candidate IN
        SELECT c.id, c.full_name, c.customer_code, c.phone_number,
               ca.password_hash, ca.password_status, ca.failed_login_attempts, ca.locked_until
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        LEFT JOIN public.customer_auth ca ON ca.customer_id = c.id
        WHERE private.normalize_mobile_number(c.phone_number) = v_clean_phone
          AND p.is_active = TRUE
          AND p.role = 'CUSTOMER'
          AND (v_target_customer_id IS NULL OR c.id = v_target_customer_id)
        ORDER BY c.created_at ASC
    LOOP
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

        IF extensions.crypt(p_password, v_candidate.password_hash) = v_candidate.password_hash THEN
            IF v_candidate.locked_until IS NOT NULL AND v_candidate.locked_until > pg_catalog.clock_timestamp() THEN
                v_locked_candidate := v_candidate;
                EXIT;
            END IF;

            v_authenticated_customer := v_candidate;
            EXIT;
        END IF;
    END LOOP;

    IF v_locked_candidate IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', FALSE,
            'error', 'ACCOUNT_LOCKED',
            'status', 'LOCKED',
            'message', 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.'
        );
    END IF;

    IF v_authenticated_customer IS NULL THEN
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

    UPDATE public.customer_auth ca
    SET failed_login_attempts = 0,
        locked_until = NULL,
        password_status = CASE WHEN ca.password_status = 'LOCKED' THEN 'ACTIVE' ELSE ca.password_status END,
        updated_at = pg_catalog.clock_timestamp()
    WHERE ca.customer_id = v_authenticated_customer.id;

    -- Return ONLY authenticated customer + explicitly authorized active family profiles
    SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
            'customer_id', c.id,
            'customer_code', c.customer_code,
            'full_name', c.full_name,
            'phone_number', private.normalize_mobile_number(c.phone_number),
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
      AND p.role = 'CUSTOMER'
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
        'phone_number', private.normalize_mobile_number(v_authenticated_customer.phone_number),
        'password_status', v_authenticated_customer.password_status,
        'profiles', v_profiles_json
    );
END;
$$;

REVOKE ALL ON FUNCTION public.customer_password_login(VARCHAR, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_password_login(VARCHAR, TEXT, TEXT) TO service_role, postgres;

COMMIT;

NOTIFY pgrst, 'reload schema';
