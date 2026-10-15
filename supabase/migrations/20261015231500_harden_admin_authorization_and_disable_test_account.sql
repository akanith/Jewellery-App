-- =============================================================================
-- RAMYAS JEWELLER - Final Pre-Launch Supabase Security Remediation
-- Migration: 20261015231500_harden_admin_authorization_and_disable_test_account.sql
-- Description:
--   1. Harden private.is_admin() to require an active public.profiles record
--      (role = 'ADMIN' AND is_active = TRUE) in addition to a matching public.admin_users record.
--   2. Harden private.is_super_admin() to require an active public.profiles record
--      (role = 'ADMIN' AND is_active = TRUE) and public.admin_users.is_super_admin = TRUE.
--   3. Deactivate production test administrator EMP-E2E-TEST (id: 7253715b-5508-489d-bcea-7f58d26e60c0)
--      by setting profiles.is_active = FALSE, admin_users.is_super_admin = FALSE,
--      and clearing its permissions, while fully preserving historical audit logs.
-- =============================================================================

BEGIN;

-- 1. Harden private.is_admin()
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.admin_users a
        JOIN public.profiles p ON p.id = a.id
        WHERE a.id = auth.uid()
          AND p.role = 'ADMIN'
          AND p.is_active = TRUE
    );
$$;

-- 2. Harden private.is_super_admin()
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.admin_users a
        JOIN public.profiles p ON p.id = a.id
        WHERE a.id = auth.uid()
          AND a.is_super_admin = TRUE
          AND p.role = 'ADMIN'
          AND p.is_active = TRUE
    );
$$;

-- 3. Deactivate test administrator EMP-E2E-TEST
-- Deactivate profile:
UPDATE public.profiles
SET is_active = FALSE,
    updated_at = pg_catalog.clock_timestamp()
WHERE id = '7253715b-5508-489d-bcea-7f58d26e60c0';

-- Revoke super-admin and permissions in admin_users:
UPDATE public.admin_users
SET is_super_admin = FALSE,
    permissions = '{}'::jsonb,
    updated_at = pg_catalog.clock_timestamp()
WHERE id = '7253715b-5508-489d-bcea-7f58d26e60c0';

-- 4. Post-migration verification assertions
DO $$
DECLARE
    v_active_admins INTEGER;
    v_super_admins INTEGER;
    v_test_admin_active BOOLEAN;
    v_test_admin_super BOOLEAN;
BEGIN
    -- Exactly 2 active administrators must remain (ADMIN001 and ADMIN002)
    SELECT COUNT(*) INTO v_active_admins
    FROM public.admin_users a
    JOIN public.profiles p ON p.id = a.id
    WHERE p.role = 'ADMIN' AND p.is_active = TRUE;

    IF v_active_admins <> 2 THEN
        RAISE EXCEPTION 'MIGRATION ASSERTION FAILED: Expected exactly 2 active administrators, found %', v_active_admins;
    END IF;

    -- Exactly 2 super administrators must remain (ADMIN001 and ADMIN002)
    SELECT COUNT(*) INTO v_super_admins
    FROM public.admin_users a
    JOIN public.profiles p ON p.id = a.id
    WHERE p.role = 'ADMIN' AND p.is_active = TRUE AND a.is_super_admin = TRUE;

    IF v_super_admins <> 2 THEN
        RAISE EXCEPTION 'MIGRATION ASSERTION FAILED: Expected exactly 2 active super-administrators, found %', v_super_admins;
    END IF;

    -- Verify EMP-E2E-TEST is strictly deactivated
    SELECT p.is_active, a.is_super_admin INTO v_test_admin_active, v_test_admin_super
    FROM public.admin_users a
    JOIN public.profiles p ON p.id = a.id
    WHERE a.employee_code = 'EMP-E2E-TEST';

    IF v_test_admin_active IS NOT FALSE OR v_test_admin_super IS NOT FALSE THEN
        RAISE EXCEPTION 'MIGRATION ASSERTION FAILED: EMP-E2E-TEST was not properly deactivated';
    END IF;
END $$;

COMMIT;
