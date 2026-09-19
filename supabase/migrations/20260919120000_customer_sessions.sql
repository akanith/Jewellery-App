-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 20260919120000_customer_sessions.sql
-- Description: Opaque server-side customer session storage and security-definer
--              RPC functions for Customer BFF authentication layer.
-- =============================================================================

-- =============================================================================
-- 1. CREATE CUSTOMER SESSIONS TABLE
-- =============================================================================

CREATE TABLE public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_customer_sessions_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT chk_customer_sessions_revoked_after_created CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- Active customer sessions lookup index
CREATE INDEX idx_customer_sessions_active_customer
    ON public.customer_sessions (customer_id, expires_at)
    WHERE revoked_at IS NULL;

-- =============================================================================
-- 2. ROW LEVEL SECURITY & PRIVILEGE LOCKDOWN
-- =============================================================================

ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- Customer App / PostgREST direct access is strictly revoked
REVOKE ALL ON public.customer_sessions FROM PUBLIC, anon, authenticated;

-- Grant required table permissions to backend service role only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_sessions TO service_role;

-- =============================================================================
-- 3. SECURITY DEFINER RPC: CREATE CUSTOMER SESSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_customer_session(
    p_customer_id UUID,
    p_token_hash VARCHAR(64),
    p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_active_count INTEGER;
    v_oldest_session_id UUID;
    v_new_session_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- 1. Parameter Validation
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID cannot be NULL.' USING ERRCODE = '22004';
    END IF;

    IF p_token_hash IS NULL OR length(p_token_hash) <> 64 THEN
        RAISE EXCEPTION 'Invalid token hash format. Must be 64-character hex string.' USING ERRCODE = '22023';
    END IF;

    IF p_expires_at IS NULL OR p_expires_at <= pg_catalog.clock_timestamp() THEN
        RAISE EXCEPTION 'Expiration timestamp must be in the future.' USING ERRCODE = '22023';
    END IF;

    -- 2. Verify Customer Exists and Account is Active
    IF NOT EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.profiles p ON p.id = c.id
        WHERE c.id = p_customer_id
          AND p.is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Customer does not exist or account is inactive.' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Maximum 5 Active Sessions Enforcer
    SELECT COUNT(*)
    INTO v_active_count
    FROM public.customer_sessions
    WHERE customer_sessions.customer_id = p_customer_id
      AND customer_sessions.revoked_at IS NULL
      AND customer_sessions.expires_at > pg_catalog.clock_timestamp();

    IF v_active_count >= 5 THEN
        -- Revoke the oldest active session to maintain max 5 active sessions
        SELECT cs.id
        INTO v_oldest_session_id
        FROM public.customer_sessions cs
        WHERE cs.customer_id = p_customer_id
          AND cs.revoked_at IS NULL
          AND cs.expires_at > pg_catalog.clock_timestamp()
        ORDER BY cs.created_at ASC, cs.id ASC
        LIMIT 1;

        IF v_oldest_session_id IS NOT NULL THEN
            UPDATE public.customer_sessions
            SET revoked_at = pg_catalog.clock_timestamp()
            WHERE customer_sessions.id = v_oldest_session_id;

            -- Log audit trail for auto-revocation of oldest session
            PERFORM private.log_audit(
                NULL,
                'CUSTOMER_SESSION_REVOKED',
                'customer_sessions',
                v_oldest_session_id,
                NULL,
                jsonb_build_object('customer_id', p_customer_id, 'reason', 'MAX_SESSIONS_EXCEEDED'),
                '{}'::jsonb
            );
        END IF;
    END IF;

    -- 4. Create New Session Record
    v_created_at := pg_catalog.clock_timestamp();

    INSERT INTO public.customer_sessions (
        customer_id,
        token_hash,
        expires_at,
        created_at,
        last_seen_at
    ) VALUES (
        p_customer_id,
        p_token_hash,
        p_expires_at,
        v_created_at,
        v_created_at
    )
    RETURNING customer_sessions.id INTO v_new_session_id;

    -- 5. Audit Log Entry (Never log raw token or token hash)
    PERFORM private.log_audit(
        NULL,
        'CUSTOMER_SESSION_CREATED',
        'customer_sessions',
        v_new_session_id,
        NULL,
        jsonb_build_object(
            'customer_id', p_customer_id,
            'expires_at', p_expires_at
        ),
        '{}'::jsonb
    );

    -- 6. Return Internal Session Metadata
    RETURN QUERY
    SELECT 
        v_new_session_id AS id,
        p_customer_id AS customer_id,
        v_created_at AS created_at,
        p_expires_at AS expires_at;
END;
$$;

-- =============================================================================
-- 4. SECURITY DEFINER RPC: VERIFY CUSTOMER SESSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_customer_session(
    p_token_hash VARCHAR(64)
)
RETURNS TABLE (
    customer_id UUID,
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
    v_full_name VARCHAR(100);
    v_customer_code VARCHAR(30);
    v_current_expires TIMESTAMPTZ;
    v_new_expires TIMESTAMPTZ;
    v_last_seen TIMESTAMPTZ;
BEGIN
    -- 1. Parameter Validation
    IF p_token_hash IS NULL OR length(p_token_hash) <> 64 THEN
        RETURN;
    END IF;

    -- 2. Locate Session & Active Customer Record
    SELECT 
        s.id,
        s.customer_id,
        c.full_name,
        c.customer_code,
        s.expires_at
    INTO 
        v_session_id,
        v_customer_id,
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

    -- If no valid active session found, return 0 rows
    IF v_session_id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Check for Rolling Extension (If < 7 days remain before expiry, extend by 30 days)
    v_new_expires := v_current_expires;
    IF (v_current_expires - pg_catalog.clock_timestamp()) < INTERVAL '7 days' THEN
        v_new_expires := pg_catalog.clock_timestamp() + INTERVAL '30 days';
    END IF;

    v_last_seen := pg_catalog.clock_timestamp();

    -- 4. Update Session Timestamps
    UPDATE public.customer_sessions
    SET last_seen_at = v_last_seen,
        expires_at = v_new_expires
    WHERE customer_sessions.id = v_session_id;

    -- 5. Return Context Metadata
    RETURN QUERY
    SELECT 
        v_customer_id AS customer_id,
        v_full_name AS full_name,
        v_customer_code AS customer_code,
        v_new_expires AS expires_at,
        v_last_seen AS last_seen_at;
END;
$$;

-- =============================================================================
-- 5. SECURITY DEFINER RPC: REVOKE CUSTOMER SESSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.revoke_customer_session(
    p_token_hash VARCHAR(64)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_session_id UUID;
    v_customer_id UUID;
BEGIN
    -- 1. Parameter Validation
    IF p_token_hash IS NULL OR length(p_token_hash) <> 64 THEN
        RETURN TRUE; -- Idempotent return for invalid/empty token
    END IF;

    -- 2. Revoke Active Session If Found
    UPDATE public.customer_sessions
    SET revoked_at = pg_catalog.clock_timestamp()
    WHERE customer_sessions.token_hash = p_token_hash
      AND customer_sessions.revoked_at IS NULL
    RETURNING customer_sessions.id, customer_sessions.customer_id INTO v_session_id, v_customer_id;

    -- 3. Log Audit Entry If A Session Was Newly Revoked
    IF v_session_id IS NOT NULL THEN
        PERFORM private.log_audit(
            NULL,
            'CUSTOMER_SESSION_REVOKED',
            'customer_sessions',
            v_session_id,
            NULL,
            jsonb_build_object(
                'customer_id', v_customer_id,
                'revoked_at', pg_catalog.clock_timestamp()
            ),
            '{}'::jsonb
        );
    END IF;

    -- Always return TRUE (Idempotent behavior)
    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 6. RPC EXECUTION PERMISSIONS LOCKDOWN
-- =============================================================================

-- Revoke execution from public, anon, and authenticated roles
REVOKE ALL ON FUNCTION public.create_customer_session(UUID, VARCHAR(64), TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_customer_session(VARCHAR(64)) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_customer_session(VARCHAR(64)) FROM PUBLIC, anon, authenticated;

-- Grant execution strictly to service_role (used by Customer BFF Edge Function)
GRANT EXECUTE ON FUNCTION public.create_customer_session(UUID, VARCHAR(64), TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_customer_session(VARCHAR(64)) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_customer_session(VARCHAR(64)) TO service_role;
